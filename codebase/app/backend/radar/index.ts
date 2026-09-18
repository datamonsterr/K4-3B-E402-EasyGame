export type RadarQuestion = {
  id: string;
  sentAt: string;
  status: "open" | "claimed" | "answered" | "resolved";
};
export type RadarItem = RadarQuestion & {
  elapsedMinutes: number;
  tier: 0 | 1 | 2;
};
export function evaluateRadar(
  questions: readonly RadarQuestion[],
  now: Date,
): RadarItem[] {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid scan time");
  return questions
    .filter((q) => q.status !== "resolved")
    .map((q) => {
      const sent = Date.parse(q.sentAt);
      if (!Number.isFinite(sent)) throw new Error("Invalid question timestamp");
      const elapsedMinutes = Math.max(0, (now.getTime() - sent) / 60000);
      return {
        ...q,
        elapsedMinutes,
        tier:
          elapsedMinutes >= 240
            ? (2 as const)
            : elapsedMinutes >= 120
              ? (1 as const)
              : (0 as const),
      };
    })
    .sort(
      (a, b) => b.elapsedMinutes - a.elapsedMinutes || a.id.localeCompare(b.id),
    );
}

/**
 * UC-B2-01.AC.2: Proactive Non-intrusive Stuck Student Intervention in Public Thread
 * Formulates non-intrusive public reply with guide pointer and contextual alert in #ta-radar.
 * Under NO circumstances sends unsolicited private Direct Messages (DMs).
 */
export interface StuckStudentIntervention {
  shouldIntervene: boolean;
  publicReplyText?: string;
  contextualAlert?: {
    channel: string; // must be '#ta-radar'
    summary: string;
    studentUsername: string;
  };
  sentDirectMessage: false; // Strict architectural rule: zero unsolicited DMs
}

export function evaluateStuckStudent(
  inquiry: {
    question: string;
    elapsedMinutes: number;
    hasFollowUp: boolean;
    author: string;
  },
  guideUrl: string = "https://vinuni.edu.vn/docs/lab-setup",
): StuckStudentIntervention {
  const isRoadblock =
    /error|bug|fail|lỗi|crash|500|exception|docker|leak|không chạy/i.test(
      inquiry.question,
    ) &&
    inquiry.elapsedMinutes >= 60 &&
    !inquiry.hasFollowUp;

  if (!isRoadblock) {
    return { shouldIntervene: false, sentDirectMessage: false };
  }

  return {
    shouldIntervene: true,
    publicReplyText: `If you are running into this environment error, check Section 2 of the Lab Setup Guide at ${guideUrl}. I've also alerted our Lab Coaches to assist you here shortly!`,
    contextualAlert: {
      channel: "#ta-radar",
      summary: `Stuck student roadblock (>1h inactive): ${inquiry.question.slice(0, 80)}`,
      studentUsername: inquiry.author,
    },
    sentDirectMessage: false,
  };
}

/**
 * UC-B2-01.EX.2: Discord API Rate Limiting (HTTP 429) & Exponential Backoff Recovery
 * Parses Retry-After header and executes bounded exponential backoff with retry without message loss.
 */
export interface RateLimitRetryResult<T> {
  success: boolean;
  data?: T;
  retriesAttempted: number;
  lastError?: string;
}

export async function executeWithRateLimitRetry<T>(
  action: () => Promise<Response>,
  maxRetries: number = 3,
  delayFn: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<RateLimitRetryResult<T>> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    const res = await action();
    if (res.status === 429) {
      const retryAfterHeader = res.headers.get("Retry-After");
      const retryAfterSeconds = retryAfterHeader
        ? parseInt(retryAfterHeader, 10)
        : Math.pow(2, attempt) * 5;
      attempt++;
      if (attempt > maxRetries) {
        return {
          success: false,
          retriesAttempted: attempt,
          lastError: "Max rate limit retries exceeded",
        };
      }
      await delayFn(retryAfterSeconds * 1000);
      continue;
    }
    if (!res.ok) {
      return {
        success: false,
        retriesAttempted: attempt,
        lastError: `HTTP error ${res.status}`,
      };
    }
    const data = (await res.json()) as T;
    return { success: true, data, retriesAttempted: attempt };
  }
  return {
    success: false,
    retriesAttempted: attempt,
    lastError: "Unexpected retry loop termination",
  };
}
