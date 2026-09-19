import { randomUUID } from "node:crypto";
import { readFile, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const LEDGER_COLUMNS = [
  "version",
  "author",
  "changed_artifact",
  "artifact_version",
  "prompt_hash",
  "tools_hash",
  "reason",
  "hypothesis",
  "metric_name",
  "metric_before",
  "metric_after",
  "run_file",
] as const;

export type LedgerColumn = (typeof LEDGER_COLUMNS)[number];
export type VersionLogRow = Record<LedgerColumn, string>;

type RunStatus = "valid" | "partial" | "invalid" | "incomplete";

export type RunEvidence = {
  runId: string;
  suite: string;
  status: RunStatus;
  version: string;
  artifactVersion: string;
  promptHash: string;
  toolsHash: string;
  metricName: string;
  metricValue: string;
  passedCases?: number;
  totalCases?: number;
};

export type VersionLogInput = {
  validationRoot: string;
  ledgerPath: string;
  runPath: string;
  author: string;
  changedArtifact: string;
  reason: string;
  hypothesis: string;
};

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Run report ${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function textField(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Run report ${field} must be a non-empty string`);
  }
  return value;
}

function integerField(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`Run report ${field} must be a non-negative integer`);
  }
  return value as number;
}

function hashField(value: unknown, field: string): string {
  const hash = textField(value, field);
  if (!/^[a-f0-9]{64}$/u.test(hash)) {
    throw new Error(`Run report ${field} must be a lowercase SHA-256 hash`);
  }
  return hash;
}

/**
 * The single compatibility seam between the runner report and history tools.
 * It deliberately validates a small, safe envelope instead of loading unfinished
 * JSON schema modules at runtime.
 */
export function extractRunEvidence(value: unknown): RunEvidence {
  const run = record(value, "root");
  textField(run.schema_version, "schema_version");
  const validity = record(run.validity, "validity");
  const status = textField(validity.status, "validity.status");
  if (!["valid", "partial", "invalid", "incomplete"].includes(status)) {
    throw new Error(`Run report validity.status is unsupported: ${status}`);
  }
  const gates = record(validity.gates, "validity.gates");
  if (Object.values(gates).some((gate) => typeof gate !== "boolean")) {
    throw new Error("Run report validity.gates values must be boolean");
  }
  if (
    !Array.isArray(validity.reasons) ||
    validity.reasons.some((reason) => typeof reason !== "string")
  ) {
    throw new Error("Run report validity.reasons must be a string array");
  }

  const artifact = record(run.artifact, "artifact");
  const summary = record(run.summary, "summary");
  const metricValue = summary.metric_value;
  if (typeof metricValue !== "number" || !Number.isFinite(metricValue)) {
    throw new Error("Run report summary.metric_value must be a finite number");
  }
  const passedCases = integerField(
    summary.passed_cases,
    "summary.passed_cases",
  );
  const totalCases = integerField(summary.total_cases, "summary.total_cases");
  if (
    passedCases !== undefined &&
    totalCases !== undefined &&
    passedCases > totalCases
  ) {
    throw new Error("Run report passed_cases cannot exceed total_cases");
  }

  return {
    runId: textField(run.run_id, "run_id"),
    suite: textField(run.dataset_id, "dataset_id"),
    status: status as RunStatus,
    version: textField(artifact.version, "artifact.version"),
    artifactVersion: textField(
      artifact.artifact_version,
      "artifact.artifact_version",
    ),
    promptHash: hashField(artifact.prompt_hash, "artifact.prompt_hash"),
    toolsHash: hashField(artifact.tools_hash, "artifact.tools_hash"),
    metricName: textField(summary.metric_name, "summary.metric_name"),
    metricValue: String(metricValue),
    passedCases,
    totalCases,
  };
}

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("Unterminated quoted field in version ledger");
  if (field !== "" || row.length > 0) {
    row.push(field.replace(/\r$/u, ""));
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((cell) => cell !== ""));
}

function csvCell(value: string): string {
  return /[",\r\n]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function serializeLedger(rows: readonly VersionLogRow[]): string {
  return [
    LEDGER_COLUMNS.join(","),
    ...rows.map((row) =>
      LEDGER_COLUMNS.map((column) => csvCell(row[column])).join(","),
    ),
    "",
  ].join("\n");
}

export function parseLedger(source: string): VersionLogRow[] {
  const [header, ...body] = parseCsv(source);
  if (!header || header.join(",") !== LEDGER_COLUMNS.join(",")) {
    throw new Error("Version ledger does not use the exact 12-column schema");
  }
  return body.map((cells, index) => {
    if (cells.length !== LEDGER_COLUMNS.length) {
      throw new Error(
        `Version ledger row ${index + 2} has the wrong column count`,
      );
    }
    return Object.fromEntries(
      LEDGER_COLUMNS.map((column, columnIndex) => [
        column,
        cells[columnIndex] ?? "",
      ]),
    ) as VersionLogRow;
  });
}

function assertConfined(root: string, candidate: string): void {
  const relative = path.relative(root, candidate);
  if (
    relative === "" ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Paths must remain inside the validation directory");
  }
}

function suiteFromReason(reason: string): string | undefined {
  const match = /^suite=([^;]+);/u.exec(reason);
  return match?.[1];
}

function isValidMetric(metricName: string): boolean {
  return !/^(?:PARTIAL|INVALID|INCOMPLETE)_/u.test(metricName);
}

export async function appendVersionEntry(
  input: VersionLogInput,
): Promise<VersionLogRow> {
  const validationRoot = await realpath(input.validationRoot);
  assertConfined(validationRoot, path.resolve(input.runPath));
  assertConfined(validationRoot, path.resolve(input.ledgerPath));
  const runPath = await realpath(input.runPath);
  const ledgerPath = await realpath(input.ledgerPath);
  assertConfined(validationRoot, runPath);
  assertConfined(validationRoot, ledgerPath);

  const rawRun = JSON.parse(await readFile(runPath, "utf8")) as unknown;
  const run = extractRunEvidence(rawRun);
  const ledgerSource = await readFile(ledgerPath, "utf8");
  const rows = parseLedger(ledgerSource);
  const runFile = path
    .relative(validationRoot, runPath)
    .split(path.sep)
    .join("/");
  if (rows.some((row) => row.run_file === runFile)) {
    throw new Error(`Run already logged: ${runFile}`);
  }

  const metricName =
    run.status === "valid"
      ? run.metricName
      : `${run.status.toUpperCase()}_${run.metricName}`;
  const predecessor = [...rows]
    .reverse()
    .find(
      (row) =>
        isValidMetric(row.metric_name) &&
        row.metric_name === run.metricName &&
        suiteFromReason(row.reason) === run.suite,
    );
  const measured =
    run.passedCases === undefined || run.totalCases === undefined
      ? ""
      : `; passed=${run.passedCases}/${run.totalCases}`;
  const row: VersionLogRow = {
    version: run.version,
    author: textField(input.author, "author"),
    changed_artifact: textField(input.changedArtifact, "changedArtifact"),
    artifact_version: run.artifactVersion,
    prompt_hash: run.promptHash,
    tools_hash: run.toolsHash,
    reason: `suite=${run.suite}; status=${run.status}${measured}; ${textField(input.reason, "reason")}`,
    hypothesis: textField(input.hypothesis, "hypothesis"),
    metric_name: metricName,
    metric_before:
      run.status === "valid" ? (predecessor?.metric_after ?? "") : "",
    metric_after: run.metricValue,
    run_file: runFile,
  };

  const temporary = `${ledgerPath}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, serializeLedger([...rows, row]), {
    encoding: "utf8",
    flag: "wx",
  });
  await rename(temporary, ledgerPath);
  return row;
}

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`);
  return process.argv[index + 1]!;
}

async function main(): Promise<void> {
  const validationRoot = path.resolve(
    fileURLToPath(new URL("..", import.meta.url)),
  );
  const runPath = path.resolve(argument("--run"));
  const row = await appendVersionEntry({
    validationRoot,
    ledgerPath: path.join(validationRoot, "version_log.csv"),
    runPath,
    author: argument("--author"),
    changedArtifact: argument("--change"),
    reason: argument("--reason"),
    hypothesis: argument("--hypothesis"),
  });
  process.stdout.write(`${JSON.stringify(row)}\n`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Unknown error"}\n`,
    );
    process.exitCode = 1;
  });
}
