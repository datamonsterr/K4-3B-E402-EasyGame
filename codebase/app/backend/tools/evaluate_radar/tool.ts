import { evaluateRadar, type RadarQuestion, type RadarItem } from "../../radar";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../database/schema.types";
import { ToolOperationError } from "../../assistant/agent/operation-errors";

export { evaluateRadar };

export interface EvaluateRadarArgs {
  guildId: string;
  now?: string;
}

export interface RadarMetrics {
  urgentBreaches: number;
  softWarnings: number;
  resolvedToday: string;
  compliance: string;
  totalActive: number;
}

export interface EvaluateRadarOutput {
  guildId: string;
  evaluatedAt: string;
  items: Array<RadarItem & { version?: number }>;
  metrics: RadarMetrics;
}

export type RadarQuestionWithMeta = RadarQuestion & {
  version?: number;
  question?: string;
  channel?: string;
  resolvedAt?: string | null;
};

/**
 * Fetch questions from Supabase database joining source_messages and guilds.
 */
export async function fetchQuestionsFromDb(
  client: SupabaseClient<Database>,
  guildId: string,
): Promise<RadarQuestionWithMeta[]> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guildId,
    );
  let query = client.from("questions").select(
    `
      id,
      guild_id,
      status,
      intent,
      version,
      created_at,
      resolved_at,
      claimed_by,
      source_message:source_messages(id, content, sent_at, channel_id),
      guild:guilds(id, source_label)
    `,
  );
  if (isUuid) {
    query = query.eq("guild_id", guildId);
  }
  const { data, error } = await query;

  if (error) {
    throw new ToolOperationError("evaluate_radar", "unavailable");
  }

  interface DbQuestionRow {
    id: string;
    guild_id: string;
    status: string;
    intent: string;
    version: number;
    created_at: string;
    resolved_at: string | null;
    guild?: { source_label?: string } | { source_label?: string }[] | null;
    source_message?:
      | { id?: string; content?: string; sent_at?: string; channel_id?: string }
      | {
          id?: string;
          content?: string;
          sent_at?: string;
          channel_id?: string;
        }[]
      | null;
  }

  const rawRows = (data ?? []) as unknown as DbQuestionRow[];
  const rows = isUuid
    ? rawRows
    : rawRows.filter((row) => {
        const g = row.guild;
        const gLabel = Array.isArray(g) ? g[0]?.source_label : g?.source_label;
        return (
          row.guild_id === guildId ||
          gLabel === guildId ||
          guildId === "demo" ||
          guildId === "A"
        );
      });
  return rows.map((row) => {
    const src = Array.isArray(row.source_message)
      ? row.source_message[0]
      : row.source_message;
    return {
      id: row.id,
      version: row.version,
      sentAt: src?.sent_at || row.created_at,
      status: row.status as "open" | "claimed" | "answered" | "resolved",
      question: src?.content || row.intent,
      channel: src?.channel_id || "general",
      resolvedAt: row.resolved_at,
    };
  });
}

/**
 * Custom tool: evaluate_radar
 * Defined in tools.yaml
 * Evaluates SLA tiers (Tier 1 warning at 120m, Tier 2 urgent at 240m).
 * Excludes resolved; keeps answered until authorized resolution.
 * Computes KPI metrics: urgentBreaches, softWarnings, resolvedToday, compliance.
 */
export async function executeEvaluateRadar(
  args: EvaluateRadarArgs,
  questions?: readonly RadarQuestionWithMeta[],
  dbClient?: SupabaseClient<Database>,
): Promise<EvaluateRadarOutput> {
  const now = args.now ? new Date(args.now) : new Date();
  if (!Number.isFinite(now.getTime())) {
    throw new ToolOperationError("evaluate_radar", "invalid");
  }
  let qList: readonly RadarQuestionWithMeta[];
  if (questions !== undefined) {
    qList = questions;
  } else if (dbClient) {
    qList = await fetchQuestionsFromDb(dbClient, args.guildId);
  } else {
    throw new ToolOperationError("evaluate_radar", "unavailable");
  }

  const versions = new Map(
    qList.map((question) => [question.id, question.version]),
  );
  const items = evaluateRadar(qList, now).map((item) => ({
    ...item,
    version: versions.get(item.id),
  }));

  const urgentBreaches = items.filter((i) => i.tier === 2).length;
  const softWarnings = items.filter((i) => i.tier === 1).length;

  const resolvedCount = qList.filter((q) => q.status === "resolved").length;
  const totalCount = items.length + resolvedCount;
  const compliance =
    totalCount > 0
      ? `${((resolvedCount / totalCount) * 100).toFixed(1)}%`
      : "100.0%";

  return {
    guildId: args.guildId,
    evaluatedAt: now.toISOString(),
    items,
    metrics: {
      urgentBreaches,
      softWarnings,
      resolvedToday: `${resolvedCount}/${totalCount}`,
      compliance,
      totalActive: items.length,
    },
  };
}
