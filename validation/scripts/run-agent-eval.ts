import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  EvaluationCase,
  EvaluationDataset,
  EvaluationRun,
  IdentityFixture,
} from "./lib/contracts.ts";
import { loadHostedConfig, type IdentityAlias } from "./lib/hosted-config.ts";
import { loginHostedIdentity } from "./lib/hosted-auth.ts";
import {
  cleanupHostedFixtures,
  seedHostedFixtures,
  type FixtureManifest,
  type FixtureStore,
} from "./lib/hosted-fixtures.ts";
import { hashFile, hostFingerprint, sha256 } from "./lib/hashes.ts";
import { scoreCase } from "./lib/scorer.ts";
import { writeSafeReport } from "./lib/safe-report.ts";
import { loadAndValidateTestsets } from "./lib/schema-validation.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const validationRoot = path.resolve(here, "..");
const repositoryRoot = path.resolve(validationRoot, "..");
const codebaseRoot = path.join(repositoryRoot, "codebase");
const requireFromCodebase = createRequire(
  path.join(codebaseRoot, "package.json"),
);
const { createClient } = requireFromCodebase("@supabase/supabase-js") as {
  createClient(url: string, key: string, options: object): ServiceClient;
};

type QueryResult = { data: unknown; error: { message?: string } | null };
type Builder = {
  insert(rows: readonly Record<string, unknown>[]): Promise<QueryResult>;
  select(columns?: string): Builder & PromiseLike<QueryResult>;
  eq(column: string, value: unknown): Builder & PromiseLike<QueryResult>;
  in(
    column: string,
    values: readonly string[],
  ): Builder & PromiseLike<QueryResult>;
  limit(count: number): Builder & PromiseLike<QueryResult>;
  delete(): Builder;
};
type ServiceClient = { from(table: string): Builder };

const SNAPSHOT_TABLES = [
  "memberships",
  "notices",
  "questions",
  "radar_alerts",
  "question_events",
  "source_messages",
] as const;
type SnapshotTable = (typeof SNAPSHOT_TABLES)[number];
type DatabaseSnapshot = Record<
  SnapshotTable,
  Record<string, Record<string, unknown>>
>;

function rows(
  result: QueryResult,
  operation: string,
): Record<string, unknown>[] {
  if (result.error) throw new Error(`Hosted fixture ${operation} failed`);
  return Array.isArray(result.data)
    ? (result.data as Record<string, unknown>[])
    : [];
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  return value;
}

function snapshotKey(
  table: SnapshotTable,
  row: Record<string, unknown>,
): string {
  if (table === "memberships")
    return `${String(row.guild_id)}:${String(row.user_id)}`;
  if (typeof row.id !== "string")
    throw new Error(`Hosted snapshot row in ${table} has no ID`);
  return row.id;
}

export async function assertDedicatedGuildsClean(
  client: ServiceClient,
  guildIds: readonly string[],
): Promise<void> {
  const protectedTables = [
    "notices",
    "questions",
    "source_messages",
    "radar_alerts",
    "question_events",
    "assistant_runs",
  ] as const;
  for (const table of protectedTables) {
    const found = rows(
      await client.from(table).select("id").in("guild_id", guildIds).limit(1),
      `preflight ${table}`,
    );
    if (found.length > 0)
      throw new Error(
        `Hosted validation guild is not dedicated and empty: ${table}`,
      );
  }
}

async function snapshotDatabase(
  client: ServiceClient,
  guildIds: readonly string[],
): Promise<DatabaseSnapshot> {
  const snapshot = {} as DatabaseSnapshot;
  for (const table of SNAPSHOT_TABLES) {
    const found = rows(
      await client.from(table).select("*").in("guild_id", guildIds),
      `snapshot ${table}`,
    );
    snapshot[table] = Object.fromEntries(
      found.map((row) => [snapshotKey(table, row), row]),
    );
  }
  return snapshot;
}

