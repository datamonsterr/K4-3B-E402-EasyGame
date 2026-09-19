import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  LEDGER_COLUMNS,
  appendVersionEntry,
  type VersionLogInput,
} from "../scripts/log-version.ts";
import { summarizeLedger } from "../scripts/summarize-runs.ts";

const HEADER = `${LEDGER_COLUMNS.join(",")}\n`;

async function tempValidationRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "easygame-version-log-"));
  await mkdir(path.join(root, "runs"), { recursive: true });
  await writeFile(path.join(root, "version_log.csv"), HEADER, "utf8");
  return root;
}

function validRun(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schema_version: "1.0",
    run_id: "run-001",
    dataset_id: "us-b1-verified-logistics",
    validity: { status: "valid", gates: {}, reasons: [] },
    artifact: {
      version: "v1",
      artifact_version: "v1+pabc+tdef",
      prompt_hash: "a".repeat(64),
      tools_hash: "b".repeat(64),
    },
    summary: {
      metric_name: "case_accuracy",
      metric_value: 0.8,
      passed_cases: 8,
      total_cases: 10,
    },
    ...overrides,
  };
}

async function writeRun(
  root: string,
  name: string,
  run: Record<string, unknown>,
): Promise<string> {
  const runPath = path.join(root, "runs", name);
  await writeFile(runPath, `${JSON.stringify(run)}\n`, "utf8");
  return runPath;
}

function input(root: string, runPath: string): VersionLogInput {
  return {
    validationRoot: root,
    ledgerPath: path.join(root, "version_log.csv"),
    runPath,
    author: "validation-team",
    changedArtifact: "hosted validation harness",
    reason: "Initial comparable measurement",
    hypothesis: "Real hosted evidence improves confidence",
  };
}

test("uses the exact 12-column sibling ledger schema", () => {
  assert.deepEqual(LEDGER_COLUMNS, [
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
  ]);
});

test("rejects a duplicate run without changing the ledger", async () => {
  const root = await tempValidationRoot();
  const runPath = await writeRun(root, "run-001.json", validRun());
  await appendVersionEntry(input(root, runPath));
  const before = await readFile(path.join(root, "version_log.csv"), "utf8");

  await assert.rejects(
    appendVersionEntry(input(root, runPath)),
    /already logged/i,
  );

  assert.equal(
    await readFile(path.join(root, "version_log.csv"), "utf8"),
    before,
  );
});

test("confines both report and ledger paths to validation", async () => {
  const root = await tempValidationRoot();
  const outsideRun = path.join(path.dirname(root), "outside-run.json");
  await writeFile(outsideRun, JSON.stringify(validRun()), "utf8");

  await assert.rejects(
    appendVersionEntry(input(root, outsideRun)),
    /inside the validation directory/i,
  );

  const insideRun = await writeRun(root, "inside.json", validRun());
  await assert.rejects(
    appendVersionEntry({
      ...input(root, insideRun),
      ledgerPath: path.join(path.dirname(root), "outside-ledger.csv"),
    }),
    /inside the validation directory/i,
  );
});

test("requires a structurally valid sanitized run report", async () => {
  const root = await tempValidationRoot();
  const missingValidity = validRun();
  delete missingValidity.validity;
  const runPath = await writeRun(root, "invalid.json", missingValidity);

  await assert.rejects(appendVersionEntry(input(root, runPath)), /validity/i);
});

test("prefixes partial and invalid metrics without promoting them", async () => {
  const root = await tempValidationRoot();
  const partialPath = await writeRun(
    root,
    "partial.json",
    validRun({
      run_id: "partial",
      validity: { status: "partial", gates: {}, reasons: ["legacy evidence"] },
    }),
  );
  const invalidPath = await writeRun(
    root,
    "invalid.json",
    validRun({
      run_id: "invalid",
      validity: { status: "invalid", gates: {}, reasons: ["failed gate"] },
    }),
  );

  const partial = await appendVersionEntry(input(root, partialPath));
  const invalid = await appendVersionEntry(input(root, invalidPath));

  assert.equal(partial.metric_name, "PARTIAL_case_accuracy");
  assert.equal(invalid.metric_name, "INVALID_case_accuracy");
  assert.equal(partial.metric_before, "");
  assert.equal(invalid.metric_before, "");
});

test("selects only the last valid comparable predecessor", async () => {
  const root = await tempValidationRoot();
  const first = await writeRun(root, "first.json", validRun());
  const partial = await writeRun(
    root,
    "partial.json",
    validRun({
      run_id: "run-002",
      validity: { status: "partial", gates: {}, reasons: ["failed gate"] },
      summary: { metric_name: "case_accuracy", metric_value: 0.95 },
    }),
  );
  const otherSuite = await writeRun(
    root,
    "other.json",
    validRun({
      run_id: "run-003",
      dataset_id: "us-b2-unanswered-radar",
      summary: { metric_name: "case_accuracy", metric_value: 0.7 },
    }),
  );
  const latest = await writeRun(
    root,
    "latest.json",
    validRun({
      run_id: "run-004",
      summary: { metric_name: "case_accuracy", metric_value: 0.9 },
    }),
  );

  await appendVersionEntry(input(root, first));
  await appendVersionEntry(input(root, partial));
  await appendVersionEntry(input(root, otherSuite));
  const row = await appendVersionEntry(input(root, latest));

  assert.equal(row.metric_before, "0.8");
  assert.equal(row.metric_after, "0.9");
});

test("summaries exclude partial and invalid runs from headlines", async () => {
  const root = await tempValidationRoot();
  for (const [name, validity, value] of [
    ["valid.json", "valid", 0.8],
    ["partial.json", "partial", 1],
    ["invalid.json", "invalid", 1],
  ] as const) {
    const runPath = await writeRun(
      root,
      name,
      validRun({
        run_id: name,
        validity: { status: validity, gates: {}, reasons: [] },
        summary: { metric_name: "case_accuracy", metric_value: value },
      }),
    );
    await appendVersionEntry(input(root, runPath));
  }

  const summary = await summarizeLedger(path.join(root, "version_log.csv"));
  assert.equal(summary.validRunCount, 1);
  assert.equal(summary.excludedRunCount, 2);
  assert.deepEqual(summary.headlines, [
    {
      suite: "us-b1-verified-logistics",
      metric_name: "case_accuracy",
      metric_after: "0.8",
      run_file: "runs/valid.json",
    },
  ]);
});
