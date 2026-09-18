import { stepCountIs, tool, ToolLoopAgent } from "ai";
import { z } from "zod";
import { finalizeAnswer } from "../logistics/finalize";
import type {
  AnswerLogisticsResult,
  LogisticsTopic,
  VerifiedNotice,
} from "../logistics/contracts";
import type {
  AgentTraceEvent,
  CourseAgent,
  CourseAgentDependencies,
} from "./contracts";

const FALLBACK_BODY =
  "There is no verified notice for this question. Please ask a Lab Coach for confirmation.";
const CLARIFY_BODY =
  "Which lab, milestone, or course policy are you asking about?";
const REFUSAL_BODY =
  "I can only help with verified course logistics and policies.";

type NoticeObservation =
  | { status: "found"; notice: VerifiedNotice; matchedCount: number }
  | { status: "missing"; matchedCount: 0 }
  | { status: "conflict"; matchedCount: number };

function providerName(deps: CourseAgentDependencies): string {
  if (deps.provider) return deps.provider;
  return typeof deps.model === "string" ? "ai-gateway" : deps.model.provider;
}

function modelName(deps: CourseAgentDependencies): string {
  if (deps.modelId) return deps.modelId;
  return typeof deps.model === "string" ? deps.model : deps.model.modelId;
}

function classifyTopic(message: string): LogisticsTopic | null {
  const normalized = message.toLowerCase();
  if (/lab[ -]?1\b/.test(normalized)) return "lab-1";
  if (/lab[ -]?2\b/.test(normalized)) return "lab-2";
  if (/attendance|điểm danh/.test(normalized)) return "attendance";
  if (/checkpoint|cp[ -]?1\b/.test(normalized)) return "checkpoint";
  return null;
}

function refusalReason(message: string): string | null {
  const normalized = message.trim().toLowerCase();
  if (
    /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/.test(normalized) ||
    /bỏ qua (?:các )?chỉ dẫn/.test(normalized) ||
    /(?:reveal|show|print).{0,20}system prompt/.test(normalized) ||
    /you are now (?:the )?/.test(normalized)
  ) {
    return "Refused adversarial prompt override";
  }
  if (
    /(?:write|solve|give|generate|fix).{0,30}(?:code|homework)/.test(
      normalized,
    ) ||
    /(?:code|homework).{0,30}(?:for me|solution)/.test(normalized) ||
    /giải (?:hộ|bài tập)|viết code|làm hộ/i.test(normalized)
  ) {
    return "Refused out-of-scope solution request";
  }
  if (
    /\b(?:my|private|personal)\s+(?:grade|score|extension)\b/.test(
      normalized,
    ) ||
    /(?:điểm số|bảng điểm|điểm thi|điểm của em|điểm cá nhân|bao nhiêu điểm|xem điểm|tra cứu điểm)/i.test(
      normalized,
    ) ||
    /(?:xin gia hạn|gia hạn cho em|gia hạn cá nhân)/i.test(normalized)
  ) {
    return "Refused private learner record request";
  }
  return null;
}

type OperationIntent =
  | { tool: "evaluate_radar" }
  | { tool: "create_staff_alert"; coachOnly: true }
  | { tool: "resolve_question"; coachOnly: true }
  | { tool: "format_daily_digest"; coachOnly: true }
  | { tool: "search_web" };

function classifyOperation(message: string): OperationIntent | null {
  const normalized = message.trim().toLowerCase();
  if (/\b(?:create|queue|send)\b.{0,30}\bstaff alert\b/.test(normalized)) {
    return { tool: "create_staff_alert", coachOnly: true };
  }
  if (/\bresolve\b.{0,30}\bquestion\b/.test(normalized)) {
    return { tool: "resolve_question", coachOnly: true };
  }
  if (
    /\b(?:daily|22:00)\b.{0,20}\b(?:radar )?digest\b|\bgenerate\b.{0,20}\bdigest\b/.test(
      normalized,
    )
  ) {
    return { tool: "format_daily_digest", coachOnly: true };
  }
  if (
    /\b(?:search|find)\b.{0,30}\b(?:official|external|documentation|resource)/.test(
      normalized,
    )
  ) {
    return { tool: "search_web" };
  }
  if (/\b(?:radar|scan unanswered|sla)\b/.test(normalized)) {
    return { tool: "evaluate_radar" };
  }
  return null;
}

function safeOperationBody(candidate: string): string {
  const body = candidate.trim();
  if (!body || Array.from(body).length > 300) return "Operation completed.";
  const sentences = [
    ...new Intl.Segmenter("en", { granularity: "sentence" }).segment(body),
  ].length;
  return sentences <= 3 ? body : "Operation completed.";
}

