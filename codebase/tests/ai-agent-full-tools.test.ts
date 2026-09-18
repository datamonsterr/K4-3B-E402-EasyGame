import { describe, expect, it, vi } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { createCourseAgent } from "../app/backend/assistant/agent/agent";
import {
  loadConfiguredTools,
  isToolAllowedForRole,
  validateQueryRolePermission,
  getRolePermissionReason,
} from "../app/backend/assistant/agent/tool-registry";
import type { AgentOperations } from "../app/backend/assistant/agent/contracts";
import type {
  Actor,
  ActorId,
  GuildId,
} from "../app/backend/assistant/logistics/contracts";

const usage = {
  inputTokens: {
    total: 4,
    noCache: 4,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 4, text: 4, reasoning: undefined },
};

function toolModel(
  toolName: string,
  input: Record<string, unknown>,
  outputText = "Operation completed.",
) {
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
        content: [{ type: "text" as const, text: outputText }],
        finishReason: { unified: "stop" as const, raw: undefined },
        usage,
        warnings: [],
      },
    ],
  });
}

function mockOperations() {
  return {
    evaluateRadar: vi.fn(async (input) => ({
      guildId: input.guildId,
      items: [],
      urgentBreaches: 0,
      softWarnings: 0,
    })),
    createStaffAlert: vi.fn(async (input) => ({ id: "alert-1", ...input })),
    resolveQuestion: vi.fn(async (input) => ({ success: true, ...input })),
    formatDailyDigest: vi.fn(async (input) => ({ title: "Digest", ...input })),
    searchWeb: vi.fn(async (input) => ({ query: input.query, results: [] })),
    broadcastNotification: vi.fn(async (input) => ({
      ok: true,
      noticeId: "notice-123",
      publishedAt: "2026-09-18T12:00:00Z",
      ...input,
    })),
    checkStudentProfile: vi.fn(async (input) => ({
      studentQuery: input.studentQuery,
      studentId: "student-456",
      role: "learner",
      activity: "Active in 3 channels",
    })),
    checkScores: vi.fn(async (input) => ({
      studentQuery: input.studentQuery,
      lab: input.lab || "lab-1",
      score: 9.5,
      submissionStatus: "submitted_on_time",
    })),
  } satisfies AgentOperations;
}

