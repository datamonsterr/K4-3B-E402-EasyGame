import { describe, expect, it } from "vitest";
import { finalizeAnswer } from "../app/backend/assistant/logistics/finalize";
import type {
  GuildId,
  NoticeId,
  VerifiedNotice,
} from "../app/backend/assistant/logistics/contracts";

const guildId = "20000000-0000-0000-0000-000000000001" as GuildId;
const notice: VerifiedNotice = {
  id: "notice-lab-1" as NoticeId,
  guildId,
  topicKey: "lab-1",
  publishedAt: "2026-09-18T10:00:00.000Z",
  answer: "Lab 1 is due at 12:00 on September 19, 2026.",
  source: {
    kind: "discord",
    label: "Lab 1 official notice",
    href: "https://discord.com/channels/128400000000000000/1001/2002",
  },
};

describe("finalizeAnswer", () => {
  it("answers only with the exact verified notice body and source card", () => {
    expect(finalizeAnswer(notice.answer, notice, guildId)).toEqual({
      status: "answered",
      body: notice.answer,
      source: notice.source,
      decisionSummary: "Selected latest verified guild notice",
    });
  });

  it.each([
    {
      name: "a notice from another guild",
      candidate: notice.answer,
      notice: {
        ...notice,
        guildId: "20000000-0000-0000-0000-000000000002" as GuildId,
      },
    },
    {
      name: "unsupported provider output",
      candidate: "Lab 1 is due at 13:00 on September 19, 2026.",
      notice,
    },
    {
      name: "a 301-code-point candidate",
      candidate: "x".repeat(301),
      notice: { ...notice, answer: "x".repeat(301) },
    },
    {
      name: "a javascript source URL",
      candidate: notice.answer,
      notice: {
        ...notice,
        source: { ...notice.source, href: "javascript:alert(1)" },
      },
    },
  ])("falls back for $name", ({ candidate, notice: candidateNotice }) => {
    expect(finalizeAnswer(candidate, candidateNotice, guildId)).toEqual({
      status: "fallback",
      body: "There is no verified notice for this question. Please ask a Lab Coach for confirmation.",
      source: null,
      alert: "not_queued",
      decisionSummary: "Candidate failed verified-evidence output gate",
    });
  });
});
