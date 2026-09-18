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
const COMMON_ABBREVIATIONS = new Set([
  "approx",
  "a.m",
  "dept",
  "dr",
  "e.g",
  "etc",
  "fig",
  "i.e",
  "inc",
  "jr",
  "mr",
  "mrs",
  "ms",
  "no",
  "p.m",
  "prof",
  "sr",
  "st",
  "u.s",
  "vs",
]);

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

  let tokenStart = index;
  while (tokenStart > 0 && /[A-Za-z.]/.test(body[tokenStart - 1])) {
    tokenStart -= 1;
  }
  let tokenEnd = index;
  while (tokenEnd + 1 < body.length && /[A-Za-z.]/.test(body[tokenEnd + 1])) {
    tokenEnd += 1;
  }
  const token = body
    .slice(tokenStart, tokenEnd + 1)
    .toLowerCase()
    .replace(/\.+$/, "");
  return COMMON_ABBREVIATIONS.has(token);
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
