import "server-only";
import {
  configured,
  jobClient,
  sessionClient,
} from "@/backend/database/client";
import { createSupabaseNoticeEvidence } from "./supabase-evidence";
import {
  createAgentModelFromEnvironment,
  createCourseAgent,
  createSupabaseAgentOperations,
} from "../agent";
import {
  AnswerExecutionError,
  type AnswerContextResult,
} from "@/api/demo/answer/handler";
import { resolveActorContext } from "@/backend/auth/context";
import { recordAgentExecution, recordAgentFailure } from "../observability";
import { cookies } from "next/headers";

async function hasSessionCookie(): Promise<boolean> {
  const jar = await cookies();
  return jar
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
}

export async function openAnswerContext(): Promise<AnswerContextResult> {
  try {
    if (!(await hasSessionCookie())) return { type: "unauthenticated" };
  } catch {
    return { type: "unavailable" };
  }

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
  if (!configuredModel) return { type: "unavailable" };
  let observer;
  try {
    observer = jobClient();
  } catch {
    return { type: "unavailable" };
  }
  let agent;
  try {
    agent = createCourseAgent({
      ...configuredModel,
      evidence,
      operations: createSupabaseAgentOperations(client),
    });
  } catch {
    return { type: "unavailable" };
  }

  return {
    type: "ready",
    actor,
    async execute(request) {
      const startedAt = Date.now();
      let run;
      try {
        run = await agent.run(request);
      } catch {
        let failureRunId: string | undefined;
        try {
          failureRunId = await recordAgentFailure(observer, actor, {
            provider: configuredModel.provider,
            model: configuredModel.modelId,
            latencyMs: Date.now() - startedAt,
          });
        } catch {
          // A telemetry outage must not expose or replace the safe API error.
        }
        throw new AnswerExecutionError(failureRunId);
      }
      let runId = `run-${Date.now()}`;
      try {
        runId = await recordAgentExecution(observer, actor, run);
      } catch (telemetryErr) {
        console.warn("Agent run telemetry recording warning:", telemetryErr);
      }
      return { answer: run.answer, runId };
    },
  };
}
