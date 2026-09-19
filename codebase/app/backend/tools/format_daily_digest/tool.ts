import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../database/schema.types";
import { ToolOperationError } from "../../assistant/agent/operation-errors";

export interface FormatDailyDigestArgs {
  guildId: string;
  localDate: string; // YYYY-MM-DD
}

export interface DailyDigestQuestion {
  status: "open" | "claimed" | "answered" | "resolved";
  topic: string;
}

export interface DailyDigestOutput {
  guildId: string;
  localDate: string;
  title: string;
  sanitizedSummary: string;
  rankedTopics: { rank: number; topic: string; count: number }[];
  metrics: { total: number; resolved: number; backlog: number };
  generatedAt: string;
}

export async function fetchDailyDigestQuestions(
  client: SupabaseClient<Database>,
  guildId: string,
  localDate: string,
): Promise<DailyDigestQuestion[]> {
  const start = new Date(`${localDate}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(localDate) ||
    !Number.isFinite(start.getTime())
  ) {
    throw new ToolOperationError("format_daily_digest", "invalid");
  }
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const { data, error } = await client
    .from("questions")
    .select("status,intent,created_at")
    .eq("guild_id", guildId)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());
  if (error) {
    throw new ToolOperationError("format_daily_digest", "unavailable");
  }
  return (data ?? []).map((row) => ({
    status: row.status as DailyDigestQuestion["status"],
    topic: row.intent,
  }));
}

/**
 * Sanitizes Vietnamese text to prevent legacy anomalies such as "nguồn tham chiếu" tokens
 * being randomly injected into syllables or mid-word truncation.
 * Strips "nguồn tham chiếu" and cleans double/multiple spaces.
 */
export function sanitizeVietnamese(text: string): string {
  if (!text) return "";
  // Strip stray placeholder tokens like "nguồn tham chiếu" (case-insensitive)
  let cleaned = text.replace(/nguồn\s*tham\s*chiếu/gi, "");
  // Replace double spaces
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return cleaned;
}

/**
 * Custom tool: format_daily_digest
 * Defined in tools.yaml
 * Compiles a clean 22:00 daily digest with topic grouping and zero token corruption.
 */
export async function executeFormatDailyDigest(
  args: FormatDailyDigestArgs,
  questions?: readonly DailyDigestQuestion[],
  now: () => Date = () => new Date(),
): Promise<DailyDigestOutput> {
  if (questions === undefined) {
    throw new ToolOperationError("format_daily_digest", "unavailable");
  }
  const counts = new Map<string, number>();
  for (const question of questions) {
    const topic = question.topic.trim() || "unknown";
    counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  const rankedTopics = [...counts.entries()]
    .sort(
      ([leftTopic, leftCount], [rightTopic, rightCount]) =>
        rightCount - leftCount || leftTopic.localeCompare(rightTopic),
    )
    .slice(0, 3)
    .map(([topic, count], index) => ({ rank: index + 1, topic, count }));
  const total = questions.length;
  const resolved = questions.filter(
    (question) => question.status === "resolved",
  ).length;
  const backlog = total - resolved;
  const sanitized = sanitizeVietnamese(
    backlog === 0
      ? `All cohort questions resolved today! Current backlog: 0 questions. Bản tin ca trực 22:00 ngày ${args.localDate}: Đã xử lý ${resolved}/${total} câu hỏi.`
      : `Bản tin ca trực 22:00 ngày ${args.localDate}: Đã xử lý ${resolved}/${total} câu hỏi; còn ${backlog} câu cần theo dõi.`,
  );

  return {
    guildId: args.guildId,
    localDate: args.localDate,
    title: `Clean Daily Digest (22:00 UTC+7) - ${args.localDate}`,
    sanitizedSummary: sanitized,
    rankedTopics,
    metrics: { total, resolved, backlog },
    generatedAt: now().toISOString(),
  };
}
