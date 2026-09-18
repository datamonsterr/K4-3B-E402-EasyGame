import {
  executeQueryNotices,
  type QueryNoticesArgs,
} from "./query_notices/tool";
import {
  executeEvaluateRadar,
  type EvaluateRadarArgs,
} from "./evaluate_radar/tool";
import {
  executeCreateStaffAlert,
  type CreateStaffAlertArgs,
} from "./create_staff_alert/tool";
import {
  executeResolveQuestion,
  type ResolveQuestionArgs,
} from "./resolve_question/tool";
import {
  executeFormatDailyDigest,
  type FormatDailyDigestArgs,
} from "./format_daily_digest/tool";
import { executeSearchWeb, type SearchWebArgs } from "./search_web/tool";

export { answerLogistics as queryNotices } from "../assistant";
export { evaluateRadar } from "../radar";

export {
  executeQueryNotices,
  fetchNoticesFromDb,
  type QueryNoticesArgs,
  type QueryNoticesOutput,
} from "./query_notices/tool";

export {
  executeEvaluateRadar,
  fetchQuestionsFromDb,
  type EvaluateRadarArgs,
  type EvaluateRadarOutput,
  type RadarMetrics,
  type RadarQuestionWithMeta,
} from "./evaluate_radar/tool";

export {
  executeCreateStaffAlert,
  getStaffAlerts,
  clearStaffAlerts,
  type CreateStaffAlertArgs,
  type StaffAlert,
} from "./create_staff_alert/tool";

export {
  executeResolveQuestion,
  resetMemoryQuestions,
  type ResolveQuestionArgs,
  type ResolveQuestionOutput,
} from "./resolve_question/tool";

export {
  executeFormatDailyDigest,
  sanitizeVietnamese,
  type FormatDailyDigestArgs,
  type DailyDigestOutput,
} from "./format_daily_digest/tool";

export {
  executeSearchWeb,
  type SearchWebArgs,
  type SearchWebOutput,
  type SearchWebResultItem,
  type SearchWebOptions,
} from "./search_web/tool";

export { getToolDbClient, isDbConfigured } from "./db";

export interface ToolExecutionResult {
  name: string;
  args: Record<string, unknown>;
  output: unknown;
  outputSummary: string;
}

/**
 * Universal tool executor function.
 * Routes execution to the corresponding tool handler by tool name and returns the result.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "query_notices":
      return executeQueryNotices(args as unknown as QueryNoticesArgs);
    case "evaluate_radar":
      return executeEvaluateRadar(args as unknown as EvaluateRadarArgs);
    case "create_staff_alert":
      return executeCreateStaffAlert(args as unknown as CreateStaffAlertArgs);
    case "resolve_question":
      return executeResolveQuestion(args as unknown as ResolveQuestionArgs);
    case "format_daily_digest":
      return executeFormatDailyDigest(args as unknown as FormatDailyDigestArgs);
    case "search_web":
      return executeSearchWeb(args as unknown as SearchWebArgs);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
