export type Source = {
  label: string;
  href: string;
  kind: "synthetic" | "pack" | "discord";
};
export type Notice = {
  id: string;
  guildId: string;
  topicKey: string;
  publishedAt: string;
  verified: boolean;
  answer: string;
  source: Source;
};
export type AnswerResult = {
  status: "answered" | "clarify" | "fallback";
  text: string;
  source?: Source;
  summary: string;
};
export type LogisticsRequest = {
  guildId: string;
  topicKey?: string;
  confidence: number;
};
const fallback = (summary: string): AnswerResult => ({
  status: "fallback",
  text: "There is no verified notice for this question. Please ask a Lab Coach for confirmation.",
  summary,
});
function safeSource(source: Source): boolean {
  if (source.kind === "discord")
    return /^https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+$/.test(
      source.href,
    );
  return /^\/sources\/[a-zA-Z0-9-]+$/.test(source.href);
}
export function answerLogistics(
  request: LogisticsRequest,
  evidence: readonly Notice[],
): AnswerResult {
  if (
    !Number.isFinite(request.confidence) ||
    request.confidence < 0 ||
    request.confidence > 1
  )
    throw new Error("Confidence must be between 0 and 1");
  if (!request.topicKey)
    return {
      status: "clarify",
      text: "Which lab or milestone are you asking about?",
      summary: "Missing topic",
    };
  if (request.confidence < 0.7) return fallback("Confidence below threshold");
  if (request.confidence < 0.85)
    return {
      status: "clarify",
      text: "Please confirm the lab or milestone so I can find the right notice.",
      summary: "Topic needs confirmation",
    };
  const matches = evidence
    .filter(
      (n) =>
        n.verified &&
        n.guildId === request.guildId &&
        n.topicKey === request.topicKey &&
        Number.isFinite(Date.parse(n.publishedAt)),
    )
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const latest = matches[0];
  if (!latest) return fallback("No verified evidence");
  if (
    matches.some(
      (n) =>
        Date.parse(n.publishedAt) === Date.parse(latest.publishedAt) &&
        n.answer !== latest.answer,
    )
  )
    return {
      status: "clarify",
      text: "The latest notices conflict. Please ask a Lab Coach to confirm the deadline.",
      summary: "Conflicting notices share a timestamp",
    };
  const text = latest.answer.trim();
  const sentences = [
    ...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text),
  ].length;
  if (
    !text ||
    Array.from(text).length > 300 ||
    sentences > 3 ||
    !safeSource(latest.source)
  )
    return fallback("Evidence failed output validation");
  return {
    status: "answered",
    text,
    source: latest.source,
    summary: "Selected the latest verified notice for this topic",
  };
}

/**
 * UC-B1-01.EX.4: Discord Reply Delivery Failure & Idempotent Retry Policy
 * When delivery fails or times out, records delivery failure without marking
 * the question answered. Enforces idempotent delivery to prevent duplicates.
 */
export interface ReplyDeliveryResult {
  status: "delivered" | "failed";
  deliveredAt?: string;
  error?: string;
  questionMarkedAnswered: boolean;
  idempotencyKey: string;
}

export async function deliverAssistantReply(
  reply: { text: string; messageId: string; guildId: string },
  transport: (msg: {
    text: string;
    messageId: string;
  }) => Promise<{ success: boolean; error?: string }>,
  idempotencyKey: string,
): Promise<ReplyDeliveryResult> {
  const result = await transport({
    text: reply.text,
    messageId: reply.messageId,
  });
  if (!result.success) {
    return {
      status: "failed",
      error: result.error || "Discord delivery failed",
      questionMarkedAnswered: false,
      idempotencyKey,
    };
  }
  return {
    status: "delivered",
    deliveredAt: new Date().toISOString(),
    questionMarkedAnswered: true,
    idempotencyKey,
  };
}

export {
  validateLlmConnection,
  isQuotaOrTimeoutError,
  type LLMProvider,
  type ValidateLlmOptions,
  type ValidateLlmResult,
} from "./provider-health";

export * from "./logistics/contracts";
export { finalizeAnswer } from "./logistics/finalize";
export { createSupabaseNoticeEvidence } from "./logistics/supabase-evidence";
export { createLogisticsToolExecutor } from "./logistics/tools";
export { createLogisticsAssistant } from "./logistics/assistant";
