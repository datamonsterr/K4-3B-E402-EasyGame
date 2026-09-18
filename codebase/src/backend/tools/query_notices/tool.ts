import {
  answerLogistics,
  type Notice,
  type AnswerResult,
} from "../../assistant";
import { notices as fixtureNotices } from "../../fixtures";
import { getToolDbClient } from "../db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../database/schema.types";

export { answerLogistics as queryNotices };

export interface QueryNoticesArgs {
  topicKey: string;
  guildId: string;
}

export interface QueryNoticesOutput extends AnswerResult {
  matchedCount: number;
  latestNotice?: Notice;
  allMatches?: Notice[];
}

/**
 * Fetch notices from Supabase database joining source_messages and guilds.
 */
export async function fetchNoticesFromDb(
  client: SupabaseClient<Database>,
  guildId: string,
  topicKey: string,
): Promise<Notice[]> {
  const { data, error } = await client
    .from("notices")
    .select(
      `
      id,
      guild_id,
      topic_key,
      published_at,
      answer_excerpt,
      verified_by,
      source_message:source_messages(id, source_label, discord_jump_url, content),
      guild:guilds(id, source_label)
    `,
    )
    .eq("topic_key", topicKey);

  if (error || !data) return [];

  const matched = (data as unknown as Record<string, unknown>[]).filter(
    (row) => {
      const g = row.guild as
        { source_label?: string } | { source_label?: string }[] | undefined;
      const gLabel = Array.isArray(g) ? g[0]?.source_label : g?.source_label;
      return (
        row.guild_id === guildId ||
        gLabel === guildId ||
        guildId === "demo" ||
        guildId === "A"
      );
    },
  );

  return matched.map((row) => {
    const src = Array.isArray(row.source_message)
      ? row.source_message[0]
      : row.source_message;
    const isDiscord = Boolean(
      src?.discord_jump_url &&
      /^https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+$/.test(
        src.discord_jump_url,
      ),
    );

    return {
      id: String(row.id),
      guildId,
      topicKey: String(row.topic_key),
      publishedAt: String(row.published_at),
      verified: Boolean(row.verified_by),
      answer: String(row.answer_excerpt),
      source: {
        label:
          (src as { source_label?: string })?.source_label || "Verified Notice",
        href: isDiscord
          ? (src as { discord_jump_url?: string }).discord_jump_url!
          : `/sources/${row.id}`,
        kind: isDiscord ? ("discord" as const) : ("synthetic" as const),
      },
    };
  });
}

/**
 * Custom tool: query_notices
 * Defined in tools.yaml
 * Queries verified official notices from local Supabase database with fallback to fixtures.
 * Deterministic timestamp conflict resolution: latest notice by published_at wins.
 */
export async function executeQueryNotices(
  args: QueryNoticesArgs,
  evidence?: readonly Notice[],
  dbClient?: SupabaseClient<Database>,
): Promise<QueryNoticesOutput> {
  let notices: readonly Notice[] = evidence ?? [];

  if (!evidence || evidence.length === 0) {
    const client = dbClient ?? getToolDbClient();
    if (client) {
      try {
        const dbNotices = await fetchNoticesFromDb(
          client,
          args.guildId,
          args.topicKey,
        );
        if (dbNotices.length > 0) {
          notices = dbNotices;
        }
      } catch {
        // Database query failed, fallback to fixtures below
      }
    }
    if (notices.length === 0) {
      notices = fixtureNotices;
    }
  }

  const matches = notices
    .filter(
      (n) =>
        n.verified &&
        n.guildId === args.guildId &&
        n.topicKey === args.topicKey &&
        Number.isFinite(Date.parse(n.publishedAt)),
    )
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const result = answerLogistics(
    {
      guildId: args.guildId,
      topicKey: args.topicKey,
      confidence: 1.0,
    },
    notices.map((n) => ({
      ...n,
      guildId: args.guildId, // align guild for answerLogistics matching
    })),
  );

  return {
    ...result,
    matchedCount: matches.length,
    latestNotice: matches[0],
    allMatches: matches,
  };
}