function rowMatchesFixture(
  table: SnapshotTable,
  row: Record<string, unknown>,
  fixtureId: string | undefined,
): boolean {
  if (!fixtureId) return true;
  if (["radar_alerts", "question_events"].includes(table))
    return row.question_id === fixtureId;
  if (table === "source_messages")
    return row.id === fixtureId || row.reply_to_id === fixtureId;
  return row.id === fixtureId;
}

function mutationCount(
  table: SnapshotTable,
  operation: "insert" | "update" | "delete" | "none",
  before: DatabaseSnapshot,
  after: DatabaseSnapshot,
  fixtureId?: string,
): number {
  const beforeRows = before[table];
  const afterRows = after[table];
  const inserted = Object.entries(afterRows).filter(
    ([key, row]) =>
      !beforeRows[key] && rowMatchesFixture(table, row, fixtureId),
  ).length;
  const deleted = Object.entries(beforeRows).filter(
    ([key, row]) => !afterRows[key] && rowMatchesFixture(table, row, fixtureId),
  ).length;
  const updated = Object.entries(afterRows).filter(
    ([key, row]) =>
      beforeRows[key] &&
      rowMatchesFixture(table, row, fixtureId) &&
      JSON.stringify(stableValue(beforeRows[key])) !==
        JSON.stringify(stableValue(row)),
  ).length;
  if (operation === "insert") return inserted;
  if (operation === "delete") return deleted;
  if (operation === "update") return updated;
  return inserted + deleted + updated;
}

function databaseDeltas(
  testCase: EvaluationCase,
  manifest: FixtureManifest,
  before: DatabaseSnapshot,
  after: DatabaseSnapshot,
): EvaluationRun["cases"][number]["database_deltas"] {
  return testCase.expected.database_deltas.map((expected) => {
    const table = expected.table as SnapshotTable;
    if (!SNAPSHOT_TABLES.includes(table))
      return { ...expected, expected_count: 0 };
    const fixtureId = manifest.aliases[expected.fixture_ref]?.id;
    return {
      ...expected,
      expected_count: mutationCount(
        table,
        expected.operation,
        before,
        after,
        fixtureId,
      ),
    };
  });
}

function unexpectedDatabaseEffects(
  testCase: EvaluationCase,
  before: DatabaseSnapshot,
  after: DatabaseSnapshot,
): string[] {
  const expectedByTable = new Map<SnapshotTable, number>();
  for (const delta of testCase.expected.database_deltas) {
    if (SNAPSHOT_TABLES.includes(delta.table as SnapshotTable))
      expectedByTable.set(
        delta.table as SnapshotTable,
        (expectedByTable.get(delta.table as SnapshotTable) ?? 0) +
          delta.expected_count,
      );
  }
  const effects: string[] = [];
  for (const table of SNAPSHOT_TABLES) {
    const mutations = mutationCount(table, "none", before, after);
    if (mutations > (expectedByTable.get(table) ?? 0))
      effects.push(
        table === "memberships"
          ? "membership_mutation"
          : `unexpected_database_mutation:${table}`,
      );
  }
  return effects;
}

function storeFor(client: ServiceClient): FixtureStore {
  return {
    async insert(table, values) {
      const result = await client.from(table).insert(values);
      if (result.error)
        throw new Error(`Hosted fixture insert failed for ${table}`);
    },
    async findCoachId(guildId) {
      const result = await client
        .from("memberships")
        .select("user_id")
        .eq("guild_id", guildId)
        .eq("role", "lab_coach")
        .limit(2);
      const found = rows(result, "coach lookup");
      if (found.length !== 1 || typeof found[0]?.user_id !== "string")
        throw new Error(
          "Allowlisted guild must have exactly one validation coach membership",
        );
      return found[0].user_id;
    },
    async readExact(table, ids) {
      return rows(
        await client.from(table).select("*").in("id", ids),
        `read ${table}`,
      );
    },
    async deleteExact(table, ids) {
      const result = await client.from(table).delete().in("id", ids);
      if (result.error)
        throw new Error(`Hosted fixture cleanup failed for ${table}`);
    },
  };
}

