import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { HostedConfig } from "./hosted-config.ts";

export type OwnedRow = {
  table: string;
  id: string;
  ownerField: string;
  ownerValue: string;
};
export type MaterializedFixture = {
  alias: string;
  kind: string;
  provenance: string;
  guildId: string;
  table: "notices" | "questions" | "source_messages";
  id: string;
  sourceMessageId: string;
  present: boolean;
};
export type FixtureManifest = {
  runId: string;
  namespace: string;
  guildIds: readonly string[];
  rows: OwnedRow[];
  aliases: Record<string, MaterializedFixture>;
};
export interface FixtureStore {
  insert(
    table: string,
    rows: readonly Record<string, unknown>[],
  ): Promise<void>;
  findCoachId(guildId: string): Promise<string>;
  readExact(
    table: string,
    ids: readonly string[],
  ): Promise<readonly Record<string, unknown>[]>;
  deleteExact(table: string, ids: readonly string[]): Promise<void>;
}

type CatalogRecord = {
  alias: string;
  kind: "notice" | "question" | "source_message";
  run_owned: true;
  provenance: string;
  attributes: Record<string, unknown>;
};
type Catalog = { synthetic_only: true; mutable_records: CatalogRecord[] };
export type SeedHostedFixtureOptions = { onlyAliases?: readonly string[] };
const catalogPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/synthetic-validation-data.json",
);

function requiredString(
  attributes: Record<string, unknown>,
  key: string,
  alias: string,
): string {
  const value = attributes[key];
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`Fixture ${alias} requires string attribute ${key}`);
  return value;
}

