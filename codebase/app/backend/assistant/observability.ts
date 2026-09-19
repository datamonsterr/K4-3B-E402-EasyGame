import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/backend/database/schema.types";
import type { CourseAgentRun } from "./agent/contracts";
import type { Actor } from "./logistics/contracts";

const UNSAFE =
  /bearer\s|eyJ[a-zA-Z0-9_-]+\.|password|api[_-]?key|access[_-]?token|cookie|thought\s*process|chain.?of.?thought|raw.?provider/i;

function bounded(value: string, max = 500): string {
  const text = value.trim();
  if (!text || Array.from(text).length > max || UNSAFE.test(text)) {
    throw new Error("Unsafe observability value");
  }
  return text;
}

type RunEvidence = {
  status: string;
  latencyMs: number;
  decisionSummary: string;
  noticeId?: string;
  provider: string;
  model: string;
  providerAttempted: boolean;
  providerSucceeded: boolean;
  events: Json;
};

async function recordRunEvidence(
  client: SupabaseClient<Database>,
  actor: Actor,
  evidence: RunEvidence,
): Promise<string> {
  const rpc = client.rpc as unknown as (
    name: string,
    args: Record<string, Json | undefined>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
  const { data, error } = await rpc("record_agent_run", {
    p_actor_id: actor.userId,
    p_guild_id: actor.guildId,
    p_status: evidence.status,
    p_artifact_version: "v0",
    p_latency_ms: evidence.latencyMs,
    p_decision_summary: bounded(evidence.decisionSummary),
    p_notice_id: evidence.noticeId ?? null,
    p_provider: bounded(evidence.provider, 40),
    p_model: bounded(evidence.model, 100),
    p_provider_attempted: evidence.providerAttempted,
    p_provider_succeeded: evidence.providerSucceeded,
    p_events: evidence.events,
  });
  if (error || typeof data !== "string") {
    throw new Error("Agent run evidence could not be recorded");
  }
  return data;
}

export async function recordAgentExecution(
  client: SupabaseClient<Database>,
  actor: Actor,
  run: CourseAgentRun,
): Promise<string> {
  const events = run.trace.map((event) => ({
    type: event.type,
    ...(event.type === "decision" ? {} : { tool: bounded(event.tool, 64) }),
    summary: bounded(event.summary),
  }));
  return recordRunEvidence(client, actor, {
    status: run.answer.status,
    latencyMs: run.latencyMs,
    decisionSummary: run.answer.decisionSummary,
    noticeId: run.selectedNoticeId,
    provider: run.provider,
    model: run.model,
    providerAttempted: run.providerAttempted,
    providerSucceeded: run.providerSucceeded,
    events: events as unknown as Json,
  });
}

export async function recordAgentFailure(
  client: SupabaseClient<Database>,
  actor: Actor,
  failure: { provider: string; model: string; latencyMs: number },
): Promise<string> {
  const summary = "Agent execution failed";
  return recordRunEvidence(client, actor, {
    status: "error",
    latencyMs: Math.max(0, failure.latencyMs),
    decisionSummary: summary,
    provider: failure.provider,
    model: failure.model,
    providerAttempted: true,
    providerSucceeded: false,
    events: [{ type: "decision", summary }] as unknown as Json,
  });
}
