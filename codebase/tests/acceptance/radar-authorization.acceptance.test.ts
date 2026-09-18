import { describe, expect, it, vi } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { createCourseAgent } from "../../app/backend/assistant/agent/agent";
import type { AgentOperations } from "../../app/backend/assistant/agent/contracts";
import type {
  Actor,
  GuildId,
} from "../../app/backend/assistant/logistics/contracts";

const usage = {
  inputTokens: {
    total: 4,
    noCache: 4,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 4, text: 4, reasoning: undefined },
};

const actor = (role: "learner" | "lab_coach") =>
  ({ userId: `${role}-1`, guildId: "guild-a", role }) as Actor;

function toolModel(toolName: string, input: Record<string, unknown>) {
  return new MockLanguageModelV3({
    doGenerate: [
      {
        content: [
          {
            type: "tool-call" as const,
            toolCallId: "call-1",
            toolName,
            input: JSON.stringify(input),
          },
        ],
        finishReason: { unified: "tool-calls" as const, raw: undefined },
        usage,
        warnings: [],
      },
      {
        content: [{ type: "text" as const, text: "Operation completed." }],
        finishReason: { unified: "stop" as const, raw: undefined },
        usage,
        warnings: [],
      },
    ],
  });
}

function operations() {
  return {
    evaluateRadar: vi.fn(async (input) => ({
      guildId: input.guildId,
      items: [],
    })),
    createStaffAlert: vi.fn(async (input) => ({ id: "alert-1", ...input })),
    resolveQuestion: vi.fn(async (input) => ({ success: true, ...input })),
    formatDailyDigest: vi.fn(async (input) => ({ title: "Digest", ...input })),
    searchWeb: vi.fn(async (input) => ({ query: input.query, results: [] })),
  } satisfies AgentOperations;
}

const cases = [
  {
    label: "learner read-only radar",
    role: "learner" as const,
    message: "Scan unanswered radar questions",
    tool: "evaluate_radar",
    input: { now: "2026-09-18T12:00:00Z" },
    operation: "evaluateRadar" as const,
    allowed: true,
  },
  {
    label: "coach read-only radar",
    role: "lab_coach" as const,
    message: "Scan unanswered radar questions",
    tool: "evaluate_radar",
    input: { now: "2026-09-18T12:00:00Z" },
    operation: "evaluateRadar" as const,
    allowed: true,
  },
  {
    label: "coach staff alert",
    role: "lab_coach" as const,
    message: "Create a staff alert for overdue question q-1",
    tool: "create_staff_alert",
    input: { questionId: "q-1", tier: 2, summary: "Overdue question" },
    operation: "createStaffAlert" as const,
    allowed: true,
  },
  {
    label: "learner staff alert denial",
    role: "learner" as const,
    message: "Create a staff alert for overdue question q-1",
    tool: "create_staff_alert",
    input: { questionId: "q-1", tier: 2, summary: "Overdue question" },
    operation: "createStaffAlert" as const,
    allowed: false,
  },
  {
    label: "coach resolution",
    role: "lab_coach" as const,
    message: "Resolve question q-1",
    tool: "resolve_question",
    input: { questionId: "q-1", expectedVersion: 0 },
    operation: "resolveQuestion" as const,
    allowed: true,
  },
  {
    label: "learner resolution denial",
    role: "learner" as const,
    message: "Resolve question q-1",
    tool: "resolve_question",
    input: { questionId: "q-1", expectedVersion: 0 },
    operation: "resolveQuestion" as const,
    allowed: false,
  },
  {
    label: "coach daily digest",
    role: "lab_coach" as const,
    message: "Generate the daily radar digest",
    tool: "format_daily_digest",
    input: { localDate: "2026-09-18" },
    operation: "formatDailyDigest" as const,
    allowed: true,
  },
  {
    label: "learner daily digest denial",
    role: "learner" as const,
    message: "Generate the daily radar digest",
    tool: "format_daily_digest",
    input: { localDate: "2026-09-18" },
    operation: "formatDailyDigest" as const,
    allowed: false,
  },
  {
    label: "learner official resource search",
    role: "learner" as const,
    message: "Search official external course documentation",
    tool: "search_web",
    input: { query: "official EasyGame course documentation" },
    operation: "searchWeb" as const,
    allowed: true,
  },
  {
    label: "coach official resource search",
    role: "lab_coach" as const,
    message: "Search official external course documentation",
    tool: "search_web",
    input: { query: "official EasyGame course documentation" },
    operation: "searchWeb" as const,
    allowed: true,
  },
];

describe("US-B3 AC4 — radar authorization and complete tool set", () => {
  it.each(cases)("enforces $label", async (scenario) => {
    const adapters = operations();
    const model = scenario.allowed
      ? toolModel(scenario.tool, scenario.input)
      : new MockLanguageModelV3();
    const run = await createCourseAgent({
      model,
      evidence: { findVerifiedNotices: vi.fn(async () => []) },
      operations: adapters,
    }).run({
      actor: actor(scenario.role),
      guildId: "guild-a" as GuildId,
      message: scenario.message,
    });

    if (scenario.allowed) {
      expect(adapters[scenario.operation]).toHaveBeenCalledTimes(1);
      expect(adapters[scenario.operation]).toHaveBeenCalledWith(
        expect.objectContaining({ guildId: "guild-a" }),
      );
      expect(run.trace.map((event) => event.type)).toEqual([
        "decision",
        "tool_call",
        "observation",
      ]);
      expect(
        model.doGenerateCalls[0].tools?.map((candidate) => candidate.name),
      ).toEqual([scenario.tool]);
      if (scenario.tool === "create_staff_alert") {
        expect(adapters.createStaffAlert).not.toHaveBeenCalledWith(
          expect.objectContaining({ dm: expect.anything() }),
        );
      }
      if (scenario.tool === "evaluate_radar") {
        expect(adapters.resolveQuestion).not.toHaveBeenCalled();
      }
    } else {
      expect(run.answer.status).toBe("refused");
      expect(adapters[scenario.operation]).not.toHaveBeenCalled();
      expect(model.doGenerateCalls).toHaveLength(0);
      expect(run.trace).toHaveLength(1);
    }
  });
});
