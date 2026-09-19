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
import {
  getRolePermissionReason,
  loadAgentArtifacts,
  validateQueryRolePermission,
  type AgentArtifacts,
  type ToolDeclaration,
} from "./tool-registry";
import { ToolOperationError } from "./operation-errors";

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

function executionEvidence(
  attempted: boolean,
  succeeded: boolean,
  startedAt: number,
) {
  return {
    providerAttempted: attempted,
    providerSucceeded: succeeded,
    executionMode: "live_provider" as const,
    latencyMs: Math.max(0, Date.now() - startedAt),
  };
}

function classifyTopic(message: string): LogisticsTopic | null {
  const normalized = message.normalize("NFKC").toLowerCase();
  const numberedTopic = normalized.match(
    /\b(lab|checkpoint|cp|assignment|milestone|project|quiz|exam)\s*[-:#]?\s*(\d+[a-z]?)\b/iu,
  );
  if (numberedTopic) {
    const family = numberedTopic[1] === "cp" ? "checkpoint" : numberedTopic[1];
    return `${family}-${numberedTopic[2]}`;
  }
  if (/attendance|điểm danh/.test(normalized)) return "attendance";
  return null;
}

function isVietnameseText(text: string): boolean {
  return (
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
      text,
    ) || /(?:chào|khi nào|mấy giờ|hạn nộp|nộp bài|bài nào|ở đâu)/i.test(text)
  );
}

function isAmbiguousLogistics(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return /(?:deadline|hạn nộp|khi nào nộp|mấy giờ nộp|nộp bài|thời hạn|quy chế|điểm danh|attendance|bao giờ nộp|khi nào hết hạn)/i.test(
    normalized,
  );
}

function classifyConversational(message: string): {
  type:
    | "greeting"
    | "wellbeing"
    | "capabilities"
    | "thanks"
    | "farewell"
    | "general";
  body: string;
  summary: string;
} | null {
  const normalized = message.trim().toLowerCase();

  // 1. Well-being: "bạn có khỏe không", "khỏe không", "bạn thế nào", "hôm nay thế nào"
  if (
    /(?:bạn có khỏe không|bạn khỏe không|khỏe không|bạn thế nào|hôm nay thế nào|sức khỏe thế nào|dạo này thế nào|how are you)/i.test(
      normalized,
    )
  ) {
    return {
      type: "wellbeing",
      body: "Mình khỏe, còn bạn thì sao? Hôm nay bạn có cần giúp gì không?",
      summary: "Answered well-being inquiry in Vietnamese",
    };
  }

  // 2. Vietnamese Greetings: "chào bạn", "chào bot", "xin chào", "alo"
  if (
    /^(?:chào(?: bạn| bot| ad| anh| chị| mn| mọi người)?|xin chào|alo|alo bot)\b/i.test(
      normalized,
    )
  ) {
    return {
      type: "greeting",
      body: "Xin chào bạn! Mình là Trợ lý Hỗ trợ Logistics của EasyGame (Lớp 3B - E402). Bạn cần hỗ trợ về hạn nộp bài, điểm danh hay thông báo chính thức nào không?",
      summary: "Greeted learner in Vietnamese",
    };
  }

  // 3. Capabilities & Identity: "bạn là ai", "bạn có thể làm gì", "bạn giúp được gì"
  if (
    /(?:bạn là ai|bạn có thể (?:làm|giúp) (?:được )?gì|khả năng của bạn|giới thiệu về bạn|bạn làm được gì)/i.test(
      normalized,
    )
  ) {
    return {
      type: "capabilities",
      body: "Mình là Trợ lý Logistics EasyGame (Lớp 3B - E402), hỗ trợ giải đáp thông báo chính thức, hạn nộp bài tập, điểm danh và các quy chế khóa học.",
      summary: "Provided capability overview in Vietnamese",
    };
  }

  // 4. Gratitude: "cảm ơn bạn", "cảm ơn bot", "thank you", "thanks"
  if (/(?:cảm ơn(?: bạn| bot| nhiều)?|thank(?:s| you)?)\b/i.test(normalized)) {
    return {
      type: "thanks",
      body: "Rất vui được hỗ trợ bạn! Chúc bạn hoàn thành tốt bài tập và theo dõi sát các thông báo của khóa học nhé.",
      summary: "Responded to learner gratitude in Vietnamese",
    };
  }

  // 5. Farewell: "tạm biệt", "bye"
  if (/(?:tạm biệt|bye(?: bye)?)\b/i.test(normalized)) {
    return {
      type: "farewell",
      body: "Tạm biệt bạn! Nếu cần tra cứu thêm thông tin hay quy chế nào, bạn cứ nhắn tin cho mình nhé.",
      summary: "Responded to learner farewell in Vietnamese",
    };
  }

  // 6. General course small talk & help requests in Vietnamese
  if (
    /(?:cần giúp đỡ|hướng dẫn giúp|bắt đầu thế nào|cho tôi hỏi|cho em hỏi|có ai ở đây không)\b/i.test(
      normalized,
    ) &&
    !/(?:deadline|hạn nộp|lab|checkpoint|điểm danh|attendance)/i.test(
      normalized,
    )
  ) {
    return {
      type: "general",
      body: "Chào bạn! Mình có thể giúp bạn tra cứu deadline các bài Lab 1, Lab 2, Checkpoint, quy định điểm danh và thông báo khóa học. Bạn đang cần thông tin gì?",
      summary: "Provided general course assistance overview in Vietnamese",
    };
  }

  return null;
}

