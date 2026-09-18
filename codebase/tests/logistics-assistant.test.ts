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

  it("allows exactly three lowercase-start sentences with final punctuation", () => {
    const answer =
      "Lab 1 is due Friday. submissions close at noon. late work is rejected.";
    expect(finalizeAnswer(answer, { ...notice, answer }, guildId).status).toBe(
      "answered",
    );
  });

  it("rejects four lowercase-start sentences with final punctuation", () => {
    const answer =
      "Lab 1 is due Friday. submissions close at noon. late work is rejected. extensions need approval.";
    expect(finalizeAnswer(answer, { ...notice, answer }, guildId).status).toBe(
      "fallback",
    );
  });

  it("allows exactly three lowercase-start sentences without final punctuation", () => {
    const answer =
      "Lab 1 is due Friday. submissions close at noon. late work is rejected";
    expect(finalizeAnswer(answer, { ...notice, answer }, guildId).status).toBe(
      "answered",
    );
  });

  it("rejects four lowercase-start sentences without final punctuation", () => {
    const answer =
      "Lab 1 is due Friday. submissions close at noon. late work is rejected. extensions need approval";
    expect(finalizeAnswer(answer, { ...notice, answer }, guildId).status).toBe(
      "fallback",
    );
  });

  it("allows 300 supplementary Unicode code points when grounded exactly", () => {
    const answer = "😀".repeat(300);
    expect(finalizeAnswer(answer, { ...notice, answer }, guildId).status).toBe(
      "answered",
    );
  });

  it("rejects 301 supplementary Unicode code points", () => {
    const answer = "😀".repeat(301);
    expect(finalizeAnswer(answer, { ...notice, answer }, guildId).status).toBe(
      "fallback",
    );
  });

  it("rejects whitespace-only output", () => {
    const answer = "   \n\t";
    expect(finalizeAnswer(answer, { ...notice, answer }, guildId).status).toBe(
      "fallback",
    );
  });

  it("does not count decimal dots or common abbreviations as sentences", () => {
    const answer =
      "Use v1.2 of the API. Dr. Smith approved it. Submit by Friday.";
    expect(finalizeAnswer(answer, { ...notice, answer }, guildId).status).toBe(
      "answered",
    );
  });

  it("fails closed when No. could be a sentence boundary", () => {
    const answer =
      "No. Lab 1 is due Friday. Submit by noon. Extensions need approval.";
    expect(finalizeAnswer(answer, { ...notice, answer }, guildId).status).toBe(
      "fallback",
    );
  });

  it("fails closed when a.m. could be a sentence boundary", () => {
    const answer =
      "The lab starts at 9 a.m. Bring a laptop. Submit by noon. Extensions need approval.";
    expect(finalizeAnswer(answer, { ...notice, answer }, guildId).status).toBe(
      "fallback",
    );
  });

  it("accepts a valid local pack source", () => {
    const packNotice = {
      ...notice,
      source: {
        kind: "pack" as const,
        label: "Lab 1 pack notice",
        href: "/sources/lab-1",
      },
    };
    expect(finalizeAnswer(packNotice.answer, packNotice, guildId).status).toBe(
      "answered",
    );
  });
});

import { createSupabaseNoticeEvidence } from "../app/backend/assistant/logistics/supabase-evidence";

describe("createSupabaseNoticeEvidence", () => {
  it("queries the authorized guild and topic in PostgreSQL", async () => {
    const filters: Array<[string, string]> = [];
    const query = {
      select: () => query,
      eq: (column: string, value: string) => {
        filters.push([column, value]);
        return query;
      },
      order: () =>
        Promise.resolve({
          data: [
            {
              id: notice.id,
              guild_id: notice.guildId,
              topic_key: notice.topicKey,
              published_at: notice.publishedAt,
              answer_excerpt: notice.answer,
              source_message: {
                source_label: notice.source.label,
                discord_jump_url: notice.source.href,
              },
            },
          ],
          error: null,
        }),
    };
    const source = createSupabaseNoticeEvidence({ from: () => query } as never);
    expect(
      await source.findVerifiedNotices({
        guildId: notice.guildId,
        topicKey: "lab-1",
      }),
    ).toHaveLength(1);
    expect(filters).toEqual([
      ["guild_id", notice.guildId],
      ["topic_key", "lab-1"],
    ]);
  });

  it("throws on database error instead of returning fixtures", async () => {
    const query = {
      select: () => query,
      eq: () => query,
      order: () =>
        Promise.resolve({ data: null, error: { message: "RLS failure" } }),
    };
    const source = createSupabaseNoticeEvidence({ from: () => query } as never);
    await expect(
      source.findVerifiedNotices({ guildId: notice.guildId, topicKey: "lab-1" }),
    ).rejects.toThrow("Notice evidence unavailable");
  });
});
