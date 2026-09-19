export type LLMProvider = "gemini" | "openrouter" | "openai";
export interface ValidateLlmOptions {
  provider: string;
  apiKey: string;
  model?: string;
}
export interface ValidateLlmResult {
  ok: boolean;
  provider?: string;
  model?: string;
  latencyMs?: number;
  error?: string;
}

export function isQuotaOrTimeoutError(
  status?: number,
  bodyOrMsg?: string,
): boolean {
  if (status === 429 || status === 408 || status === 504) return true;
  const lower = bodyOrMsg?.toLowerCase() ?? "";
  return [
    "resource_exhausted",
    "insufficient_quota",
    "rate_limit",
    "rate limit",
    "quota_exceeded",
    "exceeded your current quota",
    "quota reached",
    "timed out",
    "timeout",
    "aborterror",
    "aborted",
  ].some((value) => lower.includes(value));
}

export async function validateLlmConnection(
  options: ValidateLlmOptions,
): Promise<ValidateLlmResult> {
  const provider = options.provider.toLowerCase().trim();
  const apiKey = options.apiKey.trim();
  if (!["gemini", "openrouter", "openai"].includes(provider))
    return {
      ok: false,
      error: `Unsupported provider "${options.provider}". Supported providers: gemini, openrouter, openai`,
    };
  if (!apiKey) return { ok: false, error: "API key is required" };
  const model =
    options.model?.trim() ||
    (provider === "gemini"
      ? process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"
      : provider === "openrouter"
        ? process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash"
        : process.env.OPENAI_MODEL || "gpt-4o-mini");
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("Connection timed out after 15s")),
    15_000,
  );
  try {
    const isGemini = provider === "gemini";
    const endpoint = isGemini
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
      : provider === "openrouter"
        ? "https://openrouter.ai/api/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (!isGemini) headers.Authorization = `Bearer ${apiKey}`;
    if (provider === "openrouter") {
      headers["HTTP-Referer"] = "https://easygame.vinuni.edu.vn";
      headers["X-Title"] = "EasyGame Assistant";
    }
    const body = isGemini
      ? {
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          generation_config: { max_output_tokens: 1, temperature: 0 },
        }
      : {
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
          temperature: 0,
        };
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const raw = await response.text();
      const category =
        response.status === 401 || response.status === 403
          ? "Invalid API key"
          : isQuotaOrTimeoutError(response.status, raw)
            ? "Quota exceeded or rate limit reached"
            : `Provider returned HTTP ${response.status}`;
      return { ok: false, error: `${category} for provider '${provider}'` };
    }
    return { ok: true, provider, model, latencyMs: Date.now() - startedAt };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Connection failed";
    return {
      ok: false,
      error: /abort|timed out/i.test(message)
        ? `Connection timed out after 15 seconds connecting to provider '${provider}'`
        : `Failed to connect to provider '${provider}'`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