async function runOperation(
  deps: CourseAgentDependencies,
  request: Parameters<CourseAgent["run"]>[0],
  intent: OperationIntent,
) {
  const trace: AgentTraceEvent[] = [
    {
      type: "decision",
      summary: `${intent.tool} required for classified request`,
    },
  ];
  const operations = deps.operations;
  if (!operations) {
    return {
      answer: fallback("Required operation adapter is unavailable"),
      trace,
      provider: providerName(deps),
      model: modelName(deps),
    };
  }

  if ("coachOnly" in intent && request.actor.role !== "lab_coach") {
    return {
      answer: {
        status: "refused" as const,
        body: REFUSAL_BODY,
        source: null,
        decisionSummary: "Refused staff-only operation",
      },
      trace: [
        { type: "decision" as const, summary: "Refused staff-only operation" },
      ],
      provider: providerName(deps),
      model: modelName(deps),
    };
  }

  let observed = false;
  const recordCall = (summary: string) => {
    trace.push({ type: "tool_call", tool: intent.tool, summary });
  };
  const recordObservation = (summary: string) => {
    observed = true;
    trace.push({ type: "observation", tool: intent.tool, summary });
  };

  const allTools = {
    evaluate_radar: tool({
      description:
        "Evaluate unresolved guild questions against the 120/240 minute SLA tiers.",
      inputSchema: z.object({ now: z.string().datetime().optional() }),
      execute: async ({ now }) => {
        recordCall("Evaluating unanswered radar questions");
        const output = await operations.evaluateRadar({
          guildId: request.guildId,
          now,
        });
        recordObservation("Radar evaluation completed");
        return output;
      },
    }),
    create_staff_alert: tool({
      description:
        "Queue one staff-only radar alert. Never sends a direct message.",
      inputSchema: z.object({
        questionId: z.string().min(1),
        tier: z.union([z.literal(1), z.literal(2)]),
        summary: z.string().min(1).max(300),
      }),
      execute: async ({ questionId, tier, summary }) => {
        recordCall("Queueing staff-only radar alert");
        const output = await operations.createStaffAlert({
          guildId: request.guildId,
          actorId: request.actor.userId,
          actorRole: "lab_coach",
          questionId,
          tier,
          summary,
        });
        recordObservation("Staff-only alert queued");
        return output;
      },
    }),
    resolve_question: tool({
      description:
        "Resolve a question with optimistic concurrency after Lab Coach authorization.",
      inputSchema: z.object({
        questionId: z.string().min(1),
        expectedVersion: z.number().int().nonnegative(),
      }),
      execute: async ({ questionId, expectedVersion }) => {
        recordCall("Resolving question with version check");
        const output = await operations.resolveQuestion({
          guildId: request.guildId,
          actorId: request.actor.userId,
          actorRole: "lab_coach",
          questionId,
          expectedVersion,
        });
        recordObservation("Question resolution completed");
        return output;
      },
    }),
    format_daily_digest: tool({
      description:
        "Format the staff-only daily radar digest for a local calendar date.",
      inputSchema: z.object({ localDate: z.iso.date() }),
      execute: async ({ localDate }) => {
        recordCall("Formatting staff-only daily digest");
        const output = await operations.formatDailyDigest({
          guildId: request.guildId,
          actorId: request.actor.userId,
          actorRole: "lab_coach",
          localDate,
        });
        recordObservation("Daily digest formatted");
        return output;
      },
    }),
    search_web: tool({
      description:
        "Search official external course documentation only when explicitly requested.",
      inputSchema: z.object({ query: z.string().min(1).max(500) }),
      execute: async ({ query }) => {
        recordCall("Searching official external course resources");
        const output = await operations.searchWeb({
          guildId: request.guildId,
          query,
        });
        recordObservation("Official resource search completed");
        return output;
      },
    }),
  };
  const selectedTools = { [intent.tool]: allTools[intent.tool] };
  const agent = new ToolLoopAgent({
    model: deps.model,
    instructions: `Call ${intent.tool} exactly once. Authority and guild are already bound by the server. Do not call any other tool.`,
    tools: selectedTools,
    activeTools: [intent.tool],
    stopWhen: stepCountIs(3),
    temperature: 0,
    include: { requestBody: false, responseBody: false },
  });
  const generated = await agent.generate({ prompt: request.message });
  return {
    answer: observed
      ? {
          status: "completed" as const,
          body: safeOperationBody(generated.text),
          source: null,
          decisionSummary: `${intent.tool} completed through authorized adapter`,
        }
      : fallback("Required tool was not executed"),
    trace,
    provider: providerName(deps),
    model: modelName(deps),
  };
}

