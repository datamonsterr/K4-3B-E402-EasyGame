import "server-only";
import { configured, sessionClient } from "@/backend/database/client";
import { createSupabaseNoticeEvidence } from "./supabase-evidence";
import { createLogisticsAssistant } from "./assistant";
import type { AnswerContextResult } from "@/api/demo/answer/handler";
import type { Actor, ActorId, GuildId } from "./contracts";

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

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return { type: "unauthenticated" };
  }

  const { data: memberships, error: membershipError } = await client
    .from("memberships")
    .select("guild_id,user_id,role")
    .eq("user_id", user.id)
    .order("guild_id", { ascending: true })
    .limit(2);

  if (membershipError) {
    return { type: "unavailable" };
  }

  if (!memberships || memberships.length !== 1) {
    return { type: "forbidden" };
  }

  const membership = memberships[0];
  if (membership.role !== "learner" && membership.role !== "lab_coach") {
    return { type: "forbidden" };
  }

  const actor: Actor = {
    userId: membership.user_id as ActorId,
    guildId: membership.guild_id as GuildId,
    role: membership.role,
  };

  const evidence = createSupabaseNoticeEvidence(client);
  const assistant = createLogisticsAssistant({ evidence });

  return {
    type: "ready",
    actor,
    assistant,
  };
}
