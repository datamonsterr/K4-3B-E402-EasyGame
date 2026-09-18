import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createCourseAgent } from "../../app/backend/assistant/agent/agent";
import { createAgentModel } from "../../app/backend/assistant/agent/models";
import { createSupabaseNoticeEvidence } from "../../app/backend/assistant/logistics/supabase-evidence";
import type {
  Actor,
  ActorId,
  GuildId,
} from "../../app/backend/assistant/logistics/contracts";
import type { Database } from "../../app/backend/database/schema.types";

const liveDescribe =
  process.env.RUN_LIVE_AGENT_TESTS === "1" ? describe : describe.skip;

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function localLearnerToken(secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = encode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encode(
    JSON.stringify({
      aud: "authenticated",
      exp: now + 3600,
      iat: now,
      iss: "supabase-demo",
      role: "authenticated",
      sub: "00000000-0000-0000-0000-000000000001",
    }),
  );
  const signature = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

liveDescribe("live AI SDK agent with local Supabase", () => {
  it("observes a real Gemini decision → database tool call → result flow", async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!supabaseUrl || !publishableKey || !geminiKey) {
      throw new Error(
        "Live verification requires local Supabase URL/publishable key and GEMINI_API_KEY",
      );
    }
    if (!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(supabaseUrl)) {
      throw new Error("Live verification is restricted to local Supabase");
    }

    const token = localLearnerToken(
      process.env.SUPABASE_JWT_SECRET ||
        "super-secret-jwt-token-with-at-least-32-characters-long",
    );
    const client = createClient<Database>(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: memberships, error } = await client
      .from("memberships")
      .select("guild_id,user_id,role");
    expect(error).toBeNull();
    expect(memberships).toHaveLength(1);

    const membership = memberships![0];
    if (membership.role !== "learner" && membership.role !== "lab_coach") {
      throw new Error("Local membership has an unsupported role");
    }
    const actor: Actor = {
      userId: membership.user_id as ActorId,
      guildId: membership.guild_id as GuildId,
      role: membership.role,
    };
    const configured = createAgentModel({
      provider: "gemini",
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    });
    const run = await createCourseAgent({
      ...configured,
      evidence: createSupabaseNoticeEvidence(client),
    }).run({
      actor,
      guildId: actor.guildId,
      message: "What is the latest verified Lab 1 deadline?",
    });

    expect(run.trace.map((event) => event.type)).toEqual([
      "decision",
      "tool_call",
      "observation",
    ]);
    expect(run.trace[1]).toMatchObject({ tool: "query_notices" });
    expect(run.answer).toMatchObject({
      status: "answered",
      body: "Lab 1 deadline is extended to 12:00 on September 19, 2026.",
    });
    expect(JSON.stringify(run)).not.toMatch(
      /api[_-]?key|providerPayload|chain.of.thought|raw reasoning/i,
    );

    console.info(
      "Live agent verification",
      JSON.stringify({
        provider: run.provider,
        model: run.model,
        status: run.answer.status,
        events: run.trace.map((event) => ({
          type: event.type,
          tool: "tool" in event ? event.tool : undefined,
        })),
      }),
    );
  }, 60_000);
});
