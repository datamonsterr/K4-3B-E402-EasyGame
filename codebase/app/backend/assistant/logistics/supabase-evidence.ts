import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/backend/database/schema.types";
import type {
  GuildId,
  NoticeEvidenceSource,
  NoticeId,
  VerifiedNotice,
} from "./contracts";
import { ToolOperationError } from "../agent/operation-errors";

type SelectedNoticeRow = {
  id: string;
  guild_id: string;
  topic_key: string;
  published_at: string;
  answer_excerpt: string;
  source_message:
    | {
        source_label: string | null;
        discord_jump_url: string | null;
      }
    | Array<{
        source_label: string | null;
        discord_jump_url: string | null;
      }>
    | null;
};

export function createSupabaseNoticeEvidence(
  client: Pick<SupabaseClient<Database>, "from">,
): NoticeEvidenceSource {
  return {
    async findVerifiedNotices({ guildId, topicKey }) {
      const { data, error } = await client
        .from("notices")
        .select(
          "id,guild_id,topic_key,published_at,answer_excerpt,source_message:source_messages(source_label,discord_jump_url)",
        )
        .eq("guild_id", guildId)
        .eq("topic_key", topicKey)
        .order("published_at", { ascending: false });
      if (error) throw new ToolOperationError("query_notices", "unavailable");

      return ((data ?? []) as unknown as SelectedNoticeRow[]).map((row) => {
        const source = Array.isArray(row.source_message)
          ? row.source_message[0]
          : row.source_message;
        const jump = source?.discord_jump_url;
        return {
          id: row.id as NoticeId,
          guildId: row.guild_id as GuildId,
          topicKey: row.topic_key,
          publishedAt: row.published_at,
          answer: row.answer_excerpt,
          source: jump
            ? {
                label: source?.source_label ?? "Verified notice",
                href: jump,
                kind: "discord" as const,
              }
            : {
                label: source?.source_label ?? "Verified notice",
                href: `/sources/${row.id}`,
                kind: "pack" as const,
              },
        } satisfies VerifiedNotice;
      });
    },
  };
}
