import { describe, expect, it } from "vitest";
import { createAnswerHandler } from "../app/api/demo/answer/handler";

const post = (body: unknown, headers?: HeadersInit) =>
  new Request("http://localhost/api/demo/answer", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("createAnswerHandler", () => {
  it.each([
    { query: "When is Lab 1 due?", guildId: "attacker" },
    { query: "When is Lab 1 due?", role: "lab_coach" },
    { query: "When is Lab 1 due?", apiKey: "secret" },
    { query: "When is Lab 1 due?", provider: "openai" },
    { query: "When is Lab 1 due?", confidence: 1 },
  ])("rejects caller authority and provider fields", async (body) => {
    const handler = createAnswerHandler({
      openContext: async () => ({ type: "unauthenticated" }),
    });
    expect((await handler(post(body))).status).toBe(400);
  });

  it.each([
    ["unauthenticated", 401, "UNAUTHENTICATED"],
    ["forbidden", 403, "FORBIDDEN"],
    ["unavailable", 503, "ASSISTANT_UNAVAILABLE"],
  ] as const)("maps %s context failure", async (type, status, code) => {
    const handler = createAnswerHandler({
      openContext: async () => ({ type }),
    });
    const response = await handler(post({ query: "When is Lab 1 due?" }));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({
      error: { code, message: expect.any(String) },
    });
  });

  it("returns only the public result", async () => {
    const handler = createAnswerHandler({
      openContext: async () =>
        ({
          type: "ready",
          actor: { userId: "u", guildId: "g", role: "learner" },
          assistant: {
            answer: async () => ({
              status: "answered",
              body: "Verified answer.",
              source: { label: "Notice", href: "/sources/n", kind: "pack" },
              decisionSummary: "Selected latest verified guild notice",
            }),
          },
        }) as never,
    });
    const response = await handler(post({ query: "When is Lab 1 due?" }));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(json).toEqual(
      expect.objectContaining({ status: "answered", body: "Verified answer." }),
    );
    expect(JSON.stringify(json)).not.toMatch(
      /thoughtProcess|toolInvocations|apiKey|providerPayload/,
    );
  });

  it("rejects invalid JSON", async () => {
    const handler = createAnswerHandler({
      openContext: async () => ({ type: "unauthenticated" }),
    });
    const response = await handler(
      new Request("http://localhost/api/demo/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-valid-json",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_REQUEST", message: expect.any(String) },
    });
  });

  it("rejects over-8-KiB input", async () => {
    const handler = createAnswerHandler({
      openContext: async () => ({ type: "unauthenticated" }),
    });
    const largeBody = { query: "a".repeat(8193) };
    const response = await handler(post(largeBody));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_REQUEST", message: expect.any(String) },
    });
  });

  it("rejects empty query", async () => {
    const handler = createAnswerHandler({
      openContext: async () => ({ type: "unauthenticated" }),
    });
    const response = await handler(post({ query: "   " }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_REQUEST", message: expect.any(String) },
    });
  });

  it("maps assistant exception to ASSISTANT_UNAVAILABLE without leaking internal message", async () => {
    const handler = createAnswerHandler({
      openContext: async () =>
        ({
          type: "ready",
          actor: { userId: "u", guildId: "g", role: "learner" },
          assistant: {
            answer: async () => {
              throw new Error(
                "Sensitive DB connection string or internal trace",
              );
            },
          },
        }) as never,
    });
    const response = await handler(post({ query: "When is Lab 1 due?" }));
    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json).toEqual({
      error: {
        code: "ASSISTANT_UNAVAILABLE",
        message:
          "The assistant is temporarily unavailable. Please try again later.",
      },
    });
    expect(JSON.stringify(json)).not.toContain(
      "Sensitive DB connection string",
    );
  });
});
