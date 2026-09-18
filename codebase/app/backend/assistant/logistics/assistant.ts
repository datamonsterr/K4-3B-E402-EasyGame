import type {
  AnswerLogisticsRequest,
  AnswerLogisticsResult,
  LogisticsAssistant,
  LogisticsDraftProvider,
  NoticeEvidenceSource,
} from "./contracts";
import { finalizeAnswer } from "./finalize";
import { createLogisticsToolExecutor } from "./tools";

const clarifyText =
  "Which lab, milestone, or course policy are you asking about?";
const refusalText =
  "I can only help with verified course logistics and policies.";
const fallbackText =
  "There is no verified notice for this question. Please ask a Lab Coach for confirmation.";

function classifyIntent(
  message: string,
):
  | { type: "refused"; reason: string }
  | { type: "clarify"; reason: string }
  | { type: "logistics"; topicKey: string } {
  const normalized = message.trim().toLowerCase();

  // Adversarial prompt override / injection
  if (
    /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/i.test(normalized) ||
    /system\s+prompt/i.test(normalized) ||
    /you\s+are\s+now\s+(?:the\s+)?/i.test(normalized) ||
    /reveal\s+(?:the\s+)?secret/i.test(normalized)
  ) {
    return { type: "refused", reason: "Refused adversarial prompt override" };
  }

  // Academic integrity / homework code solutions
  if (
    /(?:write|solve|give|generate|fix)\s+(?:me\s+)?(?:the\s+)?(?:my\s+)?(?:lab\s+\d+\s+)?code/i.test(
      normalized,
    ) ||
    /solution\s+(?:to|for)\s+lab/i.test(normalized) ||
    /do\s+my\s+homework/i.test(normalized)
  ) {
    return { type: "refused", reason: "Refused out-of-scope solution request" };
  }

  // Check specific logistics topics
  if (/lab[ -]?1\b/i.test(normalized)) {
    return { type: "logistics", topicKey: "lab-1" };
  }
  if (/lab[ -]?2\b/i.test(normalized)) {
    return { type: "logistics", topicKey: "lab-2" };
  }
  if (/attendance\b/i.test(normalized)) {
    return { type: "logistics", topicKey: "attendance" };
  }

  // If vague or asking for deadline without lab entity
  return { type: "clarify", reason: "Clarifying ambiguous logistics topic" };
}

export function createLogisticsAssistant(deps: {
  evidence: NoticeEvidenceSource;
  draftProvider?: LogisticsDraftProvider;
}): LogisticsAssistant {
  return {
    async answer(
      request: AnswerLogisticsRequest,
    ): Promise<AnswerLogisticsResult> {
      if (request.actor.guildId !== request.guildId) {
        throw new Error("Forbidden guild scope");
      }

      const classification = classifyIntent(request.message);
      if (classification.type === "refused") {
        return {
          status: "refused",
          body: refusalText,
          source: null,
          decisionSummary: classification.reason,
        };
      }

      if (classification.type === "clarify") {
        return {
          status: "clarify",
          body: clarifyText,
          source: null,
          decisionSummary: classification.reason,
        };
      }

      const matches = await deps.evidence.findVerifiedNotices({
        guildId: request.guildId,
        topicKey: classification.topicKey,
      });

      if (!matches || matches.length === 0) {
        return {
          status: "fallback",
          body: fallbackText,
          source: null,
          alert: "not_queued",
          decisionSummary: "No verified evidence for topic",
        };
      }

      const sorted = [...matches].sort(
        (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
      );
      const latest = sorted[0];

      // Check for tied conflicting notices
      const tiedConflicting = sorted.some(
        (n) =>
          n !== latest &&
          Date.parse(n.publishedAt) === Date.parse(latest.publishedAt) &&
          n.answer.trim() !== latest.answer.trim(),
      );

      if (tiedConflicting) {
        return {
          status: "clarify",
          body: clarifyText,
          source: null,
          decisionSummary: "Clarifying tied conflicting notices",
        };
      }

      if (deps.draftProvider) {
        let candidate: string;
        try {
          const invokeTool = createLogisticsToolExecutor({
            guildId: request.guildId,
            evidence: deps.evidence,
          });
          candidate = await deps.draftProvider.draft({
            message: request.message,
            notice: latest,
            invokeTool,
          });
        } catch {
          return {
            status: "fallback",
            body: fallbackText,
            source: null,
            alert: "not_queued",
            decisionSummary: "Draft provider rejected or failed",
          };
        }

        return finalizeAnswer(candidate, latest, request.guildId);
      }

      return finalizeAnswer(latest.answer, latest, request.guildId);
    },
  };
}
