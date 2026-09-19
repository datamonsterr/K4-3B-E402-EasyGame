import { describe, expect, it } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { createCourseAgent } from "../../app/backend/assistant/agent/agent";
import {
  createAgentModel,
  resolveModelConfig,
} from "../../app/backend/assistant/agent/models";
import type {
  Actor,
  GuildId,
  VerifiedNotice,
} from "../../app/backend/assistant/logistics/contracts";

const usage = {
  inputTokens: {
    total: 4,
    noCache: 4,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 4, text: 4, reasoning: undefined },
};
const actor = {
  userId: "learner-1",
  guildId: "guild-a",
  role: "learner",
} as Actor;
const verifiedNotice: VerifiedNotice = {
  id: "notice-1" as never,
  guildId: "guild-a" as GuildId,
  topicKey: "lab-1",
  publishedAt: "2026-09-18T10:00:00Z",
  answer: "Lab 1 is due at noon tomorrow.",
  source: { kind: "pack", label: "Verified", href: "/sources/notice-1" },
};
const request = {
  actor,
  guildId: "guild-a" as GuildId,
  message: "When is Lab 1 due?",
};

describe("US-B3 AC5 — provider portability and resiliency", () => {
  it("defaults Gemini to gemini-3.5-flash-lite", () => {
    expect(
      resolveModelConfig({ provider: "gemini", apiKey: "test-key" }),
    ).toEqual({
      provider: "gemini",
      apiKey: "test-key",
      modelId: "gemini-3.5-flash-lite",
    });
  });

  it("accepts a custom Gemini model ID", () => {
    expect(
      resolveModelConfig({
        provider: "gemini",
        apiKey: "test-key",
        model: "gemini-3.5-pro",
      }),
    ).toMatchObject({ modelId: "gemini-3.5-pro" });
  });

  it("defaults OpenRouter to the Gemini 3.5 Flash Lite route", () => {
    expect(
      resolveModelConfig({ provider: "openrouter", apiKey: "test-key" }),
    ).toMatchObject({
      modelId: "google/gemini-3.5-flash-lite",
    });
  });

  it("accepts a custom OpenRouter model ID", () => {
    expect(
      resolveModelConfig({
        provider: "openrouter",
        apiKey: "test-key",
        model: "anthropic/claude-sonnet-4.6",
      }),
    ).toMatchObject({ modelId: "anthropic/claude-sonnet-4.6" });
  });

  it("creates an AI SDK Gemini model without exposing the key", () => {
    const configured = createAgentModel({
      provider: "gemini",
      apiKey: "gemini-secret",
    });
    expect(configured.model.provider).toContain("google");
    expect(configured.model.modelId).toBe("gemini-3.5-flash-lite");
    expect(JSON.stringify(configured)).not.toContain("gemini-secret");
  });

  it("creates an AI SDK OpenRouter model without exposing the key", () => {
    const configured = createAgentModel({
      provider: "openrouter",
      apiKey: "router-secret",
    });
    expect(configured.model.provider).toContain("openrouter");
    expect(configured.model.modelId).toBe("google/gemini-3.5-flash-lite");
    expect(JSON.stringify(configured)).not.toContain("router-secret");
  });

  it.each(["gemini", "openrouter"] as const)(
    "rejects a missing %s server key",
    (provider) => {
      expect(() => resolveModelConfig({ provider, apiKey: "" })).toThrow(
        "API key",
      );
    },
  );

  it("fails closed when the provider fails before evidence is observed", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error("provider payload with secret details");
      },
    });
    await expect(
      createCourseAgent({
        model,
        evidence: { findVerifiedNotices: async () => [verifiedNotice] },
      }).run(request),
    ).rejects.toThrow("provider payload with secret details");
  });

  it("does not substitute deterministic evidence when the provider fails after observation", async () => {
    let calls = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        calls += 1;
        if (calls === 1)
          return {
            content: [
              {
                type: "tool-call" as const,
                toolCallId: "call-1",
                toolName: "query_notices",
                input: JSON.stringify({ topicKey: "lab-1" }),
              },
            ],
            finishReason: { unified: "tool-calls" as const, raw: undefined },
            usage,
            warnings: [],
          };
        throw new Error("quota exhausted with raw provider payload");
      },
    });
    await expect(
      createCourseAgent({
        model,
        evidence: { findVerifiedNotices: async () => [verifiedNotice] },
      }).run(request),
    ).rejects.toThrow("quota exhausted");
  });
});