function identityAlias(value: IdentityFixture): IdentityAlias | null {
  return value === "unauthenticated" ? null : value;
}

function outcome(
  status: number,
  body: Record<string, unknown>,
): EvaluationRun["cases"][number]["response"]["outcome"] {
  if (status === 401 || status === 403) return "denied";
  if (status >= 500) return "unavailable";
  const value = body.status;
  if (value === "completed") return "succeeded";
  if (["answered", "clarify", "fallback", "refused"].includes(String(value)))
    return value as "answered" | "clarify" | "fallback" | "refused";
  return "unavailable";
}

async function loadDatasets(): Promise<EvaluationDataset[]> {
  const manifest = JSON.parse(
    await readFile(path.join(validationRoot, "testsets/manifest.json"), "utf8"),
  ) as { suites: Array<{ file: string }> };
  return Promise.all(
    manifest.suites.map(
      async ({ file }) =>
        JSON.parse(
          await readFile(path.join(validationRoot, "testsets", file), "utf8"),
        ) as EvaluationDataset,
    ),
  );
}

async function loadMutableFixtureAliases(): Promise<Set<string>> {
  const catalog = JSON.parse(
    await readFile(
      path.join(validationRoot, "fixtures/synthetic-validation-data.json"),
      "utf8",
    ),
  ) as { mutable_records?: Array<{ alias?: unknown }> };
  return new Set(
    (catalog.mutable_records ?? [])
      .map((record) => record.alias)
      .filter((alias): alias is string => typeof alias === "string"),
  );
}

async function collectOwnedEffects(
  client: ServiceClient,
  manifest: FixtureManifest,
): Promise<void> {
  const runs = rows(
    await client
      .from("assistant_runs")
      .select("id,guild_id")
      .in("guild_id", manifest.guildIds),
    "collect assistant_runs",
  );
  for (const row of runs) {
    if (typeof row.id !== "string" || typeof row.guild_id !== "string")
      continue;
    if (
      !manifest.rows.some(
        (owned) => owned.table === "assistant_runs" && owned.id === row.id,
      )
    ) {
      manifest.rows.push({
        table: "assistant_runs",
        id: row.id,
        ownerField: "guild_id",
        ownerValue: row.guild_id,
      });
    }
  }
  const runIds = runs
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");
  if (runIds.length > 0) {
    const events = rows(
      await client.from("run_events").select("id,run_id").in("run_id", runIds),
      "collect run_events",
    );
    for (const row of events) {
      if (typeof row.id !== "string" || typeof row.run_id !== "string")
        continue;
      if (
        !manifest.rows.some(
          (owned) => owned.table === "run_events" && owned.id === row.id,
        )
      ) {
        manifest.rows.push({
          table: "run_events",
          id: row.id,
          ownerField: "run_id",
          ownerValue: row.run_id,
        });
      }
    }
  }

  const questions = manifest.rows.filter((row) => row.table === "questions");
  const questionIds = questions.map((row) => row.id);
  if (questionIds.length === 0) return;
  for (const table of ["radar_alerts", "question_events"] as const) {
    const found = rows(
      await client
        .from(table)
        .select("id,guild_id")
        .in("question_id", questionIds),
      `collect ${table}`,
    );
    for (const row of found)
      if (typeof row.id === "string" && typeof row.guild_id === "string")
        if (
          !manifest.rows.some(
            (owned) => owned.table === table && owned.id === row.id,
          )
        )
          manifest.rows.push({
            table,
            id: row.id,
            ownerField: "guild_id",
            ownerValue: row.guild_id,
          });
  }
}

