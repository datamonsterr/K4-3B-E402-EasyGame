import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanupHostedFixtures,
  seedHostedFixtures,
  type FixtureManifest,
  type FixtureStore,
} from "../scripts/lib/hosted-fixtures.ts";
import type { HostedConfig } from "../scripts/lib/hosted-config.ts";

const config: HostedConfig = {
  appUrl: "https://app.example.test",
  supabaseUrl: "https://database.example.test",
  publishableKey: "test-publishable",
  secretKey: "test-secret",
  guildIds: [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
  ],
  identities: {
    learner_a: {
      email: "learner-a@example.test",
      password: "unused",
      guildId: "00000000-0000-4000-8000-000000000001",
      role: "learner",
    },
    coach_a: {
      email: "coach-a@example.test",
      password: "unused",
      guildId: "00000000-0000-4000-8000-000000000001",
      role: "lab_coach",
    },
    learner_b: {
      email: "learner-b@example.test",
      password: "unused",
      guildId: "00000000-0000-4000-8000-000000000002",
      role: "learner",
    },
    coach_b: {
      email: "coach-b@example.test",
      password: "unused",
      guildId: "00000000-0000-4000-8000-000000000002",
      role: "lab_coach",
    },
  },
};

function memoryStore(failAfter = Number.POSITIVE_INFINITY) {
  const inserted = new Map<string, Array<Record<string, unknown>>>();
  const deleted: string[] = [];
  let calls = 0;
  const store: FixtureStore = {
    async insert(table, values) {
      calls += 1;
      if (calls > failAfter) throw new Error("synthetic insert failure");
      const existing = inserted.get(table) ?? [];
      existing.push(...values.map((value) => ({ ...value })));
      inserted.set(table, existing);
    },
    async findCoachId(guildId) {
      return guildId === config.guildIds[0]
        ? "00000000-0000-4000-8000-000000000011"
        : "00000000-0000-4000-8000-000000000012";
    },
    async readExact(table, ids) {
      return (inserted.get(table) ?? []).filter((row) =>
        ids.includes(String(row.id)),
      );
    },
    async deleteExact(table, ids) {
      deleted.push(table);
      inserted.set(
        table,
        (inserted.get(table) ?? []).filter(
          (row) => !ids.includes(String(row.id)),
        ),
      );
    },
  };
  return { store, inserted, deleted };
}

test("cleanup deletes exact owned IDs in dependency order", async () => {
  const deleted: Array<[string, readonly string[]]> = [];
  const manifest: FixtureManifest = {
    runId: "run-1",
    namespace: "easygame-validation/run-1",
    guildIds: ["g"],
    aliases: {},
    rows: [
      {
        table: "datasets",
        id: "d",
        ownerField: "name",
        ownerValue: "easygame-validation/run-1",
      },
      {
        table: "source_messages",
        id: "m",
        ownerField: "source_label",
        ownerValue: "easygame-validation/run-1/m",
      },
    ],
  };
  const store: FixtureStore = {
    insert: async () => {},
    findCoachId: async () => "coach",
    readExact: async (table) =>
      table === "datasets"
        ? [{ id: "d", name: manifest.namespace }]
        : [{ id: "m", source_label: `${manifest.namespace}/m` }],
    deleteExact: async (table, ids) => {
      deleted.push([table, ids]);
    },
  };
  await cleanupHostedFixtures(store, manifest);
  assert.deepEqual(
    deleted.map(([table]) => table),
    ["source_messages", "datasets"],
  );
  assert.deepEqual(deleted[0]?.[1], ["m"]);
});

