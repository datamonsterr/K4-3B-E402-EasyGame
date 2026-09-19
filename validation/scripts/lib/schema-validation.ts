import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  EvaluationDataset,
  EvaluationRun,
  ManifestSuite,
  TestsetManifest,
} from "./contracts.ts";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const schemasDirectory = path.resolve(moduleDirectory, "../../schemas");
const requireFromCodebase = createRequire(
  path.resolve(moduleDirectory, "../../../codebase/package.json"),
);
const Ajv2020 = (
  requireFromCodebase("ajv/dist/2020") as {
    default: new (options: object) => {
      compile<T>(schema: object): ValidateFunction<T>;
    };
  }
).default;

interface ErrorObject {
  keyword: string;
  instancePath: string;
  message?: string;
  params: Record<string, unknown>;
}

interface ValidateFunction<T> {
  (value: unknown): value is T;
  errors?: ErrorObject[] | null;
}
const unsafeKeys = new Set([
  "thoughtProcess",
  "chainOfThought",
  "accessToken",
  "credentials",
  "rawProviderResponse",
]);

function compileSchema<T>(fileName: string): ValidateFunction<T> {
  const raw = readFileSync(path.join(schemasDirectory, fileName), "utf8");
  const schema = JSON.parse(raw) as object;
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateFormats: false,
  });
  return ajv.compile<T>(schema);
}

const datasetValidator = compileSchema<EvaluationDataset>(
  "eval-dataset.schema.json",
);
const runValidator = compileSchema<EvaluationRun>("eval-run.schema.json");

function describeErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? [])
    .map((error) => {
      const property =
        error.keyword === "additionalProperties"
          ? String(error.params.additionalProperty)
          : undefined;
      const location = [error.instancePath || "/", property]
        .filter(Boolean)
        .join("/");
      return `${location}: ${error.message ?? error.keyword}`;
    })
    .join("; ");
}

function rejectUnsafeTelemetry(value: unknown, location = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      rejectUnsafeTelemetry(item, `${location}[${index}]`),
    );
    return;
  }
  if (
    typeof value === "string" &&
    /bearer\s|eyJ[a-zA-Z0-9_-]+\.|password|api[_-]?key|access[_-]?token|set-cookie|chain.?of.?thought|raw.?provider/i.test(
      value,
    )
  ) {
    throw new Error(`Unsafe report content at ${location}`);
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (unsafeKeys.has(key)) {
      throw new Error(`Unsafe report field ${key} at ${location}.${key}`);
    }
    rejectUnsafeTelemetry(nested, `${location}.${key}`);
  }
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function validateDataset(value: unknown): EvaluationDataset {
  if (!datasetValidator(value)) {
    throw new Error(
      `Invalid evaluation dataset: ${describeErrors(datasetValidator.errors)}`,
    );
  }

  const caseIds = new Set<string>();
  const paraphraseFamilies = new Set<string>();
  for (const evaluationCase of value.cases) {
    if (caseIds.has(evaluationCase.id)) {
      throw new Error(`Duplicate case id: ${evaluationCase.id}`);
    }
    if (paraphraseFamilies.has(evaluationCase.paraphrase_family)) {
      throw new Error(
        `Duplicate paraphrase family: ${evaluationCase.paraphrase_family}`,
      );
    }
    caseIds.add(evaluationCase.id);
    paraphraseFamilies.add(evaluationCase.paraphrase_family);
  }
  return value;
}

export function validateRun(value: unknown): EvaluationRun {
  rejectUnsafeTelemetry(value);
  if (!runValidator(value)) {
    throw new Error(
      `Invalid evaluation run: ${describeErrors(runValidator.errors)}`,
    );
  }
  const counts = value.summary;
  if (
    counts.total !== value.cases.length ||
    counts.total !== counts.passed + counts.failed + counts.skipped ||
    counts.passed_cases !== counts.passed ||
    counts.total_cases !== counts.total ||
    counts.metric_value !==
      (counts.total === 0 ? 0 : counts.passed / counts.total)
  ) {
    throw new Error("Invalid evaluation run: inconsistent summary arithmetic");
  }
  const allGates = Object.values(value.validity.gates).every(Boolean);
  if (
    value.validity.status === "valid" &&
    (!allGates ||
      !value.provider.real_api_call ||
      value.cases.some(
        (result) => result.status !== "passed" || !result.provider_succeeded,
      ))
  ) {
    throw new Error(
      "Invalid evaluation run: valid status requires all evidence gates and provider success",
    );
  }
  return value;
}