async function executeCase(
  client: ServiceClient,
  config: ReturnType<typeof loadHostedConfig>,
  manifest: FixtureManifest,
  testCase: EvaluationCase,
): Promise<EvaluationRun["cases"][number]> {
  if (
    !(["agent_api", "tool_contract"] as const).includes(
      testCase.execution_kind as "agent_api" | "tool_contract",
    )
  ) {
    return {
      case_id: testCase.id,
      status: "skipped",
      provider_attempted: false,
      provider_succeeded: false,
      tool_calls: [],
      source_ids: [],
      database_deltas: [],
      detected_forbidden_effects: [],
      response: { outcome: "unavailable" },
      telemetry: {
        model_identity: "not-executed",
        latency_ms: 0,
        decision_summaries: [
          "Execution kind is not supported by the agent API runner",
        ],
        tool_events: [],
        observation_summaries: [],
      },
    };
  }
  const before = await snapshotDatabase(client, manifest.guildIds);
  const alias = identityAlias(testCase.identity_fixture);
  let session: Awaited<ReturnType<typeof loginHostedIdentity>> | undefined;
  let latestBody: Record<string, unknown> = {};
  let latestStatus = 0;
  let latency = 0;
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  const runIds: string[] = [];
  try {
    if (alias)
      session = await loginHostedIdentity(
        config.appUrl,
        config.identities[alias],
      );
    for (const turn of testCase.request.conversation) {
      const started = performance.now();
      const response = session
        ? await session.request("/api/demo/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: turn.content, history }),
          })
        : await fetch(new URL("/api/demo/answer", config.appUrl), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Origin: config.appUrl,
            },
            body: JSON.stringify({ query: turn.content, history }),
          });
      latency += performance.now() - started;
      latestStatus = response.status;
      latestBody = (await response.json()) as Record<string, unknown>;
      const runId = response.headers.get("x-easygame-run-id");
      if (runId) runIds.push(runId);
      if (response.ok && typeof latestBody.body === "string")
        history.push(
          { role: "user", content: turn.content },
          { role: "assistant", content: latestBody.body },
        );
    }
  } finally {
    await session?.close();
  }

  const runRows = runIds.length
    ? rows(
        await client.from("assistant_runs").select("*").in("id", runIds),
        "load run evidence",
      )
    : [];
  const eventRows = runIds.length
    ? rows(
        await client.from("run_events").select("*").in("run_id", runIds),
        "load run events",
      )
    : [];
  for (const row of runRows)
    if (typeof row.id === "string" && typeof row.guild_id === "string")
      manifest.rows.push({
        table: "assistant_runs",
        id: row.id,
        ownerField: "guild_id",
        ownerValue: row.guild_id,
      });
  for (const row of eventRows)
    if (typeof row.id === "string" && typeof row.run_id === "string")
      manifest.rows.push({
        table: "run_events",
        id: row.id,
        ownerField: "run_id",
        ownerValue: row.run_id,
      });
  await collectOwnedEffects(client, manifest);
  const after = await snapshotDatabase(client, manifest.guildIds);
  const toolCalls = eventRows
    .filter((row) => row.event_type === "tool")
    .map((row) => ({
      name:
        typeof (row.safe_metadata as Record<string, unknown> | undefined)
          ?.tool === "string"
          ? String((row.safe_metadata as Record<string, unknown>).tool)
          : "unknown",
      arguments_summary: "Server-bound validated arguments",
      result_summary: "See subsequent bounded observation",
    }));
  const response = {
    outcome: outcome(latestStatus, latestBody),
    ...(typeof latestBody.body === "string" ? { body: latestBody.body } : {}),
    ...(latestBody.source &&
    typeof latestBody.source === "object" &&
    typeof (latestBody.source as Record<string, unknown>).href === "string"
      ? {
          source_card: String(
            (latestBody.source as Record<string, unknown>).href,
          ),
        }
      : {}),
  };
  const selectedNoticeIds = new Set(
    runRows
      .map((row) => row.notice_id)
      .filter((value): value is string => typeof value === "string"),
  );
  const selectedAliases = Object.values(manifest.aliases).filter(
    (fixture) =>
      fixture.table === "notices" && selectedNoticeIds.has(fixture.id),
  );
  const selectedMessages = selectedAliases.length
    ? rows(
        await client
          .from("source_messages")
          .select("id,guild_id,discord_jump_url")
          .in(
            "id",
            selectedAliases.map((fixture) => fixture.sourceMessageId),
          ),
        "load source provenance",
      )
    : [];
  const groundedAliases = selectedAliases
    .filter((fixture) =>
      selectedMessages.some(
        (message) =>
          message.id === fixture.sourceMessageId &&
          message.discord_jump_url === response.source_card,
      ),
    )
    .map((fixture) => fixture.alias);
  const forbiddenEffects = unexpectedDatabaseEffects(testCase, before, after);
  if (response.source_card && groundedAliases.length === 0)
    forbiddenEffects.push("fabricated_link");
  const expectedGuild =
    alias?.endsWith("_a") === true
      ? config.guildIds[0]
      : alias?.endsWith("_b") === true
        ? config.guildIds[1]
        : undefined;
  if (
    expectedGuild &&
    selectedAliases.some((fixture) => fixture.guildId !== expectedGuild)
  )
    forbiddenEffects.push("cross_guild_read");
  const observed = {
    case_id: testCase.id,
    status: "failed" as const,
    provider_attempted: runRows.some((row) => row.provider_attempted === true),
    provider_succeeded: runRows.some((row) => row.provider_succeeded === true),
    tool_calls: toolCalls,
    source_ids: groundedAliases,
    database_deltas: databaseDeltas(testCase, manifest, before, after),
    detected_forbidden_effects: [...new Set(forbiddenEffects)],
    response,
    telemetry: {
      model_identity: String(runRows.at(-1)?.model ?? "not-attempted"),
      latency_ms: Math.round(latency),
      decision_summaries: eventRows
        .filter((row) => row.event_type === "retrieval")
        .map((row) => String(row.summary)),
      tool_events: toolCalls.map((call) => call.name),
      observation_summaries: eventRows
        .filter((row) => row.event_type === "result")
        .map((row) => String(row.summary)),
    },
  };
  const scored = scoreCase(testCase, observed);
  return { ...observed, status: scored.passed ? "passed" : "failed" };
}

