export { createCourseAgent } from "./agent";
export {
  createAgentModel,
  createAgentModelFromEnvironment,
  resolveModelConfig,
} from "./models";
export { createSupabaseAgentOperations } from "./operations";
export {
  loadConfiguredTools,
  isToolAllowedForRole,
  getRolePermissionReason,
  validateQueryRolePermission,
  ToolDeclarationSchema,
  ToolsConfigSchema,
  type ToolDeclaration,
  type UserRole,
} from "./tool-registry";
export type {
  AgentTraceEvent,
  AgentOperations,
  CourseAgent,
  CourseAgentDependencies,
  CourseAgentRun,
} from "./contracts";
