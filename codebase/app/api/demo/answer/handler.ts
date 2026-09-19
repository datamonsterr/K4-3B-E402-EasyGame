import { NextResponse } from "next/server";
import { z } from "zod";
import type {
  Actor,
  AnswerLogisticsRequest,
  AnswerLogisticsResult,
} from "@/backend/assistant/logistics/contracts";

const MAX_PAYLOAD_BYTES = 8192;

const historyTurnSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2000),
  })
  .strict();
const requestSchema = z
  .object({
    query: z.string().trim().min(1).max(2000),
    history: z.array(historyTurnSchema).max(10).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    value.history?.forEach((turn, index) => {
      const expected = index % 2 === 0 ? "user" : "assistant";
      if (turn.role !== expected)
        context.addIssue({
          code: "custom",
          path: ["history", index, "role"],
          message: "History roles must alternate from user",
        });
    });
    if (
      value.history?.length &&
      value.history[value.history.length - 1]?.role !== "assistant"
    ) {
      context.addIssue({
        code: "custom",
        path: ["history", value.history.length - 1, "role"],
        message: "History must end with an assistant turn",
      });
    }
  });

export type AnswerContextResult =
  | { type: "unauthenticated" }
  | { type: "forbidden" }
  | { type: "unavailable" }
  | {
      type: "ready";
      actor: Actor;
      execute(request: AnswerLogisticsRequest): Promise<{
        answer: AnswerLogisticsResult;
        runId: string;
      }>;
    };

export type AnswerContextOpener = () => Promise<AnswerContextResult>;

export class AnswerExecutionError extends Error {
  constructor(readonly runId?: string) {
    super("Assistant execution failed");
  }
}

function jsonError(
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: { "Cache-Control": "private, no-store", ...headers },
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
      const execution = await context.execute({
        actor: context.actor,
        guildId: context.actor.guildId,
        message: parsed.data.query,
        history: parsed.data.history,
      });

      return NextResponse.json(execution.answer, {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
          "X-EasyGame-Run-Id": execution.runId,
        },
      });
    } catch (error) {
      return jsonError(
        503,
        "ASSISTANT_UNAVAILABLE",
        "The assistant is temporarily unavailable. Please try again later.",
        error instanceof AnswerExecutionError && error.runId
          ? { "X-EasyGame-Run-Id": error.runId }
          : {},
      );
    }
  };
}
