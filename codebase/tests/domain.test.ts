import { describe, expect, it } from "vitest";
import {
  parsePack,
  importPack,
  MemoryPackStore,
} from "../src/backend/ingestion";
import { answerLogistics, type Notice } from "../src/backend/assistant";
import { evaluateRadar } from "../src/backend/radar";
import { requireActor } from "../src/backend/auth/authorize";
const header =
  "msg_id,guild,channel,author,is_bot,msg_type,created_at_vn,reply_to,mentions_bot,n_attachments,n_chars,content";
const csv = [
  header,
  'M1,G1,C1,D1,False,message,2026-09-12 10:00,,False,0,3,"a,b"',
  "M1,G1,C1,D2,False,message,2026-09-12 11:00,,False,0,1,b",
  "M2,G1,C1,BOT,True,reply,2026-09-12 12:00,M1,False,0,1,c",
  "M3,G1,C1,D1,False,reply,2026-09-12 13:00,absent,False,0,1,d",
  "M4,G2,C1,D1,False,reply,2026-09-12 14:00,M2,False,0,1,e",
  "M5,G1,C1,D1,False,reply,2026-09-12 15:00,M2,True,0,1,f",
].join("\n");
const notice: Notice = {
  id: "notice-1",
  guildId: "demo",
  topicKey: "lab-1",
  publishedAt: "2026-09-12T00:00:00Z",
  verified: true,
  answer: "Lab 1 is due at 21:00 on September 17.",
  source: {
    label: "Synthetic original notice",
    href: "/sources/original",
    kind: "synthetic",
  },
};
describe("pack ingestion", () => {
  it("preserves collisions and refuses missing, ambiguous or cross-guild parents", () => {
    const p = parsePack(csv);
    expect(p.records).toHaveLength(6);
    expect(p.records[0].sent_at).toBe("2026-09-12T03:00:00.000Z");
    expect(p.records[0].content).toBe("a,b");
    expect(p.report).toMatchObject({
      rows: 6,
      references: { none: 2, resolved: 1, missing: 2, ambiguous: 1 },
    });
    expect(p.records[5].reply_to_ordinal).toBe(3);
  });
  it("rejects invalid dates, booleans, counts and headers", () => {
    for (const invalid of [
      csv.replace("2026-09-12 10:00", "2026-02-30 10:00"),
      csv.replace("False", "yes"),
      csv.replace(",0,3,", ",-1,3,"),
      csv.replace("msg_id", "message"),
    ])
      expect(() => parsePack(invalid)).toThrow();
  });
  it("imports the same immutable file once through the store interface", async () => {
    const store = new MemoryPackStore();
    const first = await importPack(csv, "synthetic.csv", store);
    const second = await importPack(csv, "synthetic.csv", store);
    expect(first.row_count).toBe(6);
    expect(second.already_imported).toBe(true);
    expect(first.dataset_id).toBe(second.dataset_id);
  });
});
describe("grounded answers", () => {
  it("selects only the latest verified notice for the correct guild and topic", () => {
    const later = {
      ...notice,
      id: "notice-2",
      publishedAt: "2026-09-14T00:00:00Z",
      answer: "Lab 1 is due at 12:00 on September 19.",
    };
    const result = answerLogistics(
      { guildId: "demo", topicKey: "lab-1", confidence: 0.95 },
      [
        notice,
        later,
        { ...later, guildId: "other", answer: "Wrong guild" },
        {
          ...later,
          verified: false,
          answer: "Unverified",
          publishedAt: "2026-09-15T00:00:00Z",
        },
      ],
    );
    expect(result.status).toBe("answered");
    expect(result.text).toBe(later.answer);
    expect(result.source?.label).toBe(notice.source.label);
  });
  it("falls back without official evidence even at high confidence", () => {
    expect(
      answerLogistics({ guildId: "demo", topicKey: "lab-2", confidence: 1 }, [
        notice,
      ]).status,
    ).toBe("fallback");
  });
  it("clarifies missing topics, uncertain confidence and tied conflicting notices", () => {
    expect(
      answerLogistics({ guildId: "demo", confidence: 1 }, [notice]).status,
    ).toBe("clarify");
    expect(
      answerLogistics({ guildId: "demo", topicKey: "lab-1", confidence: 0.8 }, [
        notice,
      ]).status,
    ).toBe("clarify");
    expect(
      answerLogistics({ guildId: "demo", topicKey: "lab-1", confidence: 1 }, [
        notice,
        { ...notice, id: "conflict", answer: "A different date." },
      ]).status,
    ).toBe("clarify");
  });
  it("does not truncate evidence into a misleading answer or emit unsafe citations", () => {
    for (const candidate of [
      { ...notice, answer: "x".repeat(301) },
      { ...notice, answer: "One. Two. Three. Four." },
      { ...notice, source: { ...notice.source, href: "javascript:alert(1)" } },
    ])
      expect(
        answerLogistics({ guildId: "demo", topicKey: "lab-1", confidence: 1 }, [
          candidate,
        ]).status,
      ).toBe("fallback");
  });
  it("rejects invalid confidence and timestamps", () => {
    expect(() =>
      answerLogistics({ guildId: "demo", topicKey: "lab-1", confidence: NaN }, [
        notice,
      ]),
    ).toThrow();
    expect(
      answerLogistics({ guildId: "demo", topicKey: "lab-1", confidence: 1 }, [
        { ...notice, publishedAt: "invalid" },
      ]).status,
    ).toBe("fallback");
  });
});
describe("radar", () => {
  const now = new Date("2026-09-18T12:00:00Z");
  it("honors exact SLA thresholds, retains older and answered questions, excludes resolved", () => {
    const items = evaluateRadar(
      [
        { id: "normal", sentAt: "2026-09-18T10:00:01Z", status: "open" },
        { id: "soft", sentAt: "2026-09-18T10:00:00Z", status: "claimed" },
        { id: "urgent", sentAt: "2026-09-18T08:00:00Z", status: "answered" },
        { id: "old", sentAt: "2026-09-16T00:00:00Z", status: "open" },
        { id: "done", sentAt: "2026-09-15T00:00:00Z", status: "resolved" },
      ],
      now,
    );
    expect(items.map((x) => [x.id, x.tier])).toEqual([
      ["old", 2],
      ["urgent", 2],
      ["soft", 1],
      ["normal", 0],
    ]);
  });
  it("rejects invalid dates and does not flag future questions", () => {
    expect(() =>
      evaluateRadar([{ id: "bad", sentAt: "no", status: "open" }], now),
    ).toThrow();
    expect(
      evaluateRadar(
        [{ id: "future", sentAt: "2026-09-19T00:00:00Z", status: "open" }],
        now,
      )[0].tier,
    ).toBe(0);
  });
});
describe("authorization", () => {
  it("requires verified membership and prevents learners from acting as coaches", async () => {
    const lookup = async () => ({ role: "learner" as const });
    await expect(requireActor(null, "g", "read", lookup)).rejects.toThrow(
      "Unauthenticated",
    );
    await expect(requireActor("u", "g", "coach", lookup)).rejects.toThrow(
      "Forbidden",
    );
    await expect(
      requireActor("u", "g", "read", async () => null),
    ).rejects.toThrow("Forbidden");
    expect(await requireActor("u", "g", "read", lookup)).toEqual({
      userId: "u",
      guildId: "g",
      role: "learner",
    });
  });
});