test("cleanup refuses ownership mismatch before deleting the affected table", async () => {
  let deleted = false;
  const store: FixtureStore = {
    insert: async () => {},
    findCoachId: async () => "coach",
    readExact: async () => [{ id: "d", name: "production" }],
    deleteExact: async () => {
      deleted = true;
    },
  };
  await assert.rejects(
    cleanupHostedFixtures(store, {
      runId: "run-1",
      namespace: "easygame-validation/run-1",
      guildIds: ["g"],
      aliases: {},
      rows: [
        {
          table: "datasets",
          id: "d",
          ownerField: "name",
          ownerValue: "easygame-validation/run-1",
        },
      ],
    }),
    /ownership mismatch/i,
  );
  assert.equal(deleted, false);
});

test("seed materializes every mutable catalog alias with scoped provenance", async () => {
  const { store, inserted } = memoryStore();
  const now = new Date("2026-09-19T08:00:00.000Z");
  const manifest = await seedHostedFixtures(store, config, now);

  assert.equal(Object.keys(manifest.aliases).length, 31);
  assert.ok(
    Object.values(manifest.aliases).every((fixture) =>
      fixture.provenance.includes(manifest.runId),
    ),
  );
  assert.deepEqual(
    new Set(Object.values(manifest.aliases).map((fixture) => fixture.guildId)),
    new Set(config.guildIds),
  );

  const tiedA = manifest.aliases["notice.lab3.tie-a"]!;
  const tiedB = manifest.aliases["notice.lab3.tie-b"]!;
  const notices = inserted.get("notices") ?? [];
  const tiedARow = notices.find((row) => row.id === tiedA.id);
  const tiedBRow = notices.find((row) => row.id === tiedB.id);
  assert.equal(tiedARow?.published_at, tiedBRow?.published_at);

  const unverified = manifest.aliases["notice.lab4.unverified"]!;
  assert.equal(unverified.present, false);
  assert.equal(unverified.table, "source_messages");
  assert.equal(
    notices.some((row) => row.message_id === unverified.sourceMessageId),
    false,
  );

  const questions = inserted.get("questions") ?? [];
  const resolved = manifest.aliases["question.resolved"]!;
  assert.ok(
    questions.some(
      (row) =>
        row.id === resolved.id &&
        row.status === "resolved" &&
        typeof row.resolved_at === "string",
    ),
  );
  const conflict = manifest.aliases["question.version-conflict"]!;
  assert.ok(
    questions.some((row) => row.id === conflict.id && row.version === 7),
  );

  const messages = inserted.get("source_messages") ?? [];
  const missing = manifest.aliases["message.missing.link"]!;
  assert.ok(
    messages.some(
      (row) => row.id === missing.id && row.discord_jump_url === null,
    ),
  );
  assert.equal(messages.length, 31);
});

test("seed compensates for partial insertion failure using exact owned rows", async () => {
  const { store, inserted, deleted } = memoryStore(7);
  await assert.rejects(
    seedHostedFixtures(store, config),
    /synthetic insert failure/,
  );
  assert.ok(deleted.length > 0);
  assert.ok(
    [...inserted.values()].every((tableRows) => tableRows.length === 0),
  );
});

test("seed can isolate a case to its referenced mutable aliases", async () => {
  const { store, inserted } = memoryStore();
  const selected = ["notice.lab2.extended", "question.open.240m"];
  const manifest = await seedHostedFixtures(
    store,
    config,
    new Date("2026-09-19T08:00:00.000Z"),
    { onlyAliases: selected },
  );

  assert.deepEqual(Object.keys(manifest.aliases), selected);
  assert.equal(inserted.get("source_messages")?.length, 2);
  assert.equal(inserted.get("notices")?.length, 1);
  assert.equal(inserted.get("questions")?.length, 1);
  assert.equal(inserted.get("datasets")?.[0]?.row_count, 2);
});

test("seed rejects an unknown alias before making hosted writes", async () => {
  const { store, inserted } = memoryStore();
  await assert.rejects(
    seedHostedFixtures(store, config, new Date(), {
      onlyAliases: ["notice.not-in-catalog"],
    }),
    /unknown mutable fixture aliases/i,
  );
  assert.equal(inserted.size, 0);
});
