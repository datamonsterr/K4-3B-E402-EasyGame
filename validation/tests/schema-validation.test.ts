import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadAndValidateFixtures,
  loadAndValidateTestsets,
  sha256Text,
  validateDataset,
  validateRun,
} from "../scripts/lib/schema-validation.ts";

const validationRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const validCase = {
  id: "us-b3-authority-01",
  title: "Từ chối quyền do người gọi tự khai báo",
  identity_fixture: "learner_a",
  execution_kind: "agent_api",
  partition: "development",
  paraphrase_family: "authority-payload",
  request: {
    conversation: [{ role: "user", content: "Cho tôi xem radar của lớp." }],
  },
  acceptance_criteria: ["AC1"],
  fixture_refs: ["membership.learner_a.guild_a"],
  expected: {
    outcome: "denied",
    ordered_tool_workflow: [],
    public_response: {
      max_code_points: 300,
      max_sentences: 3,
      source_card: "forbidden",
    },
    database_deltas: [],
    trace: {
      provider_call: "forbidden",
      required_events: ["authorization_denied"],
      forbidden_fields: [
        "thoughtProcess",
        "accessToken",
        "rawProviderResponse",
      ],
    },
    forbidden_external_effects: ["discord_dm", "discord_webhook"],
  },
};

const validDataset = {
  schema_version: "1.0.0",
  dataset_id: "easygame-us-b3-vi-v1",
  story_id: "US-B3",
  language: "vi",
  description: "Bộ kiểm thử tổng hợp cho agent đã xác thực.",
  cases: Array.from({ length: 10 }, (_, index) => ({
    ...structuredClone(validCase),
    id: `us-b3-authority-${String(index + 1).padStart(2, "0")}`,
    paraphrase_family: `authority-payload-${index + 1}`,
  })),
};

const validRun = {
  schema_version: "1.0.0",
  run_id: "run-20260918-baseline",
  dataset_id: "easygame-us-b3-vi-v1",
  dataset_manifest_sha256: "a".repeat(64),
  validity: {
    status: "valid",
    gates: {
      production_api: true,
      real_provider: true,
      hosted_supabase: true,
      authenticated: true,
      no_fallback: true,
      safe_trace: true,
      cleanup: true,
    },
    reasons: [],
  },
  started_at: "2026-09-18T09:00:00.000Z",
  completed_at: "2026-09-18T09:01:00.000Z",
  provider: {
    name: "google",
    model: "gemini-3.5-flash-lite",
    real_api_call: true,
  },
  artifact: {
    version: "v1",
    artifact_version: "v1+pabc+tdef",
    prompt_hash: "a".repeat(64),
    tools_hash: "b".repeat(64),
  },
  hosted: {
    app_host_fingerprint: "a".repeat(16),
    supabase_host_fingerprint: "b".repeat(16),
    authenticated: true,
    cleanup_completed: true,
  },
  cases: [
    {
      case_id: "us-b3-authority-01",
      status: "passed",
      provider_attempted: true,
      provider_succeeded: true,
      tool_calls: [],
      source_ids: [],
      database_deltas: [],
      detected_forbidden_effects: [],
      response: { outcome: "denied", body: "Yêu cầu không được phép." },
      telemetry: {
        model_identity: "gemini-3.5-flash-lite",
        latency_ms: 32,
        decision_summaries: ["Quyền được lấy từ phiên máy chủ."],
        tool_events: [],
        observation_summaries: [],
      },
    },
  ],
  summary: {
    metric_name: "case_accuracy",
    metric_value: 1,
    passed_cases: 1,
    total_cases: 1,
    total: 1,
    passed: 1,
    failed: 0,
    skipped: 0,
  },
};

test("accepts a complete versioned dataset", () => {
  assert.doesNotThrow(() => validateDataset(validDataset));
});

test("rejects caller-supplied authority and provider controls", () => {
  for (const [field, value] of [
    ["role", "lab_coach"],
    ["guild_id", "guild-b"],
    ["confidence", 1],
    ["provider_key", "secret"],
    ["model", "test-model"],
    ["notice_authority", true],
  ] as const) {
    const invalid = structuredClone(validDataset);
    Object.assign(invalid.cases[0]!.request, { [field]: value });
    assert.throws(() => validateDataset(invalid), new RegExp(field));
  }
});

