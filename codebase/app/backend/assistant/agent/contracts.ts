import type { LanguageModel } from "ai";
import type {
  AnswerLogisticsRequest,
  AnswerLogisticsResult,
  NoticeEvidenceSource,
} from "../logistics/contracts";

export type AgentTraceEvent =
  | { type: "decision"; summary: string }
  | { type: "tool_call"; tool: string; summary: string }
  | { type: "observation"; tool: string; summary: string };

export type CourseAgentRun = {
  answer: AnswerLogisticsResult;
  trace: readonly AgentTraceEvent[];
  provider: string;
  model: string;
};

export interface CourseAgent {
  run(request: AnswerLogisticsRequest): Promise<CourseAgentRun>;
}

export interface AgentOperations {
  evaluateRadar(input: { guildId: string; now?: string }): Promise<unknown>;
  createStaffAlert(input: {
    guildId: string;
    actorId: string;
    actorRole: "lab_coach";
    questionId: string;
    tier: 1 | 2;
    summary: string;
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
  }): Promise<unknown>;
  searchWeb(input: { guildId: string; query: string }): Promise<unknown>;
}

export type CourseAgentDependencies = {
  model: LanguageModel;
  evidence: NoticeEvidenceSource;
  provider?: string;
  modelId?: string;
  operations?: AgentOperations;
};
