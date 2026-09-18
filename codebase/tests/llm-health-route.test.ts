import { describe, expect, it, vi } from "vitest";
import { createLlmHealthHandler } from "../app/api/health/llm/handler";

const configuredModel = {
  provider: "gemini" as const,
  modelId: "gemini-3.5-flash-lite",
  model: {} as never,
};

describe("server-managed LLM health route", () => {
  it("rejects unauthenticated probes before resolving provider configuration", async () => {
    const resolveModel = vi.fn(() => configuredModel);
    const handler = createLlmHealthHandler({
      authorize: async () => false,
      resolveModel,
      probe: vi.fn(),
    });

    const response = await handler(
      new Request("http://localhost/api/health/llm", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    expect(resolveModel).not.toHaveBeenCalled();
  });

  it("rejects client-supplied API keys, providers, and model IDs", async () => {
    const handler = createLlmHealthHandler({
      authorize: async () => true,
      resolveModel: () => configuredModel,
      probe: vi.fn(),
    });

    const response = await handler(
      new Request("http://localhost/api/health/llm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "openrouter",
          model: "attacker/model",
          apiKey: "client-secret",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "LLM configuration is managed by the server",
    });
  });

  it("reports the server-selected provider and model after a successful probe", async () => {
    const probe = vi.fn().mockResolvedValue(undefined);
    const handler = createLlmHealthHandler({
      authorize: async () => true,
      resolveModel: () => configuredModel,
      probe,
      now: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(137),
    });

    const response = await handler(
      new Request("http://localhost/api/health/llm", { method: "POST" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
      latencyMs: 37,
    });
    expect(probe).toHaveBeenCalledOnce();
  });

  it("returns service unavailable without exposing provider errors or secrets", async () => {
    const handler = createLlmHealthHandler({
      authorize: async () => true,
      resolveModel: () => configuredModel,
      probe: vi.fn().mockRejectedValue(new Error("key sk-private is invalid")),
    });

    const response = await handler(
      new Request("http://localhost/api/health/llm", { method: "POST" }),
    );

    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("sk-private");
  });
});
