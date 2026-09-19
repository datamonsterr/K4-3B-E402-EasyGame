import { describe, expect, it, vi } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { createCourseAgent } from "../app/backend/assistant/agent/agent";
import type { AgentOperations } from "../app/backend/assistant/agent/contracts";
import type {
  Actor,
  GuildId,
} from "../app/backend/assistant/logistics/contracts";

const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

const generation = (
  toolName: string,
  input: Record<string, unknown>,
  id: string,
) => ({
  content: [
    {
      type: "tool-call" as const,
      toolCallId: id,
      toolName,
      input: JSON.stringify(input),
    },
  ],
  finishReason: { unified: "tool-calls" as const, raw: undefined },
  usage,
  warnings: [],
});

const actor = (role: "learner" | "lab_coach") =>
  ({ userId: `${role}-1`, guildId: "guild-a", role }) as Actor;

function operations(): AgentOperations {
  return {
    evaluateRadar: vi.fn(async ({ guildId }) => ({
      guildId,
      items: [
        { questionId: "q-visible", id: "q-visible", tier: 2, version: 7 },
      ],
    })),
    createStaffAlert: vi.fn(async (input) => ({ id: "alert-1", ...input })),
    resolveQuestion: vi.fn(async (input) => ({ success: true, ...input })),
    formatDailyDigest: vi.fn(async ({ guildId, localDate }) => ({
      guildId,
      localDate,
      title: "Daily Operations Digest",
      generatedAt: `${localDate}T22:00:00.000Z`,
      metrics: { total: 0, resolved: 0, backlog: 0 },
      sanitizedSummary: "No active radar questions.",
      rankedTopics: [],
    })),
    searchWeb: vi.fn(async ({ query }) => ({ query, results: [] })),
  };
}

describe("bounded observation-dependent workflows", () => {
  it("runs radar before creating an alert from the observed question and tier", async () => {
    const adapters = operations();
    const model = new MockLanguageModelV3({
      doGenerate: [
        generation("evaluate_radar", {}, "call-radar"),
        generation(
          "create_staff_alert",
          { questionId: "q-visible", tier: 2, summary: "Quá hạn" },
          "call-alert",
        ),
        {
          content: [{ type: "text" as const, text: "Đã tạo cảnh báo nội bộ." }],
          finishReason: { unified: "stop" as const, raw: undefined },
          usage,
          warnings: [],
        },
      ],
    });

    const run = await createCourseAgent({
      model,
      evidence: { findVerifiedNotices: vi.fn() },
      operations: adapters,
    }).run({
      actor: actor("lab_coach"),
      guildId: "guild-a" as GuildId,
      message: "Quét radar rồi tạo cảnh báo cho câu hỏi quá hạn",
    });

    expect(adapters.evaluateRadar).toHaveBeenCalledTimes(1);
    expect(adapters.createStaffAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: "q-visible",
        tier: 2,
        guildId: "guild-a",
      }),
    );
    expect(
      run.trace
        .filter((event) => event.type === "tool_call")
        .map((event) => ("tool" in event ? event.tool : "")),
    ).toEqual(["evaluate_radar", "create_staff_alert"]);
  });

  it("rejects a mutation for a question absent from the radar observation", async () => {
    const adapters = operations();
    const model = new MockLanguageModelV3({
      doGenerate: [
        generation("evaluate_radar", {}, "call-radar"),
        generation(
          "resolve_question",
          { questionId: "q-foreign", expectedVersion: 7 },
          "call-resolve",
        ),
        {
          content: [{ type: "text" as const, text: "Không thể giải quyết." }],
          finishReason: { unified: "stop" as const, raw: undefined },
          usage,
          warnings: [],
        },
      ],
    });

    await expect(
      createCourseAgent({
        model,
        evidence: { findVerifiedNotices: vi.fn() },
        operations: adapters,
      }).run({
        actor: actor("lab_coach"),
        guildId: "guild-a" as GuildId,
        message: "Quét radar rồi giải quyết câu hỏi quá hạn",
      }),
    ).rejects.toMatchObject({ operation: "resolve_question", kind: "invalid" });
    expect(adapters.resolveQuestion).not.toHaveBeenCalled();
  });

  it("denies learner mutation workflows before calling the provider or adapters", async () => {
    const adapters = operations();
    const model = new MockLanguageModelV3();
    const run = await createCourseAgent({
      model,
      evidence: { findVerifiedNotices: vi.fn() },
      operations: adapters,
    }).run({
      actor: actor("learner"),
      guildId: "guild-a" as GuildId,
      message: "Quét radar rồi tạo cảnh báo cho câu hỏi quá hạn",
    });
    expect(run.answer.status).toBe("refused");
    expect(model.doGenerateCalls).toHaveLength(0);
    expect(adapters.evaluateRadar).not.toHaveBeenCalled();
    expect(adapters.createStaffAlert).not.toHaveBeenCalled();
  });

  it("propagates provider failures instead of substituting deterministic text", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error("provider unavailable");
      },
    });
    await expect(
      createCourseAgent({
        model,
        evidence: {
          findVerifiedNotices: vi.fn(async () => [
            {
              id: "n1" as never,
              guildId: "guild-a" as GuildId,
              topicKey: "lab-1",
              answer: "Hạn nộp 20:00.",
              source: {
                label: "Thông báo",
                href: "/sources/n1",
                kind: "pack" as const,
              },
              publishedAt: "2026-09-18T00:00:00Z",
            },
          ]),
        },
      }).run({
        actor: actor("learner"),
        guildId: "guild-a" as GuildId,
        message: "Hạn Lab 1 khi nào?",
      }),
    ).rejects.toThrow("provider unavailable");
  });
});
