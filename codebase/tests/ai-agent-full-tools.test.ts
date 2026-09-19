import { describe, expect, it } from "vitest";
import {
  getRolePermissionReason,
  isToolAllowedForRole,
  loadAgentArtifacts,
  loadConfiguredTools,
  ToolDeclarationSchema,
  validateQueryRolePermission,
} from "../app/backend/assistant/agent/tool-registry";

describe("active tool allowlist", () => {
  it("contains only the six real, declared tools", () => {
    expect(loadConfiguredTools().map((tool) => tool.name)).toEqual([
      "query_notices",
      "search_web",
      "evaluate_radar",
      "create_staff_alert",
      "resolve_question",
      "format_daily_digest",
    ]);
  });

  it("keeps mutations and digest coach-only", () => {
    expect(loadConfiguredTools("learner").map((tool) => tool.name)).toEqual([
      "query_notices",
      "search_web",
      "evaluate_radar",
    ]);
    expect(loadConfiguredTools("lab_coach").map((tool) => tool.name)).toEqual([
      "query_notices",
      "search_web",
      "evaluate_radar",
      "create_staff_alert",
      "resolve_question",
      "format_daily_digest",
    ]);
  });

  it("fails closed for undeclared tools even for coaches", () => {
    expect(isToolAllowedForRole("create_staff_alert", "lab_coach")).toBe(true);
    expect(isToolAllowedForRole("create_staff_alert", "learner")).toBe(false);
    expect(isToolAllowedForRole("broadcast_notification", "lab_coach")).toBe(
      false,
    );
    expect(isToolAllowedForRole("check_student_profile", "lab_coach")).toBe(
      false,
    );
    expect(isToolAllowedForRole("check_scores", "lab_coach")).toBe(false);
    expect(isToolAllowedForRole("unknown_tool", "lab_coach")).toBe(false);
  });

  it("requires every artifact tool to declare at least one role", () => {
    expect(() =>
      ToolDeclarationSchema.parse({
        name: "unsafe_default",
        description: "Must not silently become learner-accessible.",
        parameters: {},
      }),
    ).toThrow();
    expect(() =>
      ToolDeclarationSchema.parse({
        name: "unsafe_empty",
        description: "Must not silently become inaccessible policy.",
        roles: [],
        parameters: {},
      }),
    ).toThrow();
  });

  it("loads the active system prompt together with the active tool policy", () => {
    const artifacts = loadAgentArtifacts();
    expect(artifacts.instructions).toContain(
      "Tool observations are the sole source of database facts",
    );
    expect(artifacts.tools).toEqual(loadConfiguredTools());
  });
});

describe("explicit refusal reasons", () => {
  it.each([
    ["Phát thông báo lùi deadline Lab 1", "broadcast_notification"],
    ["Xem điểm của bạn Nguyễn Văn An", "check_scores"],
    ["Cho mình xem profile của bạn Trần Minh", "check_student_profile"],
    ["Tạo staff alert cho ticket này", "create_staff_alert"],
  ])("rejects unsupported or staff-only learner request: %s", (query, tool) => {
    expect(validateQueryRolePermission(query, "learner")).toEqual(
      expect.objectContaining({ allowed: false, tool }),
    );
  });

  it("explains that a staff-only action requires a coach", () => {
    const reason = getRolePermissionReason("create_staff_alert", "learner");
    expect(reason).toContain("Học viên (Learner)");
    expect(reason).toContain("Trợ giảng (Lab Coach)");
  });
});