function optionalNumber(
  attributes: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = attributes[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function guildFor(
  attributes: Record<string, unknown>,
  config: HostedConfig,
  alias: string,
): string {
  const guild = requiredString(attributes, "guild", alias);
  if (guild === "guild_a") return config.guildIds[0];
  if (guild === "guild_b") return config.guildIds[1];
  throw new Error(`Fixture ${alias} references a non-allowlisted guild alias`);
}

function jumpUrl(ordinal: number): string {
  return `https://discord.com/channels/900000000000000001/900000000000000002/${900000000000000000n + BigInt(ordinal)}`;
}

async function loadCatalog(): Promise<Catalog> {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as Catalog;
  if (
    catalog.synthetic_only !== true ||
    !Array.isArray(catalog.mutable_records)
  )
    throw new Error("Invalid synthetic hosted fixture catalog");
  return catalog;
}

export async function seedHostedFixtures(
  store: FixtureStore,
  config: HostedConfig,
  now = new Date(),
  options: SeedHostedFixtureOptions = {},
): Promise<FixtureManifest> {
  const catalog = await loadCatalog();
  const requestedAliases = options.onlyAliases
    ? new Set(options.onlyAliases)
    : undefined;
  const records = requestedAliases
    ? catalog.mutable_records.filter((record) =>
        requestedAliases.has(record.alias),
      )
    : catalog.mutable_records;
  if (requestedAliases && records.length !== requestedAliases.size) {
    const known = new Set(records.map((record) => record.alias));
    const unknown = [...requestedAliases].filter((alias) => !known.has(alias));
    throw new Error(`Unknown mutable fixture aliases: ${unknown.join(", ")}`);
  }
  const runId = `run-${randomUUID()}`;
  const namespace = `easygame-validation/${runId}`;
  const manifest: FixtureManifest = {
    runId,
    namespace,
    guildIds: config.guildIds,
    rows: [],
    aliases: {},
  };
  const remember = (
    table: string,
    id: string,
    ownerField: string,
    ownerValue: string,
  ) => manifest.rows.push({ table, id, ownerField, ownerValue });
  const datasetId = randomUUID();
  const checksum = createHash("sha256").update(namespace).digest("hex");
  let ordinal = 1;
  const guildResources = new Map<
    string,
    { channelId: string; authorId: string; coachId: string }
  >();

  const insertSourceMessage = async (
    record: CatalogRecord,
    guildId: string,
    sentAt: Date,
    content: string,
    hasLink: boolean,
  ): Promise<string> => {
    const resources = guildResources.get(guildId);
    if (!resources)
      throw new Error(`Missing hosted resources for ${record.alias}`);
    const id = randomUUID();
    const sourceLabel = `${namespace}/${record.alias}`;
    const currentOrdinal = ordinal++;
    await store.insert("source_messages", [
      {
        id,
        dataset_id: datasetId,
        record_ordinal: currentOrdinal,
        guild_id: guildId,
        channel_id: resources.channelId,
        author_id: resources.authorId,
        source_label: sourceLabel,
        message_type: "message",
        sent_at: sentAt.toISOString(),
        content,
        mentions_bot: record.kind === "question",
        attachment_count: 0,
        source_char_count: Array.from(content).length,
        reply_source_label: null,
        reply_to_id: null,
        reply_resolution: "none",
        discord_jump_url: hasLink ? jumpUrl(currentOrdinal) : null,
      },
    ]);
    remember("source_messages", id, "source_label", sourceLabel);
    return id;
  };

  try {
    await store.insert("datasets", [
      {
        id: datasetId,
        sha256: checksum,
        name: namespace,
        source_kind: "synthetic",
        row_count: records.length,
      },
    ]);
    remember("datasets", datasetId, "name", namespace);

    for (const [index, guildId] of config.guildIds.entries()) {
      const coachId = await store.findCoachId(guildId);
      const channelId = randomUUID();
      const authorId = randomUUID();
      const channelLabel = `${namespace}/channel-${index}`;
      await store.insert("channels", [
        {
          id: channelId,
          guild_id: guildId,
          source_label: channelLabel,
          display_name: `validation-public-${index}`,
          visibility: "public",
        },
      ]);
      remember("channels", channelId, "source_label", channelLabel);
      await store.insert("authors", [
        {
          id: authorId,
          source_namespace: namespace,
          source_label: `${namespace}/author-${index}`,
          is_bot: false,
        },
      ]);
      remember("authors", authorId, "source_namespace", namespace);
      guildResources.set(guildId, { channelId, authorId, coachId });
    }

    for (const record of records) {
      const { attributes } = record;
      const guildId = guildFor(attributes, config, record.alias);
      const resources = guildResources.get(guildId);
      if (!resources)
        throw new Error(`Missing hosted guild resources for ${record.alias}`);
      const provenance = record.provenance.replace("${run_id}", runId);

      if (record.kind === "notice") {
        const topic = requiredString(attributes, "topic", record.alias);
        const revision = optionalNumber(attributes, "revision", 1);
        const tied = attributes.timestamp_group === "tie";
        const publishedAt = new Date(
          now.getTime() - (tied ? 30 : Math.max(1, 120 - revision)) * 60_000,
        );
        const content =
          typeof attributes.content === "string"
            ? attributes.content
            : `Thông báo synthetic ${record.alias}.`;
        const messageId = await insertSourceMessage(
          record,
          guildId,
          publishedAt,
          content,
          attributes.link_state !== "missing",
        );
        if (attributes.verified === false) {
          manifest.aliases[record.alias] = {
            alias: record.alias,
            kind: record.kind,
            provenance,
            guildId,
            table: "source_messages",
            id: messageId,
            sourceMessageId: messageId,
            present: false,
          };
          continue;
        }
        const noticeId = randomUUID();
        await store.insert("notices", [
          {
            id: noticeId,
            guild_id: guildId,
            message_id: messageId,
            topic_key: topic,
            verified_by: resources.coachId,
            verified_at: publishedAt.toISOString(),
            published_at: publishedAt.toISOString(),
            answer_excerpt: content,
          },
        ]);
        remember("notices", noticeId, "message_id", messageId);
        manifest.aliases[record.alias] = {
          alias: record.alias,
          kind: record.kind,
          provenance,
          guildId,
          table: "notices",
          id: noticeId,
          sourceMessageId: messageId,
          present: true,
        };
        continue;
      }

      if (record.kind === "question") {
        const ageMinutes = optionalNumber(attributes, "age_minutes", 0);
        const messageId = await insertSourceMessage(
          record,
          guildId,
          new Date(now.getTime() - ageMinutes * 60_000),
          `Câu hỏi synthetic ${record.alias}`,
          true,
        );
        const requestedStatus = requiredString(
          attributes,
          "status",
          record.alias,
        );
        const status =
          requestedStatus === "unresolved" ? "open" : requestedStatus;
        if (!["open", "answered", "resolved"].includes(status))
          throw new Error(
            `Fixture ${record.alias} has unsupported question status`,
          );
        const questionId = randomUUID();
        await store.insert("questions", [
          {
            id: questionId,
            guild_id: guildId,
            message_id: messageId,
            intent: "validation-question",
            status,
            version: optionalNumber(attributes, "version", 1),
            claimed_by: null,
            resolved_at: status === "resolved" ? now.toISOString() : null,
          },
        ]);
        remember("questions", questionId, "message_id", messageId);
        manifest.aliases[record.alias] = {
          alias: record.alias,
          kind: record.kind,
          provenance,
          guildId,
          table: "questions",
          id: questionId,
          sourceMessageId: messageId,
          present: true,
        };
        continue;
      }

      const messageId = await insertSourceMessage(
        record,
        guildId,
        new Date(now.getTime() - ordinal * 60_000),
        `Tin nhắn synthetic ${record.alias}`,
        attributes.link_state !== "missing",
      );
      manifest.aliases[record.alias] = {
        alias: record.alias,
        kind: record.kind,
        provenance,
        guildId,
        table: "source_messages",
        id: messageId,
        sourceMessageId: messageId,
        present: true,
      };
    }

    if (Object.keys(manifest.aliases).length !== records.length)
      throw new Error("Not every mutable fixture alias was materialized");
    return manifest;
  } catch (seedError) {
    try {
      await cleanupHostedFixtures(store, manifest);
    } catch (cleanupError) {
      throw new AggregateError(
        [seedError, cleanupError],
        "Hosted fixture seed failed and compensating cleanup was incomplete",
      );
    }
    throw seedError;
  }
}

const DELETE_ORDER = [
  "run_events",
  "assistant_runs",
  "radar_alerts",
  "question_events",
  "questions",
  "notices",
  "source_messages",
  "channels",
  "authors",
  "datasets",
];

export async function cleanupHostedFixtures(
  store: FixtureStore,
  manifest: FixtureManifest,
): Promise<void> {
  if (!manifest.namespace.startsWith(`easygame-validation/${manifest.runId}`))
    throw new Error("Fixture ownership mismatch");
  for (const table of DELETE_ORDER) {
    const owned = manifest.rows.filter((row) => row.table === table);
    if (owned.length === 0) continue;
    const actual = await store.readExact(
      table,
      owned.map((row) => row.id),
    );
    if (
      actual.length !== owned.length ||
      owned.some(
        (expected) =>
          !actual.some(
            (row) =>
              row.id === expected.id &&
              row[expected.ownerField] === expected.ownerValue,
          ),
      )
    ) {
      throw new Error(`Fixture ownership mismatch in ${table}`);
    }
    await store.deleteExact(
      table,
      owned.map((row) => row.id),
    );
  }
}
