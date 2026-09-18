import type {
  AnswerLogisticsResult,
  GuildId,
  VerifiedNotice,
} from "./contracts";

const FALLBACK_BODY =
  "There is no verified notice for this question. Please ask a Lab Coach for confirmation.";
const FALLBACK_SUMMARY = "Candidate failed verified-evidence output gate";
const ANSWERED_SUMMARY = "Selected latest verified guild notice";

const DISCORD_JUMP_URL = /^https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+$/;
const LOCAL_SOURCE_URL = /^\/sources\/[A-Za-z0-9-]+$/;

function hasAuthenticSource(notice: VerifiedNotice): boolean {
  if (notice.source.kind === "discord") {
    return DISCORD_JUMP_URL.test(notice.source.href);
  }
  return LOCAL_SOURCE_URL.test(notice.source.href);
}

function fallback(): AnswerLogisticsResult {
  return {
    status: "fallback",
    body: FALLBACK_BODY,
    source: null,
    alert: "not_queued",
    decisionSummary: FALLBACK_SUMMARY,
  };
}

export function finalizeAnswer(
  candidate: string,
  notice: VerifiedNotice,
  authorizedGuildId: GuildId,
): AnswerLogisticsResult {
  const body = typeof candidate === "string" ? candidate.trim() : "";
  const answer = typeof notice.answer === "string" ? notice.answer.trim() : "";
  const sentences = body
    ? [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(body)]
        .length
    : 0;

  if (
    notice.guildId !== authorizedGuildId ||
    !body ||
    body !== answer ||
    Array.from(body).length > 300 ||
    sentences > 3 ||
    !hasAuthenticSource(notice)
  ) {
    return fallback();
  }

  return {
    status: "answered",
    body,
    source: notice.source,
    decisionSummary: ANSWERED_SUMMARY,
  };
}
