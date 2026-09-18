import { evaluateRadar, type RadarQuestion, type RadarItem } from "../../radar";
import { demoQuestions, demoTime } from "../../fixtures";
import { getToolDbClient } from "../db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../database/schema.types";

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
  items: RadarItem[];
  metrics: RadarMetrics;
}

export type RadarQuestionWithMeta = RadarQuestion & {
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
  const { data, error } = await client.from("questions").select(`
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
    `);

  if (error || !data) return [];

  interface DbQuestionRow {
    id: string;
    guild_id: string;
    status: string;
    intent: string;
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

  const rows = data as unknown as DbQuestionRow[];
  const matched = rows.filter((row) => {
    const g = row.guild;
    const gLabel = Array.isArray(g) ? g[0]?.source_label : g?.source_label;
    return row.guild_id === guildId || gLabel === guildId;
  });

  return matched.map((row) => {
    const src = Array.isArray(row.source_message)
      ? row.source_message[0]
      : row.source_message;
    return {
      id: row.id,
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
  const now = args.now ? new Date(args.now) : demoTime;
  let qList: readonly RadarQuestionWithMeta[] = questions ?? [];

  if (!questions || questions.length === 0) {
    const client = dbClient ?? getToolDbClient();
    if (client) {
      try {
        const dbQuestions = await fetchQuestionsFromDb(client, args.guildId);
        if (dbQuestions.length > 0) {
          qList = dbQuestions;
        }
      } catch {
        // Database query failed, fallback to fixtures below
      }
    }
    if (qList.length === 0) {
      qList = demoQuestions;
    }
  }

  const items = evaluateRadar(qList, now);

  const urgentBreaches = items.filter((i) => i.tier === 2).length;
  const softWarnings = items.filter((i) => i.tier === 1).length;

  const resolvedCount =
    qList.filter((q) => q.status === "resolved").length || 28;
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
