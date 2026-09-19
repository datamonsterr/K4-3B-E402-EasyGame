import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/backend/database/schema.types";
import {
  executeFormatDailyDigest,
  fetchDailyDigestQuestions,
} from "@/backend/tools/format_daily_digest/tool";
import { executeSearchWeb } from "@/backend/tools/search_web/tool";
import type { AgentOperations } from "./contracts";
import { ToolOperationError } from "./operation-errors";

type DatabaseError = { code?: string } | null;

function databaseError(
  operation: string,
  error: DatabaseError,
): ToolOperationError {
  const kind =
    error?.code === "42501"
      ? "forbidden"
      : error?.code === "40001" || error?.code === "23505"
        ? "conflict"
        : error?.code === "22023"
          ? "invalid"
          : "unavailable";
  return new ToolOperationError(operation, kind);
}

export function createSupabaseAgentOperations(
  client: SupabaseClient<Database>,
  clock: () => Date = () => new Date(),
): AgentOperations {
  return {
    async evaluateRadar({ guildId }) {
      const { data, error } = await client.rpc("list_radar_items");
      if (error) throw databaseError("evaluate_radar", error);
      const items = (data ?? []).map((row) => ({
        id: row.question_id,
        questionId: row.question_id,
        status: row.status,
        version: row.version,
        tier: row.tier,
      }));
      const urgentBreaches = items.filter((item) => item.tier === 2).length;
      const softWarnings = items.filter((item) => item.tier === 1).length;
      return {
        guildId,
        items,
        urgentBreaches,
        softWarnings,
      };
    },

    async createStaffAlert({
      guildId,
      questionId,
      tier,
      summary,
      idempotencyKey,
    }) {
      const { data, error } = await client.rpc("create_staff_alert", {
        p_question_id: questionId,
        p_tier: tier,
        p_summary: summary,
        p_idempotency_key: idempotencyKey ?? `${questionId}:radar-tier-${tier}`,
      });
      if (error) throw databaseError("create_staff_alert", error);
      if (!data || data.guild_id !== guildId) {
        throw new ToolOperationError("create_staff_alert", "forbidden");
      }
      return data;
    },

    async resolveQuestion({ guildId, questionId, expectedVersion }) {
      const { data, error } = await client.rpc("resolve_question", {
        p_question_id: questionId,
        p_expected_version: expectedVersion,
      });
      if (error) throw databaseError("resolve_question", error);
      if (!data || data.guild_id !== guildId) {
        throw new ToolOperationError("resolve_question", "forbidden");
      }
      return data;
    },

    async formatDailyDigest({ guildId, localDate }) {
      const questions = await fetchDailyDigestQuestions(
        client,
        guildId,
        localDate,
      );
      return executeFormatDailyDigest({ guildId, localDate }, questions, clock);
    },

    async searchWeb({ query }) {
      return executeSearchWeb(
        { query, maxResults: 5, searchDepth: "basic", includeAnswer: true },
        { allowSyntheticFallback: false },
      );
    },
  };
}