export async function runHostedEvaluation(): Promise<string> {
  const config = loadHostedConfig();
  await loadAndValidateTestsets(validationRoot);
  const datasets = await loadDatasets();
  const admin = createClient(config.supabaseUrl, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const store = storeFor(admin);
  const startedAt = new Date().toISOString();
  const reportRunId = `run-${randomUUID()}`;
  const mutableAliases = await loadMutableFixtureAliases();
  const results: EvaluationRun["cases"] = [];
  let preflightChecks = 0;
  let seededCases = 0;
  let cleanupCount = 0;
  for (const dataset of datasets) {
    for (const testCase of dataset.cases) {
      await assertDedicatedGuildsClean(admin, config.guildIds);
      preflightChecks += 1;
      const onlyAliases = testCase.fixture_refs.filter((fixtureRef) =>
        mutableAliases.has(fixtureRef),
      );
      const manifest = await seedHostedFixtures(store, config, new Date(), {
        onlyAliases,
      });
      seededCases += 1;
      try {
        results.push(await executeCase(admin, config, manifest, testCase));
      } finally {
        await collectOwnedEffects(admin, manifest);
        await cleanupHostedFixtures(store, manifest);
        cleanupCount += 1;
      }
    }
  }
  const totalCases = datasets.reduce(
    (total, dataset) => total + dataset.cases.length,
    0,
  );
  const cleanupCompleted = cleanupCount === totalCases;
  const passed = results.filter((result) => result.status === "passed").length;
  const failed = results.filter((result) => result.status === "failed").length;
  const skipped = results.filter(
    (result) => result.status === "skipped",
  ).length;
  const providerRequiredIds = new Set(
    datasets.flatMap((dataset) =>
      dataset.cases
        .filter(
          (testCase) => testCase.expected.trace.provider_call === "required",
        )
        .map((testCase) => testCase.id),
    ),
  );
  const providerCases = results.filter((result) =>
    providerRequiredIds.has(result.case_id),
  );
  const expectedById = new Map(
    datasets.flatMap((dataset) =>
      dataset.cases.map((testCase) => [testCase.id, testCase] as const),
    ),
  );
  const providerEvidenceSatisfied =
    providerCases.length > 0 &&
    providerCases.every((result) => {
      const expectsFailure =
        expectedById.get(result.case_id)?.expected.outcome === "unavailable";
      return (
        result.provider_attempted &&
        (expectsFailure
          ? !result.provider_succeeded
          : result.provider_succeeded)
      );
    });
  const unsafeTrace =
    /bearer\s|eyJ[a-zA-Z0-9_-]+\.|password|api[_-]?key|access[_-]?token|set-cookie|chain.?of.?thought|raw.?provider/i;
  const executed = results.filter((result) => result.status !== "skipped");
  const gates = {
    production_api:
      results.length === totalCases &&
      totalCases > 0 &&
      results.every((result) => result.status !== "skipped"),
    real_provider: providerEvidenceSatisfied,
    hosted_supabase:
      preflightChecks === totalCases &&
      seededCases === totalCases &&
      cleanupCompleted,
    authenticated:
      executed.length > 0 &&
      executed.every((result) => {
        const identity = expectedById.get(result.case_id)?.identity_fixture;
        return identity === "unauthenticated"
          ? result.response.outcome === "denied"
          : identity !== undefined &&
              result.telemetry.model_identity !== "not-attempted";
      }),
    no_fallback: results.every((result) => {
      if (result.response.outcome !== "unavailable") return true;
      return (
        expectedById.get(result.case_id)?.expected.outcome === "unavailable" &&
        result.provider_attempted
      );
    }),
    safe_trace: results.every(
      (result) => !unsafeTrace.test(JSON.stringify(result.telemetry)),
    ),
    cleanup: cleanupCompleted,
  };
  const allGates = Object.values(gates).every(Boolean);
  const report: EvaluationRun = {
    schema_version: "1.0.0",
    run_id: reportRunId,
    dataset_id: "easygame-hosted-all-v1",
    dataset_manifest_sha256: sha256(
      await readFile(path.join(validationRoot, "testsets/manifest.json")),
    ),
    validity: {
      status: allGates && failed === 0 && skipped === 0 ? "valid" : "invalid",
      gates,
      reasons: [
        ...Object.entries(gates)
          .filter(([, value]) => !value)
          .map(([name]) => `gate failed: ${name}`),
        ...(failed > 0 ? [`failed cases: ${failed}`] : []),
        ...(skipped > 0 ? [`skipped cases: ${skipped}`] : []),
      ],
    },
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    provider: {
      name: String(process.env.AI_PROVIDER ?? "gemini"),
      model: String(
        process.env.GEMINI_MODEL ??
          process.env.OPENROUTER_MODEL ??
          "configured-hosted-model",
      ),
      real_api_call: providerEvidenceSatisfied,
    },
    artifact: {
      version: "v0",
      artifact_version: "v0+hosted",
      prompt_hash: await hashFile(
        path.join(codebaseRoot, "app/backend/artifacts/system_prompt.md"),
      ),
      tools_hash: await hashFile(
        path.join(codebaseRoot, "app/backend/artifacts/tools.yaml"),
      ),
    },
    hosted: {
      app_host_fingerprint: hostFingerprint(config.appUrl),
      supabase_host_fingerprint: hostFingerprint(config.supabaseUrl),
      authenticated: gates.authenticated,
      cleanup_completed: cleanupCompleted,
    },
    cases: results,
    summary: {
      metric_name: "case_accuracy",
      metric_value: results.length === 0 ? 0 : passed / results.length,
      passed_cases: passed,
      total_cases: results.length,
      total: results.length,
      passed,
      failed,
      skipped,
    },
  };
  return writeSafeReport(
    validationRoot,
    `runs/hosted/${reportRunId}.json`,
    report,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runHostedEvaluation()
    .then((report) =>
      process.stdout.write(
        `Hosted validation report: ${path.relative(repositoryRoot, report)}\n`,
      ),
    )
    .catch((error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : "Hosted validation failed"}\n`,
      );
      process.exitCode = 1;
    });
}
