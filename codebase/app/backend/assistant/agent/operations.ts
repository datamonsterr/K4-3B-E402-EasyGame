import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/backend/database/schema.types";
import { evaluateRadar } from "@/backend/radar";
import { fetchQuestionsFromDb } from "@/backend/tools/evaluate_radar/tool";
import { executeFormatDailyDigest } from "@/backend/tools/format_daily_digest/tool";
import { executeSearchWeb } from "@/backend/tools/search_web/tool";
import type { AgentOperations } from "./contracts";

export function createSupabaseAgentOperations(
  client: SupabaseClient<Database>,
): AgentOperations {
  return {
    async evaluateRadar({ guildId, now }) {
      const questions = await fetchQuestionsFromDb(client, guildId);
      const evaluatedAt = now ? new Date(now) : new Date();
      const items = evaluateRadar(questions, evaluatedAt);
      return {
        guildId,
        evaluatedAt: evaluatedAt.toISOString(),
        items,
        urgentBreaches: items.filter((item) => item.tier === 2).length,
        softWarnings: items.filter((item) => item.tier === 1).length,
      };
    },

    async createStaffAlert({ guildId, questionId, tier }) {
      const { data: question, error: questionError } = await client
        .from("questions")
        .select("id,guild_id")
        .eq("id", questionId)
        .eq("guild_id", guildId)
        .maybeSingle();
      if (questionError || !question) throw new Error("Question unavailable");

      const { data, error } = await client
        .from("radar_alerts")
        .insert({
          guild_id: guildId,
          question_id: question.id,
          tier,
          status: "pending",
        })
        .select("id,guild_id,question_id,tier,status,created_at")
        .single();
      if (error || !data) throw new Error("Staff alert unavailable");
      return data;
    },

    async resolveQuestion({ guildId, questionId, expectedVersion }) {
      const { data, error } = await client.rpc("resolve_question", {
        p_question_id: questionId,
        p_expected_version: expectedVersion,
      });
      if (error || !data || data.guild_id !== guildId) {
        throw new Error("Question resolution unavailable");
      }
      return data;
    },

    async formatDailyDigest({ guildId, localDate }) {
      return executeFormatDailyDigest({ guildId, localDate });
    },

    async searchWeb({ query }) {
      return executeSearchWeb(
        { query, maxResults: 5, searchDepth: "basic", includeAnswer: true },
        { allowSyntheticFallback: false },
      );
    },
  };
}
