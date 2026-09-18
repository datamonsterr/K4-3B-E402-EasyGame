import { z } from "zod";
import { runAgent } from "@/backend/assistant";

const requestSchema = z.object({
  topicKey: z.string().min(1).max(200).optional(),
  query: z.string().min(1).max(2000).optional(),
  guildId: z.string().optional(),
  confidence: z.number().optional(),
  provider: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  offlineMode: z.boolean().optional(),
});

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 8192) {
    return Response.json({ error: "Request too large" }, { status: 413 });
  }

  try {
    const raw = await request.text();
    if (raw.length > 8192) {
      return Response.json({ error: "Request too large" }, { status: 413 });
    }

    let bodyJson: unknown;
    try {
      bodyJson = JSON.parse(raw);
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return Response.json(
        { error: "Provide a valid topicKey" },
        { status: 400 },
      );
    }

    const topicKey = parsed.data.topicKey;
    const query = parsed.data.query || topicKey;
    if (!query) {
      return Response.json(
        { error: "Provide a valid topicKey" },
        { status: 400 },
      );
    }

    // Accept provider, apiKey, and model from request body or headers
    const provider =
      parsed.data.provider ||
      request.headers.get("x-llm-provider") ||
      undefined;
    const apiKey =
      parsed.data.apiKey || request.headers.get("x-llm-api-key") || undefined;
    const model =
      parsed.data.model || request.headers.get("x-llm-model") || undefined;

    const result = await runAgent({
      query,
      guildId: parsed.data.guildId || "demo",
      provider,
      apiKey,
      model,
      offlineMode: parsed.data.offlineMode,
    });

    return Response.json({
      status: result.status,
      grounded: result.status === "answered" && Boolean(result.source),
      text: result.text,
      source: result.source,
      summary: result.summary,
      latencyMs: result.telemetry.latencyMs,
      telemetry: result.telemetry,
    });
  } catch {
    return Response.json(
      { error: "Failed to process answer request" },
      { status: 500 },
    );
  }
}