export interface ValidatedInventory {
  suites: ManifestSuite[];
  totalCases: number;
  caseIds: string[];
  storyIds: EvaluationDataset["story_id"][];
}

export interface SyntheticFixtureCatalog {
  schema_version: "1.0.0";
  synthetic_only: true;
  guilds: Array<{ alias: string; allowlisted: true }>;
  identities: Array<{
    alias: string;
    guild_alias?: string;
    role?: "learner" | "lab_coach";
  }>;
  preprovisioned_records: Array<{ alias: string; kind: string }>;
  mutable_records: Array<{
    alias: string;
    kind: string;
    run_owned: true;
    provenance: string;
    attributes: Record<string, unknown>;
  }>;
}

export async function loadAndValidateFixtures(
  validationRoot: string,
): Promise<SyntheticFixtureCatalog> {
  const raw = await readFile(
    path.join(validationRoot, "fixtures", "synthetic-validation-data.json"),
    "utf8",
  );
  const value = JSON.parse(raw) as Partial<SyntheticFixtureCatalog>;
  if (
    value.schema_version !== "1.0.0" ||
    value.synthetic_only !== true ||
    !Array.isArray(value.guilds) ||
    !Array.isArray(value.identities) ||
    !Array.isArray(value.preprovisioned_records) ||
    !Array.isArray(value.mutable_records)
  ) {
    throw new Error("Invalid synthetic fixture catalog");
  }
  if (
    value.guilds.some(
      (guild) =>
        guild.allowlisted !== true || !guild.alias.startsWith("guild_"),
    )
  ) {
    throw new Error("Fixture guilds must be symbolic and allowlisted");
  }
  for (const record of value.mutable_records) {
    if (record.run_owned !== true || !record.provenance.includes("${run_id}")) {
      throw new Error(`Unsafe fixture provenance: ${record.alias}`);
    }
  }
  return value as SyntheticFixtureCatalog;
}

export async function loadAndValidateTestsets(
  validationRoot: string,
): Promise<ValidatedInventory> {
  const testsetsDirectory = path.join(validationRoot, "testsets");
  const manifestRaw = await readFile(
    path.join(testsetsDirectory, "manifest.json"),
    "utf8",
  );
  const manifest = JSON.parse(manifestRaw) as TestsetManifest;
  if (manifest.schema_version !== "1.0.0" || !Array.isArray(manifest.suites)) {
    throw new Error("Invalid testset manifest");
  }

  const caseIds: string[] = [];
  const storyIds: EvaluationDataset["story_id"][] = [];
  const fixtures = await loadAndValidateFixtures(validationRoot);
  const fixtureAliases = new Set([
    ...fixtures.guilds.map((fixture) => fixture.alias),
    ...fixtures.identities.map((fixture) => fixture.alias),
    ...fixtures.preprovisioned_records.map((fixture) => fixture.alias),
    ...fixtures.mutable_records.map((fixture) => fixture.alias),
  ]);
  for (const entry of manifest.suites) {
    const raw = await readFile(
      path.join(testsetsDirectory, entry.file),
      "utf8",
    );
    if (sha256Text(raw) !== entry.sha256) {
      throw new Error(`Manifest hash mismatch: ${entry.file}`);
    }
    const dataset = validateDataset(JSON.parse(raw));
    if (dataset.story_id !== entry.story_id) {
      throw new Error(`Manifest story mismatch: ${entry.file}`);
    }
    if (dataset.cases.length !== entry.cases) {
      throw new Error(`Manifest case count mismatch: ${entry.file}`);
    }
    for (const testCase of dataset.cases) {
      const references = [
        ...testCase.fixture_refs,
        ...(testCase.expected.public_response.allowed_source_refs ?? []),
        ...testCase.expected.database_deltas.map((delta) => delta.fixture_ref),
      ];
      for (const reference of references)
        if (!fixtureAliases.has(reference)) {
          throw new Error(
            `Unknown fixture reference ${reference} in ${testCase.id}`,
          );
        }
    }
    caseIds.push(...dataset.cases.map((item) => item.id));
    storyIds.push(dataset.story_id);
  }
  if (new Set(caseIds).size !== caseIds.length) {
    throw new Error("Duplicate case id across testsets");
  }
  return {
    suites: manifest.suites,
    totalCases: caseIds.length,
    caseIds,
    storyIds,
  };
}
