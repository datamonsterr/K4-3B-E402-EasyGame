import { NextResponse } from "next/server";
import { z } from "zod";
import type {
  Actor,
  AnswerLogisticsResult,
  LogisticsAssistant,
} from "@/backend/assistant/logistics/contracts";

const MAX_PAYLOAD_BYTES = 8192;

const requestSchema = z
  .object({ query: z.string().trim().min(1).max(2000) })
  .strict();

export type AnswerContextResult =
  | { type: "unauthenticated" }
  | { type: "forbidden" }
  | { type: "unavailable" }
  | {
      type: "ready";
      actor: Actor;
      assistant: LogisticsAssistant;
    };

export type AnswerContextOpener = () => Promise<AnswerContextResult>;

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

export function createAnswerHandler(deps: {
  openContext: AnswerContextOpener;
}) {
  return async (req: Request): Promise<Response> => {
    let rawText: string;
    try {
      rawText = await req.text();
    } catch {
      return jsonError(400, "INVALID_REQUEST", "Failed to read request body");
    }

    if (new TextEncoder().encode(rawText).length > MAX_PAYLOAD_BYTES) {
      return jsonError(
        400,
        "INVALID_REQUEST",
        "Request body exceeds maximum size limit",
      );
    }

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(rawText);
    } catch {
      return jsonError(400, "INVALID_REQUEST", "Invalid JSON body");
    }

    const parsed = requestSchema.safeParse(rawJson);
    if (!parsed.success) {
      return jsonError(400, "INVALID_REQUEST", "Invalid request payload");
    }

    const context = await deps.openContext();
    if (context.type === "unauthenticated") {
      return jsonError(401, "UNAUTHENTICATED", "Authentication required");
    }
    if (context.type === "forbidden") {
      return jsonError(403, "FORBIDDEN", "Access forbidden");
    }
    if (context.type === "unavailable") {
      return jsonError(
        503,
        "ASSISTANT_UNAVAILABLE",
        "Assistant service unavailable",
      );
    }

    try {
      const result: AnswerLogisticsResult = await context.assistant.answer({
        actor: context.actor,
        guildId: context.actor.guildId,
        message: parsed.data.query,
      });

      return NextResponse.json(result, {
        status: 200,
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch {
      return jsonError(
        503,
        "ASSISTANT_UNAVAILABLE",
        "The assistant is temporarily unavailable. Please try again later.",
      );
    }
  };
}
