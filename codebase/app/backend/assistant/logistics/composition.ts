import "server-only";
import { configured, sessionClient } from "@/backend/database/client";
import { createSupabaseNoticeEvidence } from "./supabase-evidence";
import { createLogisticsAssistant } from "./assistant";
import {
  createAgentModelFromEnvironment,
  createCourseAgent,
  createSupabaseAgentOperations,
} from "../agent";
import type { AnswerContextResult } from "@/api/demo/answer/handler";
import { resolveActorContext } from "@/backend/auth/context";

export async function openAnswerContext(): Promise<AnswerContextResult> {
  if (!configured()) {
    return { type: "unavailable" };
  }

  let client;
  try {
    client = await sessionClient();
  } catch {
    return { type: "unavailable" };
  }

  let actorContext;
  try {
    actorContext = await resolveActorContext({
      async getAuthenticatedUserId() {
        const {
          data: { user },
          error,
        } = await client.auth.getUser();
        return error || !user ? null : user.id;
      },
      async listMemberships(userId) {
        const { data, error } = await client
          .from("memberships")
          .select("guild_id,user_id,role")
          .eq("user_id", userId)
          .order("guild_id", { ascending: true })
          .limit(2);
        if (error) throw error;
        return (data ?? []).map((membership) => ({
          userId: membership.user_id,
          guildId: membership.guild_id,
          role: membership.role,
        }));
      },
    });
  } catch {
    return { type: "unavailable" };
  }

  if (actorContext.type !== "ready") return actorContext;
  const { actor } = actorContext;

  const evidence = createSupabaseNoticeEvidence(client);
  const configuredModel = createAgentModelFromEnvironment();
  const assistant = configuredModel
    ? {
        async answer(
          request: Parameters<
            ReturnType<typeof createLogisticsAssistant>["answer"]
          >[0],
        ) {
          return (
            await createCourseAgent({
              ...configuredModel,
              evidence,
              operations: createSupabaseAgentOperations(client),
            }).run(request)
          ).answer;
        },
      }
    : createLogisticsAssistant({ evidence });

  return {
    type: "ready",
    actor,
    assistant,
  };
}