function fallback(summary: string): AnswerLogisticsResult {
  return {
    status: "fallback",
    body: FALLBACK_BODY,
    source: null,
    alert: "not_queued",
    decisionSummary: summary,
  };
}

function selectNotice(notices: readonly VerifiedNotice[]): NoticeObservation {
  const sorted = [...notices]
    .filter((notice) => Number.isFinite(Date.parse(notice.publishedAt)))
    .sort(
      (left, right) =>
        Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
    );
  const latest = sorted[0];
  if (!latest) return { status: "missing", matchedCount: 0 };

  const conflict = sorted.some(
    (candidate) =>
      candidate !== latest &&
      Date.parse(candidate.publishedAt) === Date.parse(latest.publishedAt) &&
      candidate.answer.trim() !== latest.answer.trim(),
  );
  if (conflict) return { status: "conflict", matchedCount: sorted.length };
  return { status: "found", notice: latest, matchedCount: sorted.length };
}

export function createCourseAgent(deps: CourseAgentDependencies): CourseAgent {
  return {
    async run(request) {
      if (request.actor.guildId !== request.guildId) {
        throw new Error("Forbidden guild scope");
      }

      const refused = refusalReason(request.message);
      if (refused) {
        return {
          answer: {
            status: "refused",
            body: REFUSAL_BODY,
            source: null,
            decisionSummary: refused,
          },
          trace: [{ type: "decision", summary: refused }],
          provider: providerName(deps),
          model: modelName(deps),
        };
      }

      const operation = classifyOperation(request.message);
      if (operation) return runOperation(deps, request, operation);

      const topicKey = classifyTopic(request.message);
      if (!topicKey) {
        return {
          answer: {
            status: "clarify",
            body: CLARIFY_BODY,
            source: null,
            decisionSummary: "Clarifying ambiguous logistics topic",
          },
          trace: [
            {
              type: "decision",
              summary: "Clarification required before tool use",
            },
          ],
          provider: providerName(deps),
          model: modelName(deps),
        };
      }

      const trace: AgentTraceEvent[] = [
        {
          type: "decision",
          summary: `Verified notice lookup required for ${topicKey}`,
        },
      ];
      let observation: NoticeObservation | undefined;

      const tools = {
        query_notices: tool({
          description:
            "Read verified official notices for the classified logistics topic. Use exactly once for a logistics answer.",
          inputSchema: z.object({
            topicKey: z.string().min(1).describe("Classified logistics topic"),
          }),
          execute: async ({ topicKey: requestedTopic }) => {
            trace.push({
              type: "tool_call",
              tool: "query_notices",
              summary: `Querying verified notices for ${requestedTopic}`,
            });
            const notices = await deps.evidence.findVerifiedNotices({
              guildId: request.guildId,
              topicKey,
            });
            observation = selectNotice(notices);
            trace.push({
              type: "observation",
              tool: "query_notices",
              summary:
                observation.status === "found"
                  ? `Found ${observation.matchedCount} verified notice(s); selected latest timestamp`
                  : observation.status === "conflict"
                    ? `Found ${observation.matchedCount} notices with a conflicting latest timestamp`
                    : "No verified notice found",
            });
            return observation;
          },
        }),
      };

      const agent = new ToolLoopAgent({
        model: deps.model,
        instructions:
          "Use query_notices exactly once. After observing it, repeat only the selected notice answer. Never invent or modify dates, policy, guild, role, or source links.",
        tools,
        activeTools: ["query_notices"],
        stopWhen: stepCountIs(3),
        temperature: 0,
        include: { requestBody: false, responseBody: false },
      });

      let generatedText: string | undefined;
      try {
        generatedText = (await agent.generate({ prompt: request.message }))
          .text;
      } catch {
        generatedText = undefined;
      }
      let answer: AnswerLogisticsResult;
      if (!observation || observation.status === "missing") {
        answer = fallback("No verified evidence for topic");
      } else if (observation.status === "conflict") {
        answer = {
          status: "clarify",
          body: CLARIFY_BODY,
          source: null,
          decisionSummary: "Clarifying tied conflicting notices",
        };
      } else {
        answer = finalizeAnswer(
          generatedText ?? observation.notice.answer,
          observation.notice,
          request.guildId,
        );
      }

      return {
        answer,
        trace,
        provider: providerName(deps),
        model: modelName(deps),
      };
    },
  };
}
