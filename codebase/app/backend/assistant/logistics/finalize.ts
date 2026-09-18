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
const HONORIFICS = new Set(["dr", "mr", "mrs", "ms", "prof"]);

function hasAuthenticSource(notice: VerifiedNotice): boolean {
  if (notice.source.kind === "discord") {
    return DISCORD_JUMP_URL.test(notice.source.href);
  }
  return LOCAL_SOURCE_URL.test(notice.source.href);
}

function isMaskedDot(body: string, index: number): boolean {
  const previous = body[index - 1];
  const next = body[index + 1];
  if (previous && next && /\d/.test(previous) && /\d/.test(next)) {
    return true;
  }

  const timeAbbreviation = body.slice(index - 1, index + 3).toLowerCase();
  const beforeTimeAbbreviation = body[index - 2];
  if (
    (timeAbbreviation === "a.m." || timeAbbreviation === "p.m.") &&
    (!beforeTimeAbbreviation || !/\p{L}/u.test(beforeTimeAbbreviation))
  ) {
    return true;
  }

  const token = body
    .slice(0, index)
    .match(/\p{L}+$/u)?.[0]
    .toLowerCase();
  const remainder = body.slice(index + 1);

  if (token === "no") {
    return /^[ \t]+\d/.test(remainder);
  }

  if (token && HONORIFICS.has(token)) {
    return /^[ \t]+\p{Lu}[\p{L}\p{M}'’-]*/u.test(remainder);
  }

  return false;
}

function sanitizeSentenceDots(body: string): string {
  return body
    .split("")
    .map((character, index) =>
      character === "." && isMaskedDot(body, index) ? "" : character,
    )
    .join("");
}

function conservativeSentenceCount(body: string): number {
  let count = 0;
  let lastBoundaryEnd = 0;
  for (const match of body.matchAll(/[.!?]+(?=\s|$)/g)) {
    const index = match.index ?? 0;
    count += 1;
    lastBoundaryEnd = index + match[0].length;
  }
  return count + (body.slice(lastBoundaryEnd).trim() ? 1 : 0);
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
  const sanitizedBody = body ? sanitizeSentenceDots(body) : "";
  const sentences = sanitizedBody
    ? [
        ...new Intl.Segmenter("en", { granularity: "sentence" }).segment(
          sanitizedBody,
        ),
      ].length
    : 0;
  const conservativeSentences = sanitizedBody
    ? conservativeSentenceCount(sanitizedBody)
    : 0;

  if (
    notice.guildId !== authorizedGuildId ||
    !body ||
    body !== answer ||
    Array.from(body).length > 300 ||
    Math.max(sentences, conservativeSentences) > 3 ||
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
