import { z } from "zod";
import { validateLlmConnection } from "@/backend/assistant";

const requestSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  apiKey: z.string().min(1, "API key is required"),
  model: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    let bodyJson: Record<string, unknown> = {};
    if (raw.trim()) {
      try {
        bodyJson = JSON.parse(raw);
      } catch {
        return Response.json(
          { ok: false, error: "Invalid JSON format in request body" },
          { status: 400 },
        );
      }
    }

    // Accept provider, apiKey, and model from request body or headers
    const provider =
      (typeof bodyJson.provider === "string" ? bodyJson.provider : undefined) ||
      request.headers.get("x-llm-provider") ||
      undefined;
    const apiKey =
      (typeof bodyJson.apiKey === "string" ? bodyJson.apiKey : undefined) ||
      request.headers.get("x-llm-api-key") ||
      undefined;
    const model =
      (typeof bodyJson.model === "string" ? bodyJson.model : undefined) ||
      request.headers.get("x-llm-model") ||
      undefined;

    const parsed = requestSchema.safeParse({ provider, apiKey, model });
    if (!parsed.success) {
      return Response.json(
        {
          ok: false,
          error:
            "Provider and apiKey are required. Supported providers: 'gemini' | 'openrouter' | 'openai'",
        },
        { status: 400 },
      );
    }

    const result = await validateLlmConnection({
      provider: parsed.data.provider,
      apiKey: parsed.data.apiKey,
      model: parsed.data.model,
    });

    return Response.json(result, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Unexpected internal error";
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
