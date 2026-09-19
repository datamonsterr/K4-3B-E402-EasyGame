import { describe, expect, it, vi } from "vitest";
import { createAnswerHandler } from "../../app/api/demo/answer/handler";
import { createRoleHandler } from "../../app/api/auth/role/handler";
import { GET as startOAuth } from "../../app/api/auth/oauth/route";
import {
  resolveActorContext,
  type AuthMembershipSource,
} from "../../app/backend/auth/context";

const postAnswer = (body: unknown) =>
  new Request("http://localhost/api/demo/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const source = (
  userId: string | null,
  memberships: ReadonlyArray<{
    userId: string;
    guildId: string;
    role: "learner" | "lab_coach";
  }>,
): AuthMembershipSource => ({
  getAuthenticatedUserId: async () => userId,
  listMemberships: async () => memberships,
});

describe("US-B3 AC1 — authenticated authority", () => {
  it("accepts the only public answer input and uses the server actor", async () => {
    const execute = vi.fn(async () => ({
      runId: "11111111-1111-4111-8111-111111111111",
      answer: {
        status: "clarify" as const,
        body: "Which lab are you asking about?",
        source: null,
        decisionSummary: "Clarifying topic",
      },
    }));
    const handler = createAnswerHandler({
      openContext: async () => ({
        type: "ready",
        actor: { userId: "u" as never, guildId: "g" as never, role: "learner" },
        execute,
      }),
    });

    expect(
      (await handler(postAnswer({ query: "When is the deadline?" }))).status,
    ).toBe(200);
    expect(execute).toHaveBeenCalledWith({
      actor: { userId: "u", guildId: "g", role: "learner" },
      guildId: "g",
      message: "When is the deadline?",
      history: undefined,
    });
  });

  it.each([
    ["role", { query: "When?", role: "lab_coach" }],
    ["guild", { query: "When?", guildId: "other" }],
    ["provider", { query: "When?", provider: "gemini" }],
    ["key", { query: "When?", apiKey: "secret" }],
    ["confidence", { query: "When?", confidence: 1 }],
  ])("rejects caller-supplied %s authority", async (_label, body) => {
    const handler = createAnswerHandler({
      openContext: async () => ({ type: "unauthenticated" }),
    });
    expect((await handler(postAnswer(body))).status).toBe(400);
  });

  it("rejects an unauthenticated actor before membership lookup", async () => {
    const listMemberships = vi.fn(async () => []);
    const result = await resolveActorContext({
      getAuthenticatedUserId: async () => null,
      listMemberships,
    });
    expect(result).toEqual({ type: "unauthenticated" });
    expect(listMemberships).not.toHaveBeenCalled();
  });

  it("rejects an authenticated actor with no provisioned membership", async () => {
    expect(await resolveActorContext(source("u", []))).toEqual({
      type: "forbidden",
    });
  });

  it("rejects an actor with ambiguous multiple guild memberships", async () => {
    expect(
      await resolveActorContext(
        source("u", [
          { userId: "u", guildId: "g1", role: "learner" },
          { userId: "u", guildId: "g2", role: "lab_coach" },
        ]),
      ),
    ).toEqual({ type: "forbidden" });
  });

  it("derives the actor from exactly one trusted membership", async () => {
    expect(
      await resolveActorContext(
        source("u", [{ userId: "u", guildId: "g", role: "lab_coach" }]),
      ),
    ).toEqual({
      type: "ready",
      actor: { userId: "u", guildId: "g", role: "lab_coach" },
    });
  });

  it("denies authenticated membership self-provisioning without a database write", async () => {
    const writeMembership = vi.fn();
    const handler = createRoleHandler({
      getAuthenticatedUserId: async () => "u",
      writeMembership,
    });
    const response = await handler(
      new Request("http://localhost/api/auth/role", {
        method: "POST",
        body: JSON.stringify({ role: "lab_coach", guildId: "g" }),
      }),
    );
    expect(response.status).toBe(403);
    expect(writeMembership).not.toHaveBeenCalled();
  });

  it("does not propagate a caller-selected role through OAuth", async () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "synthetic-test-key";
    try {
      const response = await startOAuth(
        new Request(
          "http://localhost:3000/api/auth/oauth?provider=google&role=lab_coach&next=/workspace",
        ),
      );
      const authorizationUrl = new URL(response.headers.get("location") ?? "");
      const callbackUrl = new URL(
        authorizationUrl.searchParams.get("redirect_to") ?? "",
      );
      expect(callbackUrl.searchParams.has("role")).toBe(false);
      expect(callbackUrl.searchParams.get("next")).toBe("/workspace");
    } finally {
      if (originalUrl === undefined)
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey === undefined)
        delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    }
  });
});
