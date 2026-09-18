import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GET as oauthGet } from "../app/api/auth/oauth/route";
import { GET as callbackGet } from "../app/auth/callback/route";
import Home from "../app/page";
import { getSupabaseBrowserClient } from "../app/frontend/supabase-browser";
import { validateLlmConnection } from "../app/backend/assistant";
import { POST as healthLlmPost } from "../app/api/health/llm/route";

describe("OAuth SSO & Model Customization Suite", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "synthetic-anon-key-for-tests";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  describe("Supabase OAuth Initiation (/api/auth/oauth)", () => {
    it("rejects unsupported providers with a redirect to sign-in error", async () => {
      const req = new Request(
        "http://localhost:3000/api/auth/oauth?provider=github",
      );
      const res = await oauthGet(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location") || "";
      expect(location).toContain("/sign-in?error=");
      expect(location).toContain("Unsupported");
    });

    it("redirects to sign-in with an error when Supabase credentials are not configured", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const req = new Request(
        "http://localhost:3000/api/auth/oauth?provider=discord",
      );
      const res = await oauthGet(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location") || "";
      expect(decodeURIComponent(location)).toContain(
        "Discord SSO requires configured Supabase credentials.",
      );
    });

    it("initiates Discord OAuth flow and redirects to authorization URL when configured", async () => {
      const req = new Request(
        "http://localhost:3000/api/auth/oauth?provider=discord&role=lab_coach&next=/workspace",
      );
      const res = await oauthGet(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location") || "";
      // When Supabase is configured, location redirects to Supabase authorize endpoint
      expect(location).toMatch(/auth\/v1\/authorize\?provider=discord/);
      expect(location).toContain("redirect_to=");
      const callback = new URL(
        new URL(location).searchParams.get("redirect_to") ?? "",
      );
      expect(callback.searchParams.has("role")).toBe(false);
      expect(callback.searchParams.get("next")).toBe("/workspace");
    });

    it("initiates Google OAuth flow and redirects to authorization URL when configured", async () => {
      const req = new Request(
        "http://localhost:3000/api/auth/oauth?provider=google&role=learner&next=/workspace",
      );
      const res = await oauthGet(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location") || "";
      expect(location).toMatch(/auth\/v1\/authorize\?provider=google/);
      expect(location).toContain("redirect_to=");
      const callback = new URL(
        new URL(location).searchParams.get("redirect_to") ?? "",
      );
      expect(callback.searchParams.has("role")).toBe(false);
      expect(callback.searchParams.get("next")).toBe("/workspace");
    });
  });

  describe("Supabase OAuth Callback Handling (/auth/callback)", () => {
    it("redirects to sign-in when an OAuth error is returned in query parameters", async () => {
      const req = new Request(
        "http://localhost:3000/auth/callback?error=access_denied&error_description=User+declined+authorization",
      );
      const res = await callbackGet(req);
      const location = res.headers.get("location") || "";
      expect(decodeURIComponent(location)).toContain(
        "/sign-in?error=User declined authorization",
      );
    });

    it("redirects to sign-in with auth_callback_failed when code is missing", async () => {
      const req = new Request("http://localhost:3000/auth/callback");
      const res = await callbackGet(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location") || "";
      expect(location).toContain("/sign-in?error=auth_callback_failed");
    });

    it("prevents open redirect attacks by sanitizing external 'next' URLs", async () => {
      const req = new Request(
        "http://localhost:3000/auth/callback?code=invalid_mock_code&next=https://malicious.site",
      );
      const res = await callbackGet(req);
      const location = res.headers.get("location") || "";
      // Fails exchange -> redirects safely to sign-in
      expect(location).toContain("/sign-in?error=auth_callback_failed");
      expect(location).not.toContain("malicious.site");
    });

    it("parses multi-hop x-forwarded-host proxies correctly", async () => {
      const req = new Request(
        "http://internal:3000/auth/callback?error=server_error&error_description=Denied",
        {
          headers: {
            "x-forwarded-host": "easygame.vercel.app, proxy2.internal",
            "x-forwarded-proto": "https",
          },
        },
      );
      const res = await callbackGet(req);
      const location = res.headers.get("location") || "";
      expect(location).toContain(
        "https://easygame.vercel.app/sign-in?error=Denied",
      );
    });
  });

  describe("Root Page OAuth Callback Interceptor (app/page)", () => {
    it("intercepts ?code parameter and forwards to /auth/callback with next=/workspace", async () => {
      try {
        await Home({
          searchParams: Promise.resolve({ code: "test-auth-code-123" }),
        });
        expect.unreachable("Should have redirected");
      } catch (err: unknown) {
        const errorString = String(err);
        const digest = (err as { digest?: string }).digest || "";
        expect(errorString + digest).toContain("/auth/callback");
        expect(errorString + digest).toContain("code=test-auth-code-123");
        expect(errorString + digest).toContain("next=%2Fworkspace");
      }
    });

    it("intercepts OAuth error parameter on root and forwards to /auth/callback", async () => {
      try {
        await Home({
          searchParams: Promise.resolve({
            error: "access_denied",
            error_description: "User+cancelled",
          }),
        });
        expect.unreachable("Should have redirected");
      } catch (err: unknown) {
        const errorString = String(err);
        const digest = (err as { digest?: string }).digest || "";
        expect(errorString + digest).toContain("/auth/callback");
        expect(errorString + digest).toContain("error=access_denied");
      }
    });

    it("redirects unauthenticated visitors without params to /sign-in", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      try {
        await Home({});
        expect.unreachable("Should have redirected");
      } catch (err: unknown) {
        const errorString = String(err);
        const digest = (err as { digest?: string }).digest || "";
        expect(errorString + digest).toContain("/sign-in");
      }
    });
  });

  describe("Browser Client Helper (supabase-browser)", () => {
    it("returns a browser Supabase client instance when public env vars exist", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-pub-key";

      const client = getSupabaseBrowserClient();
      expect(client).not.toBeNull();
      expect(client?.auth).toBeDefined();
    });

    it("returns null when Supabase env vars are missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      const client = getSupabaseBrowserClient();
      expect(client).toBeNull();
    });
  });

  describe("Gemini 3.5 & Latest Models Support", () => {
    it("defaults to gemini-3.5-flash-lite when model is unspecified", async () => {
      delete process.env.GEMINI_MODEL;
      let targetUrl = "";

      globalThis.fetch = vi.fn().mockImplementation(async (url) => {
        targetUrl = String(url);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ candidates: [] }),
        };
      });

      const res = await validateLlmConnection({
        provider: "gemini",
        apiKey: "test-api-key",
      });

      expect(res.ok).toBe(true);
      expect(res.model).toBe("gemini-3.5-flash-lite");
      expect(targetUrl).toContain("gemini-3.5-flash-lite");
    });

    it("supports validating custom pasted model IDs for Gemini (e.g. gemini-3.5-pro)", async () => {
      let targetUrl = "";

      globalThis.fetch = vi.fn().mockImplementation(async (url) => {
        targetUrl = String(url);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ candidates: [] }),
        };
      });

      const res = await validateLlmConnection({
        provider: "gemini",
        apiKey: "test-api-key",
        model: "gemini-3.5-pro",
      });

      expect(res.ok).toBe(true);
      expect(res.model).toBe("gemini-3.5-pro");
      expect(targetUrl).toContain("gemini-3.5-pro");
    });
  });

  describe("OpenRouter & OpenAI Pasted Model ID Support", () => {
    it("allows pasting arbitrary custom model IDs for OpenRouter (e.g. deepseek/deepseek-v3)", async () => {
      let sentBody: Record<string, unknown> = {};

      globalThis.fetch = vi.fn().mockImplementation(async (url, init) => {
        sentBody = JSON.parse(String(init?.body));
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              choices: [{ message: { content: "pong" } }],
            }),
        };
      });

      const res = await validateLlmConnection({
        provider: "openrouter",
        apiKey: "sk-or-v1-custom-key",
        model: "deepseek/deepseek-v3",
      });

      expect(res.ok).toBe(true);
      expect(res.model).toBe("deepseek/deepseek-v3");
      expect(sentBody.model).toBe("deepseek/deepseek-v3");
    });

    it("allows pasting arbitrary custom model IDs for OpenAI (e.g. o3-mini)", async () => {
      let sentBody: Record<string, unknown> = {};

      globalThis.fetch = vi.fn().mockImplementation(async (url, init) => {
        sentBody = JSON.parse(String(init?.body));
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              choices: [{ message: { content: "pong" } }],
            }),
        };
      });

      const res = await validateLlmConnection({
        provider: "openai",
        apiKey: "sk-custom-openai-key",
        model: "o3-mini",
      });

      expect(res.ok).toBe(true);
      expect(res.model).toBe("o3-mini");
      expect(sentBody.model).toBe("o3-mini");
    });

    it("does not forward pasted credentials through /api/health/llm", async () => {
      const req = new Request("http://localhost:3000/api/health/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "openrouter",
          apiKey: "sk-or-v1-pasted-key",
          model: "anthropic/claude-3.5-haiku",
        }),
      });

      const res = await healthLlmPost(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(JSON.stringify(data)).not.toContain("sk-or-v1-pasted-key");
    });
  });
});