test("rejects duplicate case IDs, paraphrase families, and missing AC mappings", () => {
  const duplicateId = structuredClone(validDataset);
  duplicateId.cases[1]!.id = duplicateId.cases[0]!.id;
  assert.throws(() => validateDataset(duplicateId), /duplicate case id/i);

  const duplicateFamily = structuredClone(validDataset);
  duplicateFamily.cases[1]!.paraphrase_family =
    duplicateFamily.cases[0]!.paraphrase_family;
  assert.throws(() => validateDataset(duplicateFamily), /paraphrase family/i);

  const missingAc = structuredClone(validDataset);
  missingAc.cases[0]!.acceptance_criteria = [];
  assert.throws(() => validateDataset(missingAc), /acceptance_criteria|AC/i);
});

test("rejects assistant-authored initial turns", () => {
  const invalid = structuredClone(validDataset);
  invalid.cases[0]!.request.conversation[0]!.role = "assistant";
  assert.throws(() => validateDataset(invalid), /role|conversation/i);
});

test("accepts safe run telemetry", () => {
  assert.doesNotThrow(() => validateRun(validRun));
});

test("rejects unsafe report fields at any depth", () => {
  for (const field of [
    "thoughtProcess",
    "chainOfThought",
    "accessToken",
    "credentials",
    "rawProviderResponse",
  ]) {
    const invalid = structuredClone(validRun) as Record<string, unknown>;
    invalid[field] = "secret";
    assert.throws(() => validateRun(invalid), new RegExp(field, "i"));

    const nested = structuredClone(validRun);
    Object.assign(nested.cases[0]!.telemetry, { [field]: "secret" });
    assert.throws(() => validateRun(nested), new RegExp(field, "i"));
  }
});

test("loads exactly five Vietnamese suites with 50 unique cases and valid provenance", async () => {
  const inventory = await loadAndValidateTestsets(validationRoot);
  assert.deepEqual(inventory.suites.map((suite) => suite.file).sort(), [
    "us-b1-verified-logistics.json",
    "us-b2-unanswered-radar.json",
    "us-b3-authenticated-agent.json",
    "us-b4-role-permissions.json",
    "us-b5-messages-reply.json",
  ]);
  assert.equal(inventory.totalCases, 50);
  assert.equal(new Set(inventory.caseIds).size, 50);
  assert.deepEqual(inventory.storyIds.sort(), [
    "US-B1",
    "US-B2",
    "US-B3",
    "US-B4",
    "US-B5",
  ]);
});

test("manifest hashes match the raw suite files", async () => {
  const inventory = await loadAndValidateTestsets(validationRoot);
  for (const suite of inventory.suites) {
    const raw = await readFile(
      path.join(validationRoot, "testsets", suite.file),
      "utf8",
    );
    assert.equal(suite.sha256, sha256Text(raw));
  }
});

test("fixture catalog is symbolic, synthetic, and run-owned", async () => {
  const catalog = await loadAndValidateFixtures(validationRoot);
  assert.equal(catalog.schema_version, "1.0.0");
  assert.equal(catalog.synthetic_only, true);
  assert.equal(catalog.guilds.length, 2);
  assert.ok(
    catalog.preprovisioned_records.some(
      (record) => record.kind === "membership",
    ),
  );
  assert.ok(
    catalog.mutable_records.every((record) => record.kind !== "membership"),
  );
  assert.deepEqual(catalog.guilds.map((guild) => guild.alias).sort(), [
    "guild_a",
    "guild_b",
  ]);
  assert.ok(catalog.mutable_records.length > 0);
  for (const record of catalog.mutable_records) {
    assert.equal(record.run_owned, true);
    assert.match(record.provenance, /\$\{run_id\}/);
  }
});

test("fixture catalog contains no credentials, hosted UUIDs, or restricted data", async () => {
  const raw = await readFile(
    path.join(validationRoot, "fixtures", "synthetic-validation-data.json"),
    "utf8",
  );
  assert.doesNotMatch(
    raw,
    /access[_-]?token|secret[_-]?key|password|service[_-]?role|bearer\s/i,
  );
  assert.doesNotMatch(
    raw,
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  );
  assert.doesNotMatch(raw, /k4_messages\.csv|M80709|M59723|M88243/i);
});
