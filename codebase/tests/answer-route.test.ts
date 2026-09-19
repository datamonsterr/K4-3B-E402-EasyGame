import { describe, expect, it, vi } from "vitest";
import {
  AnswerExecutionError,
  createAnswerHandler,
} from "../app/api/demo/answer/handler";

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
          execute: async () => ({
            runId: "11111111-1111-4111-8111-111111111111",
            answer: {
              status: "answered",
              body: "Verified answer.",
              source: { label: "Notice", href: "/sources/n", kind: "pack" },
              decisionSummary: "Selected latest verified guild notice",
            },
          }),
        }) as never,
    });
    const response = await handler(post({ query: "When is Lab 1 due?" }));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-easygame-run-id")).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(json).toEqual(
      expect.objectContaining({ status: "answered", body: "Verified answer." }),
    );
    expect(JSON.stringify(json)).not.toMatch(
      /thoughtProcess|toolInvocations|apiKey|providerPayload/,
    );
  });

  it("accepts bounded alternating public history without authority fields", async () => {
    const execute = vi.fn(async () => ({
      runId: "11111111-1111-4111-8111-111111111111",
      answer: {
        status: "clarify" as const,
        body: "Bạn hỏi Lab nào?",
        source: null,
        decisionSummary: "Clarify",
      },
    }));
    const handler = createAnswerHandler({
      openContext: async () =>
        ({
          type: "ready",
          actor: { userId: "u", guildId: "g", role: "learner" },
          execute,
        }) as never,
    });
    const response = await handler(
      post({
        query: "Lab 2",
        history: [
          { role: "user", content: "Hạn nộp là khi nào?" },
          { role: "assistant", content: "Bạn hỏi Lab nào?" },
        ],
      }),
    );
    expect(response.status).toBe(200);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ history: expect.any(Array) }),
    );
  });

  it.each([
    [{ query: "Lab 1", history: [{ role: "tool", content: "secret" }] }],
    [
      {
        query: "Lab 1",
        history: [{ role: "assistant", content: "starts wrong" }],
      },
    ],
    [
      {
        query: "Lab 1",
        history: [{ role: "user", content: "a", guildId: "g" }],
      },
    ],
    [
      {
        query: "Lab 1",
        history: [{ role: "user", content: "unfinished prior turn" }],
      },
    ],
  ])("rejects unsafe conversation history", async (body) => {
    const handler = createAnswerHandler({
      openContext: async () => ({ type: "unauthenticated" }),
    });
    expect((await handler(post(body))).status).toBe(400);
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
          execute: async () => {
            throw new AnswerExecutionError(
              "11111111-1111-4111-8111-111111111111",
            );
          },
        }) as never,
    });
    const response = await handler(post({ query: "When is Lab 1 due?" }));
    expect(response.status).toBe(503);
    expect(response.headers.get("x-easygame-run-id")).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    const json = await response.json();
    expect(json).toEqual({
      error: {
        code: "ASSISTANT_UNAVAILABLE",
        message:
          "The assistant is temporarily unavailable. Please try again later.",
      },
    });
    expect(JSON.stringify(json)).not.toContain("internal trace");
  });
});
