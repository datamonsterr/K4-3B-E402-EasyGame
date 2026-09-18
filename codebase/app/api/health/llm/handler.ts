import type { ConfiguredAgentModel } from "@/backend/assistant/agent/models";

type LlmHealthDependencies = {
  authorize(): Promise<boolean>;
  resolveModel(): ConfiguredAgentModel | null;
  probe(config: ConfiguredAgentModel): Promise<void>;
  now?: () => number;
};

function hasClientConfiguration(request: Request, rawBody: string): boolean {
  if (
    request.headers.has("x-llm-provider") ||
    request.headers.has("x-llm-model") ||
    request.headers.has("x-llm-api-key")
  ) {
    return true;
  }
  if (!rawBody.trim()) return false;
  try {
    const body: unknown = JSON.parse(rawBody);
    return !(
      typeof body === "object" &&
      body !== null &&
      !Array.isArray(body) &&
      Object.keys(body).length === 0
    );
  } catch {
    return true;
  }
}

export function createLlmHealthHandler(dependencies: LlmHealthDependencies) {
  return async function handle(request: Request): Promise<Response> {
    if (!(await dependencies.authorize())) {
      return Response.json(
        { ok: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const rawBody = await request.text();
    if (hasClientConfiguration(request, rawBody)) {
      return Response.json(
        { ok: false, error: "LLM configuration is managed by the server" },
        { status: 400 },
      );
    }

    const configured = dependencies.resolveModel();
    if (!configured) {
      return Response.json(
        { ok: false, error: "LLM provider is not configured" },
        { status: 503 },
      );
    }

    const now = dependencies.now ?? Date.now;
    const startedAt = now();
    try {
      await dependencies.probe(configured);
      return Response.json({
        ok: true,
        provider: configured.provider,
        model: configured.modelId,
        latencyMs: Math.max(0, now() - startedAt),
      });
    } catch {
      return Response.json(
        { ok: false, error: "LLM provider probe failed" },
        { status: 503 },
      );
    }
  };
}