function refusalReason(
  message: string,
  role: "learner" | "lab_coach" = "learner",
): string | null {
  const normalized = message.trim().toLowerCase();
  if (
    /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/.test(normalized) ||
    /bỏ (?:qua (?:các )?|mọi )chỉ dẫn/.test(normalized) ||
    /(?:reveal|show|print).{0,20}system prompt/.test(normalized) ||
    /you are now (?:the )?/.test(normalized)
  ) {
    return "Refused adversarial prompt override";
  }
  if (
    /tự nhận.{0,20}(?:coach|lab coach)|pretend.{0,20}(?:coach|admin)/i.test(
      normalized,
    )
  ) {
    return "Refused caller-supplied authority";
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
  if (role === "learner") {
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
  }
  return null;
}

type OperationIntent =
  | { tool: "evaluate_radar" }
  | { workflow: "alert_overdue" }
  | { workflow: "resolve_overdue" }
  | { tool: "format_daily_digest" }
  | { tool: "search_web" };

const WORKFLOWS = {
  alert_overdue: ["evaluate_radar", "create_staff_alert"],
  resolve_overdue: ["evaluate_radar", "resolve_question"],
} as const;

type RuntimeToolName =
  | "search_web"
  | "evaluate_radar"
  | "create_staff_alert"
  | "resolve_question"
  | "format_daily_digest";

function classifyOperation(message: string): OperationIntent | null {
  const normalized = message.trim().toLowerCase();
  if (
    /(?:staff alert|cảnh báo|escalat)/.test(normalized) &&
    /(?:radar|quét|scan|overdue|quá hạn|question|câu hỏi)/.test(normalized)
  ) {
    return { workflow: "alert_overdue" };
  }
  if (
    /(?:resolve|giải quyết|đóng)/.test(normalized) &&
    /(?:question|câu hỏi|ticket|radar|quá hạn)/.test(normalized)
  ) {
    return { workflow: "resolve_overdue" };
  }
  if (
    /\b(?:daily|end.of.day|generate)\b.{0,30}\b(?:radar )?digest\b|(?:bản tin|tổng hợp).{0,30}(?:cuối ngày|radar)/.test(
      normalized,
    )
  ) {
    return { tool: "format_daily_digest" };
  }
  if (
    /\b(?:search|find)\b.{0,30}\b(?:official|external|documentation|resource)/.test(
      normalized,
    )
  ) {
    return { tool: "search_web" };
  }
  if (
    /\b(?:radar|sla|unanswered|unresolved|overdue|reply)\b/.test(normalized) ||
    /(?:câu(?: hỏi| này)?|ticket).{0,40}(?:phút|quá hạn|tồn đọng|chưa (?:được )?(?:trả lời|xử lý)|phản hồi|khẩn|cấp)/i.test(
      normalized,
    ) ||
    /\b\d+\s*phút\b.{0,30}(?:khẩn|cấp)/i.test(normalized)
  ) {
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

function generationInput(request: Parameters<CourseAgent["run"]>[0]) {
  return request.history?.length
    ? {
        messages: [
          ...request.history.map((turn) => ({
            role: turn.role,
            content: turn.content,
          })),
          { role: "user" as const, content: request.message },
        ],
      }
    : { prompt: request.message };
}

async function runOperation(
  deps: CourseAgentDependencies,
  artifacts: AgentArtifacts,
  request: Parameters<CourseAgent["run"]>[0],
  intent: OperationIntent,
) {
  const startedAt = Date.now();
  const operationName = "workflow" in intent ? intent.workflow : intent.tool;
  const trace: AgentTraceEvent[] = [
    {
      type: "decision",
      summary: `${operationName} required for classified request`,
    },
  ];
  const activeTools = (
    "workflow" in intent ? WORKFLOWS[intent.workflow] : [intent.tool]
  ) as readonly RuntimeToolName[];
  const configuredTools = activeTools.map((name) =>
    requireConfiguredTool(artifacts, name),
  );
  const deniedTool = configuredTools.find(
    (configured) => !configured.roles.includes(request.actor.role),
  );
  if (deniedTool) {
    const isVietnamese =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
        request.message,
      );
    const body = isVietnamese
      ? getRolePermissionReason(deniedTool.name, request.actor.role)
      : REFUSAL_BODY;

    return {
      answer: {
        status: "refused" as const,
        body,
        source: null,
        decisionSummary: "Refused staff-only operation",
      },
      trace: [
        { type: "decision" as const, summary: "Refused staff-only operation" },
      ],
      provider: providerName(deps),
      model: modelName(deps),
      ...executionEvidence(false, false, startedAt),
    };
  }

  const operations = deps.operations;
  if (!operations) {
    return {
      answer: fallback("Required operation adapter is unavailable"),
      trace,
      provider: providerName(deps),
      model: modelName(deps),
      ...executionEvidence(false, false, startedAt),
    };
  }

  let observed = false;
  const observedTools = new Set<string>();
  const radarItems = new Map<string, { tier?: number; version?: number }>();
  const recordCall = (toolName: string, summary: string) => {
    trace.push({ type: "tool_call", tool: toolName, summary });
  };
  const recordObservation = (toolName: string, summary: string) => {
    observed = true;
    observedTools.add(toolName);
    trace.push({ type: "observation", tool: toolName, summary });
  };

  const allTools = {
    evaluate_radar: tool({
      description: requireConfiguredTool(artifacts, "evaluate_radar")
        .description,
      inputSchema: z.object({}),
      execute: async () => {
        recordCall("evaluate_radar", "Evaluating unanswered radar questions");
        const output = await operations.evaluateRadar({
          guildId: request.guildId,
        });
        for (const candidate of output.items) {
          if (!candidate || typeof candidate !== "object") continue;
          const item = candidate as Record<string, unknown>;
          const questionId =
            typeof item.questionId === "string"
              ? item.questionId
              : typeof item.id === "string"
                ? item.id
                : undefined;
          if (questionId) {
            radarItems.set(questionId, {
              tier: typeof item.tier === "number" ? item.tier : undefined,
              version:
                typeof item.version === "number" ? item.version : undefined,
            });
          }
        }
        recordObservation("evaluate_radar", "Radar evaluation completed");
        return output;
      },
    }),
    create_staff_alert: tool({
      description: requireConfiguredTool(artifacts, "create_staff_alert")
        .description,
      inputSchema: z.object({
        questionId: z.string().min(1),
        tier: z.union([z.literal(1), z.literal(2)]),
        summary: z.string().min(1).max(300),
      }),
      execute: async ({ questionId, tier, summary }) => {
        const candidate = radarItems.get(questionId);
        if (!candidate || candidate.tier !== tier) {
          throw new ToolOperationError("create_staff_alert", "invalid");
        }
        recordCall("create_staff_alert", "Queueing staff-only radar alert");
        const output = await operations.createStaffAlert({
          guildId: request.guildId,
          actorId: request.actor.userId,
          actorRole: "lab_coach",
          questionId,
          tier,
          summary,
        });
        recordObservation("create_staff_alert", "Staff-only alert queued");
        return output;
      },
    }),
    resolve_question: tool({
      description: requireConfiguredTool(artifacts, "resolve_question")
        .description,
      inputSchema: z.object({
        questionId: z.string().min(1),
        expectedVersion: z.number().int().nonnegative(),
      }),
      execute: async ({ questionId, expectedVersion }) => {
        const candidate = radarItems.get(questionId);
        if (!candidate || candidate.version !== expectedVersion) {
          throw new ToolOperationError("resolve_question", "invalid");
        }
        recordCall("resolve_question", "Resolving question with version check");
        const output = await operations.resolveQuestion({
          guildId: request.guildId,
          actorId: request.actor.userId,
          actorRole: "lab_coach",
          questionId,
          expectedVersion,
        });
        recordObservation("resolve_question", "Question resolution completed");
        return output;
      },
    }),
    format_daily_digest: tool({
      description: requireConfiguredTool(artifacts, "format_daily_digest")
        .description,
      inputSchema: z.object({ localDate: z.iso.date() }),
      execute: async ({ localDate }) => {
        recordCall("format_daily_digest", "Formatting staff-only daily digest");
        const output = await operations.formatDailyDigest({
          guildId: request.guildId,
          actorId: request.actor.userId,
          actorRole: "lab_coach",
          localDate,
        });
        recordObservation("format_daily_digest", "Daily digest formatted");
        return output;
      },
    }),
    search_web: tool({
      description: requireConfiguredTool(artifacts, "search_web").description,
      inputSchema: z.object({ query: z.string().min(1).max(500) }),
      execute: async ({ query }) => {
        recordCall(
          "search_web",
          "Searching official external course resources",
        );
        const output = await operations.searchWeb({
          guildId: request.guildId,
          query,
        });
        recordObservation("search_web", "Official resource search completed");
        return output;
      },
    }),
  };

  const selectedTools = Object.fromEntries(
    activeTools.map((name) => [name, allTools[name]]),
  );
  const agent = new ToolLoopAgent({
    model: deps.model,
    instructions:
      artifacts.instructions +
      "\n\n" +
      (activeTools.length === 1
        ? `Call ${activeTools[0]} exactly once. Authority and guild are already bound by the server.`
        : `Call tools in this exact order: ${activeTools.join(" then ")}. Use only question identifiers, tiers, and versions from the radar observation. Authority and guild are server-bound.`),
    tools: selectedTools,
    activeTools: [...activeTools],
    stopWhen: stepCountIs(5),
    temperature: 0,
    include: { requestBody: false, responseBody: false },
  });
  const generated = await agent.generate(generationInput(request));
  const missingStep = activeTools.find((name) => !observedTools.has(name));
  if (missingStep) {
    throw new ToolOperationError(missingStep, "invalid");
  }
  return {
    answer: observed
      ? {
          status: "completed" as const,
          body: safeOperationBody(generated.text),
          source: null,
          decisionSummary: `${operationName} completed through authorized adapter`,
        }
      : fallback("Required tool was not executed"),
    trace,
    provider: providerName(deps),
    model: modelName(deps),
    ...executionEvidence(true, true, startedAt),
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

function requireConfiguredTool(
  artifacts: AgentArtifacts,
  name: string,
): ToolDeclaration {
  const declaration = artifacts.tools.find((tool) => tool.name === name);
  if (!declaration) throw new Error("Required tool is not declared");
  return declaration;
}

export function createCourseAgent(deps: CourseAgentDependencies): CourseAgent {
  const artifacts = deps.artifacts ?? loadAgentArtifacts();
  return {
    async run(request) {
      const startedAt = Date.now();
      if (request.actor.guildId !== request.guildId) {
        throw new Error("Forbidden guild scope");
      }

      const refused = refusalReason(request.message, request.actor.role);
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
          ...executionEvidence(false, false, startedAt),
        };
      }

      const permission = validateQueryRolePermission(
        request.message,
        request.actor.role,
      );
      if (!permission.allowed) {
        return {
          answer: {
            status: "refused",
            body: permission.reason ?? REFUSAL_BODY,
            source: null,
            decisionSummary: "Refused tool not allowed for authenticated role",
          },
          trace: [
            {
              type: "decision",
              summary: "Refused tool not allowed for authenticated role",
            },
          ],
          provider: providerName(deps),
          model: modelName(deps),
          ...executionEvidence(false, false, startedAt),
        };
      }

      if (!request.message.trim()) {
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
          ...executionEvidence(false, false, startedAt),
        };
      }

      const operation = classifyOperation(request.message);
      if (operation) return runOperation(deps, artifacts, request, operation);

      const conversational = classifyConversational(request.message);
      if (conversational && !classifyTopic(request.message)) {
        return {
          answer: {
            status: "clarify",
            body: conversational.body,
            source: null,
            decisionSummary: conversational.summary,
          },
          trace: [
            {
              type: "decision",
              summary: conversational.summary,
            },
          ],
          provider: providerName(deps),
          model: modelName(deps),
          ...executionEvidence(false, false, startedAt),
        };
      }

      const topicKey = classifyTopic(request.message);
      if (!topicKey) {
        const isVi = isVietnameseText(request.message);
        if (!isVi) {
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
            ...executionEvidence(false, false, startedAt),
          };
        }

        const ambiguous = isAmbiguousLogistics(request.message);
        const clarifyMsg =
          "Bạn đang hỏi về hạn nộp bài của Lab hay Checkpoint nào? Vui lòng nêu rõ để mình tra cứu thông báo chính xác giúp bạn nhé.";
        const generalIntro =
          "Xin chào bạn! Mình là Trợ lý Hỗ trợ Logistics của EasyGame (Lớp 3B - E402). Bạn cần hỗ trợ về hạn nộp bài, điểm danh hay thông báo chính thức nào không?";

        return {
          answer: {
            status: "clarify",
            body: ambiguous ? clarifyMsg : generalIntro,
            source: null,
            decisionSummary: ambiguous
              ? "Clarifying ambiguous logistics topic"
              : "Answered general assistance inquiry in Vietnamese",
          },
          trace: [
            {
              type: "decision",
              summary: ambiguous
                ? "Clarification required before tool use"
                : "Answered general assistance inquiry in Vietnamese",
            },
          ],
          provider: providerName(deps),
          model: modelName(deps),
          ...executionEvidence(false, false, startedAt),
        };
      }

      const noticeTool = requireConfiguredTool(artifacts, "query_notices");
      if (!noticeTool.roles.includes(request.actor.role)) {
        return {
          answer: {
            status: "refused",
            body: REFUSAL_BODY,
            source: null,
            decisionSummary: "Refused tool not allowed for authenticated role",
          },
          trace: [
            {
              type: "decision",
              summary: "Refused tool not allowed for authenticated role",
            },
          ],
          provider: providerName(deps),
          model: modelName(deps),
          ...executionEvidence(false, false, startedAt),
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
          description: noticeTool.description,
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
          artifacts.instructions +
          "\n\nUse query_notices exactly once. After observing it, repeat only the selected notice answer. Never invent or modify dates, policy, guild, role, or source links.",
        tools,
        activeTools: ["query_notices"],
        stopWhen: stepCountIs(3),
        temperature: 0,
        include: { requestBody: false, responseBody: false },
      });

      const generatedText = (await agent.generate(generationInput(request)))
        .text;
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
          generatedText,
          observation.notice,
          request.guildId,
        );
      }

      return {
        answer,
        trace,
        provider: providerName(deps),
        model: modelName(deps),
        ...(observation?.status === "found"
          ? { selectedNoticeId: observation.notice.id }
          : {}),
        ...executionEvidence(true, true, startedAt),
      };
    },
  };
}
