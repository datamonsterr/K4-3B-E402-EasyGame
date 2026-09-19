import type { LanguageModel } from "ai";
import type {
  AnswerLogisticsRequest,
  AnswerLogisticsResult,
  NoticeEvidenceSource,
} from "../logistics/contracts";
import type { EvaluateRadarOutput } from "../../tools/evaluate_radar/tool";
import type { DailyDigestOutput } from "../../tools/format_daily_digest/tool";
import type { AgentArtifacts } from "./tool-registry";

export type AgentTraceEvent =
  | { type: "decision"; summary: string }
  | { type: "tool_call"; tool: string; summary: string }
  | { type: "observation"; tool: string; summary: string };

export type CourseAgentRun = {
  answer: AnswerLogisticsResult;
  trace: readonly AgentTraceEvent[];
  provider: string;
  model: string;
  providerAttempted: boolean;
  providerSucceeded: boolean;
  executionMode: "live_provider";
  latencyMs: number;
  selectedNoticeId?: string;
};

export interface CourseAgent {
  run(request: AnswerLogisticsRequest): Promise<CourseAgentRun>;
}

export interface AgentOperations {
  evaluateRadar(input: { guildId: string }): Promise<{
    guildId: string;
    items: unknown[];
    evaluatedAt?: string;
    metrics?: EvaluateRadarOutput["metrics"];
    urgentBreaches?: number;
    softWarnings?: number;
  }>;
  createStaffAlert(input: {
    guildId: string;
    actorId: string;
    actorRole: "lab_coach";
    questionId: string;
    tier: 1 | 2;
    summary: string;
    idempotencyKey?: string;
  }): Promise<unknown>;
  resolveQuestion(input: {
    guildId: string;
    actorId: string;
    actorRole: "lab_coach";
    questionId: string;
    expectedVersion: number;
  }): Promise<unknown>;
  formatDailyDigest(input: {
    guildId: string;
    actorId: string;
    actorRole: "lab_coach";
    localDate: string;
  }): Promise<DailyDigestOutput>;
  searchWeb(input: { guildId: string; query: string }): Promise<unknown>;
}

export type CourseAgentDependencies = {
  model: LanguageModel;
  evidence: NoticeEvidenceSource;
  provider?: string;
  modelId?: string;
  operations?: AgentOperations;
  artifacts?: AgentArtifacts;
};
