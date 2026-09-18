import { readFileSync } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";
import { z } from "zod";

export const RoleSchema = z.enum(["learner", "lab_coach"]);
export type UserRole = z.infer<typeof RoleSchema>;

export const ToolDeclarationSchema = z.object({
  name: z.string(),
  description: z.string(),
  roles: z.array(RoleSchema).default(["learner", "lab_coach"]),
  parameters: z.record(z.string(), z.unknown()),
});

export type ToolDeclaration = z.infer<typeof ToolDeclarationSchema>;

export const ToolsConfigSchema = z.object({
  tools: z.array(ToolDeclarationSchema),
});

function getToolsYamlPath(): string {
  return join(process.cwd(), "app", "backend", "artifacts", "tools.yaml");
}

/**
 * Loads and parses tools.yaml using Zod schema validation.
 * Optionally filters by user role ('learner' | 'lab_coach').
 */
export function loadConfiguredTools(role?: UserRole): ToolDeclaration[] {
  const filePath = getToolsYamlPath();
  const yamlContent = readFileSync(filePath, "utf8");
  const parsed = yamlLoad(yamlContent);
  const validated = ToolsConfigSchema.parse(parsed);

  if (!role) {
    return validated.tools;
  }

  return validated.tools.filter((t) => t.roles.includes(role));
}

/**
 * Checks whether a specific tool name is authorized for the given role.
 */
export function isToolAllowedForRole(
  toolName: string,
  role: UserRole = "learner",
): boolean {
  if (role === "lab_coach") {
    // Lab Coach has access to all tools (Learner tools + Coach-only tools)
    return true;
  }

  const tools = loadConfiguredTools("learner");
  return tools.some((t) => t.name === toolName);
}

/**
 * Returns a standardized, clear refusal reason when a role lacks permission.
 */
export function getRolePermissionReason(
  toolOrIntent: string,
  role: UserRole = "learner",
): string {
  const toolDescriptions: Record<string, string> = {
    broadcast_notification: "phát thông báo chung / official announcement",
    check_student_profile: "tra cứu hồ sơ và thông tin học viên",
    check_scores: "tra cứu điểm số và tình trạng nộp bài của học viên",
    resolve_question: "quản lý và đóng tickets hỗ trợ",
    format_daily_digest: "tổng hợp bản tin radar 22:00",
    create_staff_alert: "tạo cảnh báo nội bộ vào kênh trợ giảng #ta-radar",
  };

  const actionDesc =
    toolDescriptions[toolOrIntent] || `sử dụng công cụ '${toolOrIntent}'`;
  const roleLabel = role === "learner" ? "Học viên (Learner)" : role;

  return `Yêu cầu bị từ chối: Bạn đang đăng nhập với vai trò ${roleLabel}. Tính năng ${actionDesc} chỉ dành riêng cho Trợ giảng (Lab Coach). Vui lòng liên hệ Lab Coach để được hỗ trợ.`;
}

/**
 * Checks whether a user inquiry targets a tool not authorized for their role.
 * Returns { allowed: false, reason, tool } if unauthorized.
 */
export function validateQueryRolePermission(
  query: string,
  role: UserRole = "learner",
): { allowed: boolean; reason?: string; tool?: string } {
  if (role === "lab_coach") {
    return { allowed: true };
  }

  const q = query.toLowerCase();

  // 1. Broadcast announcements
  if (
    q.includes("phát thông báo") ||
    q.includes("broadcast") ||
    q.includes("thông báo toàn khóa") ||
    q.includes("đăng thông báo mới") ||
    q.includes("gửi thông báo chính thức") ||
    q.includes("broadcast_notification")
  ) {
    return {
      allowed: false,
      tool: "broadcast_notification",
      reason: getRolePermissionReason("broadcast_notification", "learner"),
    };
  }

  // 2. Check student scores
  if (
    q.includes("xem điểm") ||
    q.includes("tra cứu điểm") ||
    q.includes("điểm số") ||
    q.includes("kết quả chấm") ||
    q.includes("bảng điểm") ||
    q.includes("check score") ||
    q.includes("check_scores")
  ) {
    return {
      allowed: false,
      tool: "check_scores",
      reason: getRolePermissionReason("check_scores", "learner"),
    };
  }

  // 3. Check student profile
  if (
    q.includes("profile") ||
    q.includes("thông tin học viên") ||
    q.includes("tra cứu học viên") ||
    q.includes("hồ sơ học viên") ||
    q.includes("check_student_profile")
  ) {
    return {
      allowed: false,
      tool: "check_student_profile",
      reason: getRolePermissionReason("check_student_profile", "learner"),
    };
  }

  // 4. Ticket resolution & Staff alerts
  if (
    q.includes("đóng ticket") ||
    q.includes("resolve ticket") ||
    q.includes("resolve_question") ||
    q.includes("staff alert") ||
    q.includes("tạo staff alert") ||
    q.includes("tạo cảnh báo staff") ||
    q.includes("create staff alert") ||
    q.includes("create_staff_alert")
  ) {
    return {
      allowed: false,
      tool: "create_staff_alert",
      reason: getRolePermissionReason("create_staff_alert", "learner"),
    };
  }

  return { allowed: true };
}
