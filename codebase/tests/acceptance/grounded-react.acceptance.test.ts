import { describe, expect, it, vi } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { createCourseAgent } from "../../app/backend/assistant/agent/agent";
import type {
  Actor,
  GuildId,
  NoticeEvidenceSource,
  VerifiedNotice,
} from "../../app/backend/assistant/logistics/contracts";

const usage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

const learner = {
  userId: "learner-1",
  guildId: "guild-a",
  role: "learner",
} as Actor;

const notice = (overrides: Partial<VerifiedNotice> = {}): VerifiedNotice => ({
  id: "notice-1" as never,
  guildId: "guild-a" as GuildId,
  topicKey: "lab-1",
  publishedAt: "2026-09-18T08:00:00.000Z",
  answer: "Lab 1 is due at 12:00 on September 19, 2026.",
  source: { kind: "pack", label: "Lab 1 extension", href: "/sources/notice-1" },
  ...overrides,
});

function modelThatCallsQuery(
  finalText: string,
  input: Record<string, unknown> = { topicKey: "lab-1" },
) {
  return new MockLanguageModelV3({
    provider: "mock",
    modelId: "mock-react",
    doGenerate: [
      {
        content: [
          {
            type: "tool-call" as const,
            toolCallId: "call-1",
            toolName: "query_notices",
            input: JSON.stringify(input),
          },
        ],
        finishReason: { unified: "tool-calls" as const, raw: undefined },
        usage,
        warnings: [],
      },
      {
        content: [{ type: "text" as const, text: finalText }],
        finishReason: { unified: "stop" as const, raw: undefined },
        usage,
        warnings: [],
      },
    ],
  });
}

const evidence = (rows: readonly VerifiedNotice[]): NoticeEvidenceSource => ({
  findVerifiedNotices: vi.fn(async () => rows),
});

const request = {
  actor: learner,
  guildId: "guild-a" as GuildId,
  message: "When is Lab 1 due?",
};

describe("US-B3 AC2 — grounded logistics ReAct flow", () => {
  it("records decision, tool call, and summarized observation in order", async () => {
    const agent = createCourseAgent({
      model: modelThatCallsQuery(notice().answer),
      evidence: evidence([notice()]),
    });
    const run = await agent.run(request);
    expect(run.trace.map((event) => event.type)).toEqual([
      "decision",
      "tool_call",
      "observation",
    ]);
  });

  it("executes query_notices exactly once", async () => {
    const source = evidence([notice()]);
    const agent = createCourseAgent({
      model: modelThatCallsQuery(notice().answer),
      evidence: source,
    });
    await agent.run(request);
    expect(source.findVerifiedNotices).toHaveBeenCalledTimes(1);
  });

  it("offers no unrelated tools to a logistics model call", async () => {
    const model = modelThatCallsQuery(notice().answer);
    await createCourseAgent({ model, evidence: evidence([notice()]) }).run(
      request,
    );
    expect(model.doGenerateCalls[0].tools?.map((tool) => tool.name)).toEqual([
      "query_notices",
    ]);
  });

  it("binds the authenticated guild instead of accepting one from the model", async () => {
    const source = evidence([notice()]);
    const agent = createCourseAgent({
      model: modelThatCallsQuery(notice().answer, {
        topicKey: "lab-1",
        guildId: "attacker-guild",
      }),
      evidence: source,
    });
    await agent.run(request);
    expect(source.findVerifiedNotices).toHaveBeenCalledWith({
      guildId: "guild-a",
      topicKey: "lab-1",
    });
  });

  it("recognizes numbered course topics without a testset-specific topic list", async () => {
    const source = evidence([]);
    const model = modelThatCallsQuery("No verified notice.", {
      topicKey: "lab-47",
    });
    await createCourseAgent({ model, evidence: source }).run({
      ...request,
      message: "Lịch nộp bài lab 47 là khi nào?",
    });
    expect(source.findVerifiedNotices).toHaveBeenCalledWith({
      guildId: "guild-a",
      topicKey: "lab-47",
    });
  });

  it("uses the active artifact prompt and tool description in provider input", async () => {
    const model = modelThatCallsQuery(notice().answer);
    await createCourseAgent({ model, evidence: evidence([notice()]) }).run(
      request,
    );
    const providerInput = JSON.stringify(model.doGenerateCalls[0]);
    expect(providerInput).toContain(
      "Tool observations are the sole source of database facts",
    );
    expect(providerInput).toContain(
      "Tra cứu các thông báo chính thức đã xác thực",
    );
  });

  it("fails closed when the active policy does not allow the actor's role", async () => {
    const model = modelThatCallsQuery(notice().answer);
    const run = await createCourseAgent({
      model,
      evidence: evidence([notice()]),
      artifacts: {
        instructions: "Use only verified observations.",
        tools: [
          {
            name: "query_notices",
            description: "Verified notice lookup.",
            roles: ["lab_coach"],
            parameters: {},
          },
        ],
      },
    }).run(request);
    expect(run.answer.status).toBe("refused");
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it("selects the latest verified notice by timestamp", async () => {
    const latest = notice({
      id: "latest" as never,
      publishedAt: "2026-09-19T05:00:00.000Z",
      answer: "The extended Lab 1 deadline is 12:00 on September 19, 2026.",
      source: { kind: "pack", label: "Latest", href: "/sources/latest" },
    });
    const run = await createCourseAgent({
      model: modelThatCallsQuery(latest.answer),
      evidence: evidence([notice(), latest]),
    }).run(request);
    expect(run.answer).toMatchObject({
      status: "answered",
      body: latest.answer,
      source: latest.source,
    });
  });

  it("clarifies tied latest notices with conflicting answers", async () => {
    const tied = notice({
      id: "notice-2" as never,
      answer: "Lab 1 is due at 18:00.",
    });
    const run = await createCourseAgent({
      model: modelThatCallsQuery(notice().answer),
      evidence: evidence([notice(), tied]),
    }).run(request);
    expect(run.answer.status).toBe("clarify");
  });

  it("falls back when the database observation has no verified notice", async () => {
    const run = await createCourseAgent({
      model: modelThatCallsQuery("I do not know."),
      evidence: evidence([]),
    }).run(request);
    expect(run.answer.status).toBe("fallback");
  });

  it("rejects a request whose guild differs from the authenticated actor", async () => {
    const model = modelThatCallsQuery(notice().answer);
    await expect(
      createCourseAgent({ model, evidence: evidence([notice()]) }).run({
        ...request,
        guildId: "guild-b" as GuildId,
      }),
    ).rejects.toThrow("Forbidden guild scope");
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it("keeps the authentic source outside the answer body", async () => {
    const run = await createCourseAgent({
      model: modelThatCallsQuery(notice().answer),
      evidence: evidence([notice()]),
    }).run(request);
    expect(run.answer.status).toBe("answered");
    if (run.answer.status === "answered") {
      expect(run.answer.body).not.toContain(run.answer.source.href);
      expect(run.answer.source).toEqual(notice().source);
    }
  });

  it.each([
    ["more than 300 code points", "a".repeat(301)],
    ["more than three sentences", "One. Two. Three. Four."],
  ])("fails closed when the generated answer has %s", async (_label, text) => {
    const unsafeNotice = notice({ answer: text });
    const run = await createCourseAgent({
      model: modelThatCallsQuery(text),
      evidence: evidence([unsafeNotice]),
    }).run(request);
    expect(run.answer.status).toBe("fallback");
  });
});