describe("AI Agent Tools Configuration & Role-Based Registry", () => {
  it("loads and parses tools.yaml with roles schema", () => {
    const allTools = loadConfiguredTools();
    expect(allTools.length).toBeGreaterThanOrEqual(9);

    const toolNames = allTools.map((t) => t.name);
    expect(toolNames).toContain("query_notices");
    expect(toolNames).toContain("search_web");
    expect(toolNames).toContain("evaluate_radar");
    expect(toolNames).toContain("create_staff_alert");
    expect(toolNames).toContain("resolve_question");
    expect(toolNames).toContain("format_daily_digest");
    expect(toolNames).toContain("broadcast_notification");
    expect(toolNames).toContain("check_student_profile");
    expect(toolNames).toContain("check_scores");

    for (const tool of allTools) {
      expect(tool.roles).toBeDefined();
      expect(tool.roles.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("filters tools available strictly for Learner role", () => {
    const learnerTools = loadConfiguredTools("learner");
    const names = learnerTools.map((t) => t.name);

    expect(names).toContain("query_notices");
    expect(names).toContain("search_web");
    expect(names).toContain("evaluate_radar");

    // Coach-only tools must not be present in learner tools
    expect(names).not.toContain("broadcast_notification");
    expect(names).not.toContain("check_student_profile");
    expect(names).not.toContain("check_scores");
    expect(names).not.toContain("resolve_question");
    expect(names).not.toContain("create_staff_alert");
    expect(names).not.toContain("format_daily_digest");
  });

  it("grants Lab Coach access to ALL learner tools plus staff-only tools", () => {
    const coachTools = loadConfiguredTools("lab_coach");
    const names = coachTools.map((t) => t.name);

    // Learner tools
    expect(names).toContain("query_notices");
    expect(names).toContain("search_web");
    expect(names).toContain("evaluate_radar");

    // Staff tools
    expect(names).toContain("broadcast_notification");
    expect(names).toContain("check_student_profile");
    expect(names).toContain("check_scores");
    expect(names).toContain("resolve_question");
    expect(names).toContain("create_staff_alert");
    expect(names).toContain("format_daily_digest");

    expect(isToolAllowedForRole("broadcast_notification", "lab_coach")).toBe(
      true,
    );
    expect(isToolAllowedForRole("check_student_profile", "lab_coach")).toBe(
      true,
    );
    expect(isToolAllowedForRole("check_scores", "lab_coach")).toBe(true);
    expect(isToolAllowedForRole("broadcast_notification", "learner")).toBe(
      false,
    );
  });
});

describe("AI Agent Out-of-Permission Inquiries & Explicit Refusal Reasons", () => {
  it("rejects learner broadcast announcement inquiries with clear reason", () => {
    const check = validateQueryRolePermission(
      "Phát thông báo lùi deadline Lab 1 lên kênh chung",
      "learner",
    );
    expect(check.allowed).toBe(false);
    expect(check.tool).toBe("broadcast_notification");
    expect(check.reason).toContain("Học viên (Learner)");
    expect(check.reason).toContain("Trợ giảng (Lab Coach)");
    expect(check.reason).toContain("phát thông báo chung");
  });

  it("rejects learner inquiring other students' scores with clear reason", () => {
    const check = validateQueryRolePermission(
      "Xem điểm của bạn Nguyễn Văn An trong lab 1",
      "learner",
    );
    expect(check.allowed).toBe(false);
    expect(check.tool).toBe("check_scores");
    expect(check.reason).toContain("Học viên (Learner)");
    expect(check.reason).toContain("tra cứu điểm số");
  });

  it("rejects learner checking other student profiles with clear reason", () => {
    const check = validateQueryRolePermission(
      "Cho mình xem profile của bạn Tran Minh",
      "learner",
    );
    expect(check.allowed).toBe(false);
    expect(check.tool).toBe("check_student_profile");
    expect(check.reason).toContain("Học viên (Learner)");
    expect(check.reason).toContain("tra cứu hồ sơ và thông tin học viên");
  });

  it("provides comprehensive refusal reason message", () => {
    const reason = getRolePermissionReason("broadcast_notification", "learner");
    expect(reason).toContain("Yêu cầu bị từ chối");
    expect(reason).toContain("Học viên (Learner)");
    expect(reason).toContain("Trợ giảng (Lab Coach)");
  });
});

describe("AI SDK Agent Tool Execution for Lab Coach Super-Agent", () => {
  const coachActor: Actor = {
    userId: "coach-viet-123" as ActorId,
    guildId: "guild-e402" as GuildId,
    role: "lab_coach",
  };

  const learnerActor: Actor = {
    userId: "learner-an-456" as ActorId,
    guildId: "guild-e402" as GuildId,
    role: "learner",
  };

  it("allows Lab Coach to execute broadcast_notification tool via AI SDK", async () => {
    const ops = mockOperations();
    const model = toolModel("broadcast_notification", {
      topicKey: "lab-1",
      title: "Gia hạn nộp bài Lab 1",
      content: "Deadline Lab 1 được lùi thêm 24 giờ cho tất cả học viên.",
    });

    const agent = createCourseAgent({
      model,
      evidence: { findVerifiedNotices: vi.fn(async () => []) },
      operations: ops,
    });

    const result = await agent.run({
      actor: coachActor,
      guildId: "guild-e402" as GuildId,
      message: "Broadcast thông báo lùi hạn nộp bài Lab 1 thêm 24 giờ",
    });

    expect(result.answer.status).toBe("completed");
    expect(ops.broadcastNotification).toHaveBeenCalledTimes(1);
    expect(ops.broadcastNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: "guild-e402",
        actorId: "coach-viet-123",
        actorRole: "lab_coach",
        topicKey: "lab-1",
      }),
    );
    expect(result.trace.map((t) => t.type)).toEqual([
      "decision",
      "tool_call",
      "observation",
    ]);
  });

  it("allows Lab Coach to execute check_student_profile tool via AI SDK", async () => {
    const ops = mockOperations();
    const model = toolModel("check_student_profile", {
      studentQuery: "Nguyen Van An",
    });

    const agent = createCourseAgent({
      model,
      evidence: { findVerifiedNotices: vi.fn(async () => []) },
      operations: ops,
    });

    const result = await agent.run({
      actor: coachActor,
      guildId: "guild-e402" as GuildId,
      message: "Tra cứu hồ sơ học viên Nguyen Van An",
    });

    expect(result.answer.status).toBe("completed");
    expect(ops.checkStudentProfile).toHaveBeenCalledTimes(1);
    expect(ops.checkStudentProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: "guild-e402",
        actorRole: "lab_coach",
        studentQuery: "Nguyen Van An",
      }),
    );
  });

  it("allows Lab Coach to execute check_scores tool via AI SDK", async () => {
    const ops = mockOperations();
    const model = toolModel("check_scores", {
      studentQuery: "Le Thi B",
      lab: "lab-2",
    });

    const agent = createCourseAgent({
      model,
      evidence: { findVerifiedNotices: vi.fn(async () => []) },
      operations: ops,
    });

    const result = await agent.run({
      actor: coachActor,
      guildId: "guild-e402" as GuildId,
      message: "Check score của học viên Le Thi B trong lab-2",
    });

    expect(result.answer.status).toBe("completed");
    expect(ops.checkScores).toHaveBeenCalledTimes(1);
    expect(ops.checkScores).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: "guild-e402",
        actorRole: "lab_coach",
        studentQuery: "Le Thi B",
      }),
    );
  });

  it("strictly refuses when a Learner tries to invoke broadcast_notification", async () => {
    const ops = mockOperations();
    const model = new MockLanguageModelV3();

    const agent = createCourseAgent({
      model,
      evidence: { findVerifiedNotices: vi.fn(async () => []) },
      operations: ops,
    });

    const result = await agent.run({
      actor: learnerActor,
      guildId: "guild-e402" as GuildId,
      message: "Phát thông báo chính thức hoãn deadline Lab 1",
    });

    expect(result.answer.status).toBe("refused");
    expect(result.answer.body).toContain("Học viên (Learner)");
    expect(result.answer.body).toContain("Trợ giảng (Lab Coach)");
    expect(ops.broadcastNotification).not.toHaveBeenCalled();
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it("strictly refuses when a Learner tries to check other student scores", async () => {
    const ops = mockOperations();
    const model = new MockLanguageModelV3();

    const agent = createCourseAgent({
      model,
      evidence: { findVerifiedNotices: vi.fn(async () => []) },
      operations: ops,
    });

    const result = await agent.run({
      actor: learnerActor,
      guildId: "guild-e402" as GuildId,
      message: "Xem điểm của bạn Nguyễn Văn A",
    });

    expect(result.answer.status).toBe("refused");
    expect(ops.checkScores).not.toHaveBeenCalled();
    expect(model.doGenerateCalls).toHaveLength(0);
  });
});
