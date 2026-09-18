import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  runAgent,
  validateLlmConnection,
  isQuotaOrTimeoutError,
} from "../app/backend/assistant";

describe("Multi-Provider LLM & Resiliency Engine", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  describe("Provider routing & Request formation", () => {
    it("routes to OpenAI endpoint with correct Bearer header and tools", async () => {
      let interceptedUrl = "";
      let interceptedHeaders: Record<string, string> = {};
      let interceptedBody: Record<string, unknown> = {};

      globalThis.fetch = vi.fn().mockImplementation(async (url, init) => {
        interceptedUrl = String(url);
        interceptedHeaders = init?.headers as Record<string, string>;
        interceptedBody = JSON.parse(String(init?.body));

        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  role: "assistant",
                  content:
                    "Thông báo mới nhất: Hạn nộp bài Lab 1 đã được gia hạn đến 12:00 ngày 19/09/2026.",
                  tool_calls: null,
                },
              },
            ],
          }),
        } as unknown as Response;
      });

      const result = await runAgent({
        query: "Deadline Lab 1 mấy giờ?",
        guildId: "demo",
        provider: "openai",
        apiKey: "sk-openai-test-key",
        model: "gpt-4o-mini",
        offlineMode: false,
      });

      expect(interceptedUrl).toBe("https://api.openai.com/v1/chat/completions");
      expect(interceptedHeaders.Authorization).toBe(
        "Bearer sk-openai-test-key",
      );
      expect(interceptedBody.model).toBe("gpt-4o-mini");
      expect(Array.isArray(interceptedBody.tools)).toBe(true);
      expect(result.status).toBe("answered");
      expect(result.text).toContain("12:00 ngày 19/09/2026");
      expect(result.telemetry.provider).toBe("openai");
      expect(result.telemetry.model).toBe("gpt-4o-mini");
    });

    it("routes to OpenRouter endpoint with HTTP-Referer and X-Title headers", async () => {
      let interceptedUrl = "";
      let interceptedHeaders: Record<string, string> = {};

      globalThis.fetch = vi.fn().mockImplementation(async (url, init) => {
        interceptedUrl = String(url);
        interceptedHeaders = init?.headers as Record<string, string>;

        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  role: "assistant",
                  content:
                    "Thông báo mới nhất: Hạn nộp bài Lab 1 đã được gia hạn đến 12:00 ngày 19/09/2026.",
                  tool_calls: null,
                },
              },
            ],
          }),
        } as unknown as Response;
      });

      const result = await runAgent({
        query: "Deadline Lab 1 mấy giờ?",
        guildId: "demo",
        provider: "openrouter",
        apiKey: "sk-or-test-key",
        offlineMode: false,
      });

      expect(interceptedUrl).toBe(
        "https://openrouter.ai/api/v1/chat/completions",
      );
      expect(interceptedHeaders.Authorization).toBe("Bearer sk-or-test-key");
      expect(interceptedHeaders["HTTP-Referer"]).toBe(
        "https://easygame.vinuni.edu.vn",
      );
      expect(interceptedHeaders["X-Title"]).toBe("EasyGame Assistant");
      expect(result.telemetry.provider).toBe("openrouter");
    });

    it("routes to Gemini endpoint with API key in query params", async () => {
      let interceptedUrl = "";

      globalThis.fetch = vi.fn().mockImplementation(async (url) => {
        interceptedUrl = String(url);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  role: "model",
                  parts: [
                    {
                      text: "Thông báo mới nhất: Hạn nộp bài Lab 1 đã được gia hạn đến 12:00 ngày 19/09/2026.",
                    },
                  ],
                },
              },
            ],
          }),
        } as unknown as Response;
      });

      const result = await runAgent({
        query: "Deadline Lab 1 mấy giờ?",
        guildId: "demo",
        provider: "gemini",
        apiKey: "AIzaSyTestKey",
        model: "gemini-2.5-flash",
        offlineMode: false,
      });

      expect(interceptedUrl).toContain("generativelanguage.googleapis.com");
      expect(interceptedUrl).toContain("key=AIzaSyTestKey");
      expect(interceptedUrl).toContain("gemini-2.5-flash");
      expect(result.telemetry.provider).toBe("gemini");
    });

    it("falls back to environment variables when provider and key are not in options", async () => {
      process.env.OPENAI_API_KEY = "sk-env-openai-key";
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      let interceptedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
        interceptedHeaders = init?.headers as Record<string, string>;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  role: "assistant",
                  content: "Grounded answer from env-configured OpenAI.",
                },
              },
            ],
          }),
        } as unknown as Response;
      });

      const result = await runAgent({
        query: "Deadline nộp bài Lab 1 là mấy giờ?",
        offlineMode: false,
      });

      expect(interceptedHeaders.Authorization).toBe("Bearer sk-env-openai-key");
      expect(result.telemetry.provider).toBe("openai");
    });
  });

  describe("Robust Quota & Timeout Handling", () => {
    it("identifies quota and timeout error codes and strings correctly", () => {
      expect(isQuotaOrTimeoutError(429)).toBe(true);
      expect(isQuotaOrTimeoutError(408)).toBe(true);
      expect(isQuotaOrTimeoutError(504)).toBe(true);
      expect(isQuotaOrTimeoutError(200, "RESOURCE_EXHAUSTED")).toBe(true);
      expect(isQuotaOrTimeoutError(400, "insufficient_quota")).toBe(true);
      expect(isQuotaOrTimeoutError(400, "Rate limit reached")).toBe(true);
      expect(
        isQuotaOrTimeoutError(undefined, "Request timed out after 15s"),
      ).toBe(true);
      expect(isQuotaOrTimeoutError(undefined, "AbortError")).toBe(true);
      expect(isQuotaOrTimeoutError(200, "ok")).toBe(false);
      expect(isQuotaOrTimeoutError(500, "server crash")).toBe(false);
    });

    it("gracefully falls back on HTTP 429 without throwing 500 error", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () =>
          JSON.stringify({ error: { message: "Rate limit exceeded" } }),
      } as Response);

      const result = await runAgent({
        query: "Deadline nộp bài Lab 1 là mấy giờ?",
        guildId: "demo",
        provider: "openai",
        apiKey: "sk-rate-limited",
        offlineMode: false,
      });

      expect(result.status).toBe("answered");
      expect(result.text).toContain("12:00");
      expect(result.source).toBeDefined();
      expect(result.telemetry.fallbackReason).toContain(
        "Notice: LLM quota reached or timed out; executed deterministic grounded resolution from verified notices",
      );
      expect(result.telemetry.thoughtProcess[0]).toContain(
        "Notice: LLM quota reached or timed out",
      );
    });

    it("gracefully falls back on Gemini RESOURCE_EXHAUSTED without throwing 500 error", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            error: {
              code: 429,
              message: "Resource has been exhausted (e.g. check quota).",
              status: "RESOURCE_EXHAUSTED",
            },
          }),
      } as Response);

      const result = await runAgent({
        query: "Deadline nộp bài Lab 1 là mấy giờ?",
        guildId: "demo",
        provider: "gemini",
        apiKey: "AIzaSyQuotaExhausted",
        offlineMode: false,
      });

      expect(result.status).toBe("answered");
      expect(result.text).toContain("12:00");
      expect(result.telemetry.fallbackReason).toContain(
        "Notice: LLM quota reached or timed out; executed deterministic grounded resolution from verified notices",
      );
    });

    it("gracefully falls back on OpenAI insufficient_quota without throwing 500 error", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () =>
          JSON.stringify({
            error: {
              message:
                "You exceeded your current quota, please check your plan and billing details.",
              type: "insufficient_quota",
              code: "insufficient_quota",
            },
          }),
      } as Response);

      const result = await runAgent({
        query: "Deadline nộp bài Lab 1 là mấy giờ?",
        guildId: "demo",
        provider: "openrouter",
        apiKey: "sk-no-credits",
        offlineMode: false,
      });

      expect(result.status).toBe("answered");
      expect(result.text).toContain("12:00");
      expect(result.telemetry.fallbackReason).toContain(
        "Notice: LLM quota reached or timed out; executed deterministic grounded resolution from verified notices",
      );
    });

    it("gracefully falls back on AbortController 15s timeout without throwing 500 error", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(
        new (class extends Error {
          name = "AbortError";
          message = "Request timed out after 15s";
        })(),
      );

      const result = await runAgent({
        query: "Deadline nộp bài Lab 1 là mấy giờ?",
        guildId: "demo",
        provider: "gemini",
        apiKey: "AIzaSyTimeout",
        offlineMode: false,
      });

      expect(result.status).toBe("answered");
      expect(result.text).toContain("12:00");
      expect(result.telemetry.fallbackReason).toContain(
        "Notice: LLM quota reached or timed out; executed deterministic grounded resolution from verified notices",
      );
    });
  });

  describe("validateLlmConnection service function", () => {
    it("validates key with lightweight 1-token prompt and returns ok: true on success", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "pong" } }],
        }),
      } as Response);

      const res = await validateLlmConnection({
        provider: "openai",
        apiKey: "sk-valid-key",
        model: "gpt-4o-mini",
      });
      expect(res.ok).toBe(true);
      expect(res.provider).toBe("openai");
      expect(res.model).toBe("gpt-4o-mini");
      expect(res.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("returns ok: false with explanation when API key is invalid", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({
            error: { message: "Incorrect API key provided" },
          }),
      } as Response);

      const res = await validateLlmConnection({
        provider: "openai",
        apiKey: "sk-invalid-key",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Invalid API key");
    });

    it("returns ok: false with explanation when quota is exceeded", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () =>
          JSON.stringify({
            error: {
              status: "RESOURCE_EXHAUSTED",
              message: "Quota exceeded for project",
            },
          }),
      } as Response);

      const res = await validateLlmConnection({
        provider: "gemini",
        apiKey: "AIzaSyQuotaFull",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Quota exceeded or rate limit reached");
    });

    it("returns ok: false with explanation when connection times out", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(
        new (class extends Error {
          name = "AbortError";
          message = "Connection timed out after 15s";
        })(),
      );

      const res = await validateLlmConnection({
        provider: "openrouter",
        apiKey: "sk-timeout-key",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("timed out after 15 seconds");
    });

    it("rejects invalid request body with status 400", async () => {
      const res = await validateLlmConnection({
        provider: "unsupported-provider",
        apiKey: "test-key",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unsupported provider");
    });

    it("validates direct function call to validateLlmConnection", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "pong" }] } }],
        }),
      } as Response);

      const res = await validateLlmConnection({
        provider: "gemini",
        apiKey: "AIzaValidDirectKey",
      });

      expect(res.ok).toBe(true);
      expect(res.provider).toBe("gemini");
      expect(res.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});
