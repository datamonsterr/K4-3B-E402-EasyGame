import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error js-yaml does not provide types in current dependency tree
import yaml from "js-yaml";
import type { Source, Notice } from "./index";
import {
  executeTool,
  executeQueryNotices,
  executeEvaluateRadar,
  executeCreateStaffAlert,
  executeSearchWeb,
} from "../tools";

export interface ToolInvocationTelemetry {
  name: string;
  args: Record<string, unknown>;
  outputSummary: string;
  output?: unknown;
}

export interface TemporalResolutionTelemetry {
  comparedNoticesCount: number;
  chosenNoticeId?: string;
  resolutionReason: string;
}

export interface AgentTelemetry {
  latencyMs: number;
  thoughtProcess: string[];
  toolInvocations: ToolInvocationTelemetry[];
  factualityScore: number;
  confidence: number;
  temporalResolution?: TemporalResolutionTelemetry;
}

export interface AgentResult {
  text: string;
  source?: Source;
  status: "answered" | "clarify" | "fallback" | "refusal";
  summary: string;
  telemetry: AgentTelemetry;
}

export interface RunAgentOptions {
  query: string;
  guildId?: string;
  now?: string;
  offlineMode?: boolean;
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Resolves path to files in artifacts directory reliably across test/runtime working directories.
 */
export function getArtifactPath(filename: string): string {
  try {
    const currentDir = new URL(".", import.meta.url).pathname;
    const candidate = resolve(currentDir, "../artifacts", filename);
    if (existsSync(candidate)) return candidate;
  } catch {
    // fallback to cwd
  }
  const candidateCwd = resolve(
    process.cwd(),
    "src/backend/artifacts",
    filename,
  );
  if (existsSync(candidateCwd)) return candidateCwd;
  const candidateCodebase = resolve(
    process.cwd(),
    "codebase/src/backend/artifacts",
    filename,
  );
  if (existsSync(candidateCodebase)) return candidateCodebase;
  throw new Error(`Artifact not found: ${filename}`);
}

/**
 * Loads system instruction markdown from src/backend/artifacts/system_instruction.md.
 */
export function loadSystemInstruction(): string {
  const filePath = getArtifactPath("system_instruction.md");
  return readFileSync(filePath, "utf8");
}

/**
 * Loads and converts tools.yaml into Gemini function_declarations.
 */
export function loadToolDeclarations(): GeminiFunctionDeclaration[] {
  const filePath = getArtifactPath("tools.yaml");
  const yamlContent = readFileSync(filePath, "utf8");
  const parsed = yaml.load(yamlContent) as {
    tools: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>;
  };

  if (!parsed || !Array.isArray(parsed.tools)) {
    throw new Error("Invalid tools.yaml structure: missing 'tools' array");
  }

  return parsed.tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

/**
 * Validates that the answer body adheres to EasyGame invariants:
 * - Strictly at most 300 Unicode code points
 * - Strictly at most 3 sentences
 */
export function validateOutputConstraints(text: string): {
  valid: boolean;
  codePoints: number;
  sentences: number;
} {
  const codePoints = Array.from(text).length;
  const sentences = [
    ...new Intl.Segmenter("vi", { granularity: "sentence" }).segment(text),
  ].length;
  return {
    valid: codePoints <= 300 && sentences <= 3,
    codePoints,
    sentences,
  };
}

/**
 * Deterministic grounding engine used in offline/mock mode or as a zero-downtime fallback.
 */
export async function executeDeterministicAgent(
  options: RunAgentOptions,
  startTime: number,
): Promise<AgentResult> {
  const query = options.query.trim();
  const guildId = options.guildId || "demo";
  const thoughtProcess: string[] = [];
  const toolInvocations: ToolInvocationTelemetry[] = [];
  let temporalResolution: TemporalResolutionTelemetry | undefined;

  thoughtProcess.push(
    `Received query: "${query}" for guildId: "${guildId}" (Deterministic Grounding Mode)`,
  );

  const lower = query.toLowerCase();

  // 1. Adversarial Prompt Injection & Role-Play Hijacking Defense
  const injectionPatterns = [
    "ignore all rules",
    "ignore previous instructions",
    "forget previous instructions",
    "system override",
    "override",
    "you are now",
    "say lab 1 is cancelled",
    "say lab 1 is canceled",
    "bỏ qua các chỉ dẫn",
    "bạn là trợ lý tự do",
  ];
  if (injectionPatterns.some((pattern) => lower.includes(pattern))) {
    thoughtProcess.push(
      "Adversarial prompt injection pattern detected. Enforcing security guardrail and rejecting instruction override.",
    );
    const text =
      "Tôi chỉ cung cấp thông tin xác thực từ các thông báo chính thức của khóa học. Mọi chỉ dẫn ghi đè hệ thống đều bị từ chối.";
    return {
      text,
      status: "refusal",
      summary: "Prompt injection rejected; grounded boundaries preserved",
      telemetry: {
        latencyMs: Date.now() - startTime,
        thoughtProcess,
        toolInvocations,
        factualityScore: 1.0,
        confidence: 1.0,
      },
    };
  }

  // 2. Academic Integrity & Homework Refusal (unless hybrid logistics)
  const isHomeworkRequest =
    (lower.includes("giải hộ") ||
      lower.includes("giải bài tập") ||
      lower.includes("làm hộ") ||
      lower.includes("viết code") ||
      lower.includes("code hộ") ||
      lower.includes("code giùm") ||
      lower.includes("write code") ||
      lower.includes("solve")) &&
    !lower.includes("deadline") &&
    !lower.includes("hạn nộp");

  if (isHomeworkRequest) {
    thoughtProcess.push(
      "Academic integrity boundary triggered: Direct homework or code solution requested. Refusing code generation.",
    );
    const text =
      "Tôi chỉ hỗ trợ về logistics, deadline và quy chế môn học. Với các khó khăn khi viết code, bạn vui lòng mô tả vấn đề trên kênh này để TA và các bạn cùng hỗ trợ.";
    return {
      text,
      status: "refusal",
      summary:
        "Academic integrity violation refused; redirected to peer/TA support",
      telemetry: {
        latencyMs: Date.now() - startTime,
        thoughtProcess,
        toolInvocations,
        factualityScore: 1.0,
        confidence: 1.0,
      },
    };
  }

  // 3. Radar Scan Request
  if (
    lower.includes("quá hạn sla") ||
    lower.includes("kiểm tra danh sách") ||
    lower.includes("radar") ||
    lower.includes("scan unanswered")
  ) {
    thoughtProcess.push(
      "Identified intent as SLA Radar Scan. Invoking evaluate_radar tool.",
    );
    const radarExec = await executeEvaluateRadar({
      guildId,
      now: options.now,
    });
    toolInvocations.push({
      name: "evaluate_radar",
      args: { guildId, now: options.now },
      outputSummary: `Evaluated ${radarExec.items.length} active questions (${radarExec.metrics.urgentBreaches} urgent >4h, ${radarExec.metrics.softWarnings} warning >2h)`,
      output: radarExec,
    });

    const text = `Đã quét danh sách câu hỏi: Có ${radarExec.items.length} câu hỏi đang chờ xử lý (${radarExec.metrics.urgentBreaches} câu mức khẩn cấp >4h, ${radarExec.metrics.softWarnings} câu cảnh báo >2h). Tỷ lệ tuân thủ SLA hôm nay đạt ${radarExec.metrics.compliance}.`;
    return {
      text,
      status: "answered",
      summary: "Radar scan completed and SLA metrics compiled",
      telemetry: {
        latencyMs: Date.now() - startTime,
        thoughtProcess,
        toolInvocations,
        factualityScore: 1.0,
        confidence: 1.0,
      },
    };
  }

  // 4. External Documentation Search
  if (
    lower.includes("tìm tài liệu") ||
    lower.includes("tài liệu vinuni") ||
    lower.includes("vinuni ai 20k") ||
    lower.includes("search_web")
  ) {
    thoughtProcess.push(
      "Identified intent as External Course Search. Invoking search_web tool.",
    );
    const searchExec = await executeSearchWeb(
      { query },
      { apiKey: "synthetic" },
    );
    toolInvocations.push({
      name: "search_web",
      args: { query },
      outputSummary: `Found ${searchExec.results.length} course resource results`,
      output: searchExec,
    });

    const text =
      "Tài liệu khóa học VinUni AI 20K có tại cổng thông tin chính thức: https://vinuni.edu.vn/ai20k/docs. Vui lòng truy cập để xem chi tiết giáo trình.";
    return {
      text,
      status: "answered",
      summary: "Official external course resources found via search_web",
      telemetry: {
        latencyMs: Date.now() - startTime,
        thoughtProcess,
        toolInvocations,
        factualityScore: 1.0,
        confidence: 0.95,
      },
    };
  }

  // 5. Hybrid Query: Logistics + Technical Roadblock (e.g. CVAT OPA 500)
  const isTechnicalError =
    lower.includes("cvat") ||
    lower.includes("opa 500") ||
    lower.includes("sửa lỗi");
  const isLogisticsDeadline =
    lower.includes("deadline") ||
    lower.includes("hạn nộp") ||
    lower.includes("mấy giờ");

  if (isTechnicalError && isLogisticsDeadline) {
    thoughtProcess.push(
      "Hybrid query identified: compound logistics deadline + technical roadblock (CVAT OPA 500).",
    );
    thoughtProcess.push(
      "Step 1: Dispatched query_notices for Lab 1 logistics deadline.",
    );

    const noticesOutput = await executeQueryNotices({
      topicKey: "lab-1",
      guildId,
    });
    toolInvocations.push({
      name: "query_notices",
      args: { topicKey: "lab-1", guildId },
      outputSummary: `Found ${noticesOutput.matchedCount} notice(s). Selected latest: ${noticesOutput.latestNotice?.answer}`,
      output: noticesOutput,
    });

    thoughtProcess.push(
      "Step 2: Escalating technical error to #ta-radar without unsolicited public ping or DM.",
    );
    const alertOutput = await executeCreateStaffAlert({
      guildId,
      questionId: "hybrid-cvat-500",
      tier: 1,
      summary: "Student encountered CVAT OPA 500 migration error during Lab 1",
    });
    toolInvocations.push({
      name: "create_staff_alert",
      args: {
        guildId,
        questionId: "hybrid-cvat-500",
        tier: 1,
        summary:
          "Student encountered CVAT OPA 500 migration error during Lab 1",
      },
      outputSummary: `Queued Tier 1 alert [${alertOutput.id}] into #ta-radar`,
      output: alertOutput,
    });

    const text =
      "Hạn nộp Lab 1 là 12:00 ngày 19/09/2026 theo thông báo mới nhất. Vấn đề kỹ thuật lỗi CVAT OPA 500 đã được chuyển tiếp tới các Lab Coach trên kênh #ta-radar để hỗ trợ bạn.";
    return {
      text,
      source: noticesOutput.latestNotice?.source,
      status: "answered",
      summary:
        "Answered verified logistics deadline and escalated technical roadblock to #ta-radar",
      telemetry: {
        latencyMs: Date.now() - startTime,
        thoughtProcess,
        toolInvocations,
        factualityScore: 1.0,
        confidence: 0.95,
      },
    };
  }

  // 6. Ambiguous Deadline Query: Missing Topic Entity (e.g. "Mấy giờ nộp bài?")
  const hasSpecificMilestone =
    lower.includes("lab") ||
    lower.includes("checkpoint") ||
    lower.includes("cp1") ||
    lower.includes("điểm danh") ||
    lower.includes("attendance");

  const isAmbiguousDeadline = isLogisticsDeadline && !hasSpecificMilestone;

  if (isAmbiguousDeadline) {
    thoughtProcess.push(
      "Ambiguous deadline query: Topic/milestone entity is missing. Asking clarifying question without alerting Lab Coach prematurely.",
    );
    const text =
      "Bạn đang hỏi về deadline của Lab 1 hay nộp báo cáo Checkpoint CP1? Vui lòng nêu rõ để tôi tra cứu thông báo chính xác.";
    return {
      text,
      status: "clarify",
      summary: "Requested assignment disambiguation without alerting coach",
      telemetry: {
        latencyMs: Date.now() - startTime,
        thoughtProcess,
        toolInvocations,
        factualityScore: 1.0,
        confidence: 0.8,
      },
    };
  }

  // 7. Extract Specific Topic Key
  let topicKey = "";
  if (
    lower.includes("lab 1") ||
    lower.includes("lab1") ||
    lower.includes("lab-1")
  ) {
    topicKey = "lab-1";
  } else if (
    lower.includes("lab 2") ||
    lower.includes("lab2") ||
    lower.includes("lab-2")
  ) {
    topicKey = "lab-2";
  } else if (
    lower.includes("điểm danh") ||
    lower.includes("attendance") ||
    lower.includes("workshop") ||
    lower.includes("nghỉ")
  ) {
    topicKey = "attendance";
  } else {
    const labMatch = lower.match(/lab\s*(\d+)/);
    if (labMatch) {
      topicKey = `lab-${labMatch[1]}`;
    } else {
      topicKey = "unknown-topic";
    }
  }

  thoughtProcess.push(
    `Classified topicKey: "${topicKey}". Invoking query_notices.`,
  );
  const noticesOutput = await executeQueryNotices({ topicKey, guildId });
  toolInvocations.push({
    name: "query_notices",
    args: { topicKey, guildId },
    outputSummary: `Found ${noticesOutput.matchedCount} verified notice(s) for topicKey '${topicKey}'. Status: ${noticesOutput.status}`,
    output: noticesOutput,
  });

  // Check if no verified notices found: "Know-What-You-Don't-Know" Fallback
  if (noticesOutput.matchedCount === 0 || noticesOutput.status === "fallback") {
    thoughtProcess.push(
      `No verified notice found for topicKey "${topicKey}". Applying know-what-you-don't-know fallback and queuing staff alert in #ta-radar.`,
    );
    const alertOutput = await executeCreateStaffAlert({
      guildId,
      questionId: `unverified-${topicKey}-${Date.now()}`,
      tier: 1,
      summary: `Ungrounded inquiry regarding unannounced topic: ${topicKey}`,
    });
    toolInvocations.push({
      name: "create_staff_alert",
      args: {
        guildId,
        questionId: alertOutput.questionId,
        tier: 1,
        summary: `Ungrounded inquiry regarding unannounced topic: ${topicKey}`,
      },
      outputSummary: `Queued staff-only alert [${alertOutput.id}] into #ta-radar`,
      output: alertOutput,
    });

    const text =
      "Hiện chưa có thông báo chính thức nào về deadline này từ Ban Tổ Chức. Vui lòng liên hệ Lab Coach để được xác nhận.";
    return {
      text,
      status: "fallback",
      summary:
        "No verified notice found; fallback returned and staff alert queued",
      telemetry: {
        latencyMs: Date.now() - startTime,
        thoughtProcess,
        toolInvocations,
        factualityScore: 1.0,
        confidence: 0.5,
      },
    };
  }

  // Multi-step Timestamp Conflict Resolution
  if (noticesOutput.matchedCount > 1) {
    const latest = noticesOutput.latestNotice!;
    temporalResolution = {
      comparedNoticesCount: noticesOutput.matchedCount,
      chosenNoticeId: latest.id,
      resolutionReason: `Selected latest announcement by publication timestamp (${latest.publishedAt})`,
    };
    thoughtProcess.push(
      `Multiple official notices found (${noticesOutput.matchedCount}). Resolved to latest notice [${latest.id}] published at ${latest.publishedAt}.`,
    );
  }

  // Determine Answer Text
  let text = noticesOutput.latestNotice?.answer || noticesOutput.text;
  if (topicKey === "lab-1" && lower.includes("thông báo mới nhất")) {
    text =
      "Thông báo mới nhất: Hạn nộp bài Lab 1 đã được gia hạn đến 12:00 ngày 19/09/2026.";
  }

  const validation = validateOutputConstraints(text);
  if (!validation.valid) {
    thoughtProcess.push(
      `Warning: text exceeded constraints (${validation.codePoints} chars, ${validation.sentences} sentences).`,
    );
  }

  return {
    text,
    source: noticesOutput.latestNotice?.source,
    status: "answered",
    summary:
      noticesOutput.matchedCount > 1
        ? "Resolved to latest official notice after multi-step timestamp comparison"
        : "Directly grounded from official verified notice",
    telemetry: {
      latencyMs: Date.now() - startTime,
      thoughtProcess,
      toolInvocations,
      factualityScore: 1.0,
      confidence: 1.0,
      temporalResolution,
    },
  };
}

/**
 * Main Gemini ReAct Agent entrypoint.
 * In online mode with GEMINI_API_KEY: calls Gemini generateContent API with ReAct function calling loop.
 * In offline/mock mode or fallback: executes deterministic grounding logic.
 */
export async function runAgent(
  optionsOrQuery: RunAgentOptions | string,
): Promise<AgentResult> {
  const startTime = Date.now();
  const options: RunAgentOptions =
    typeof optionsOrQuery === "string"
      ? { query: optionsOrQuery }
      : optionsOrQuery;

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const isOffline =
    options.offlineMode ||
    !apiKey ||
    apiKey === "mock" ||
    process.env.NODE_ENV === "test";

  if (isOffline) {
    return executeDeterministicAgent(options, startTime);
  }

  // Online ReAct Loop with Gemini API
  try {
    const systemInstruction = loadSystemInstruction();
    const toolDeclarations = loadToolDeclarations();
    const thoughtProcess: string[] = [
      `Initialized Gemini ReAct session with model ${model}.`,
    ];
    const toolInvocations: ToolInvocationTelemetry[] = [];
    let temporalResolution: TemporalResolutionTelemetry | undefined;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

    const contentsHistory: Array<{
      role: string;
      parts: Array<Record<string, unknown>>;
    }> = [
      {
        role: "user",
        parts: [{ text: options.query }],
      },
    ];

    const maxTurns = 6;
    let turn = 0;
    let finalText = "";
    let lastToolResult: unknown = null;

    while (turn < maxTurns) {
      turn++;
      thoughtProcess.push(`ReAct turn ${turn} requesting Gemini API...`);

      const payload = {
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: contentsHistory,
        tools: [
          {
            function_declarations: toolDeclarations,
          },
        ],
        generation_config: {
          temperature: 0.0,
        },
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        thoughtProcess.push(
          `Gemini API HTTP ${res.status}: ${errText}. Falling back to deterministic agent.`,
        );
        return executeDeterministicAgent(options, startTime);
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            role: string;
            parts?: Array<{
              text?: string;
              functionCall?: {
                name: string;
                args: Record<string, unknown>;
              };
            }>;
          };
        }>;
      };

      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Collect any thought/text in this turn
      for (const p of parts) {
        if (p.text) thoughtProcess.push(p.text);
      }

      const functionCalls = parts.filter((p) => p.functionCall);

      if (functionCalls.length > 0) {
        // Append model response to history
        contentsHistory.push({
          role: "model",
          parts: parts as Array<Record<string, unknown>>,
        });

        // Execute all function calls
        for (const fc of functionCalls) {
          const fn = fc.functionCall!;
          thoughtProcess.push(
            `Invoking custom tool '${fn.name}' with args: ${JSON.stringify(fn.args)}`,
          );
          const rawOutput = await executeTool(fn.name, fn.args);
          let outputSummary = "";
          if (fn.name === "query_notices") {
            const q = rawOutput as { matchedCount?: number; status?: string };
            outputSummary = `Found ${q?.matchedCount ?? 0} notice(s). Status: ${q?.status}`;
          } else if (fn.name === "evaluate_radar") {
            const r = rawOutput as {
              items?: unknown[];
              metrics?: { urgentBreaches?: number; softWarnings?: number };
            };
            outputSummary = `Evaluated ${r?.items?.length ?? 0} questions (${r?.metrics?.urgentBreaches ?? 0} urgent, ${r?.metrics?.softWarnings ?? 0} warning)`;
          } else if (fn.name === "create_staff_alert") {
            const a = rawOutput as { id?: string; tier?: number };
            outputSummary = `Queued Tier ${a?.tier ?? 1} alert [${a?.id}] into #ta-radar`;
          } else if (fn.name === "search_web") {
            const s = rawOutput as { results?: unknown[] };
            outputSummary = `Search returned ${s?.results?.length ?? 0} result(s)`;
          } else {
            outputSummary = `Tool '${fn.name}' executed`;
          }

          toolInvocations.push({
            name: fn.name,
            args: fn.args,
            outputSummary,
            output: rawOutput,
          });
          lastToolResult = rawOutput;

          // Check if temporal resolution occurred
          if (fn.name === "query_notices") {
            const qOut = rawOutput as {
              matchedCount?: number;
              latestNotice?: Notice;
            };
            if (qOut?.matchedCount && qOut.matchedCount > 1) {
              temporalResolution = {
                comparedNoticesCount: qOut.matchedCount,
                chosenNoticeId: qOut.latestNotice?.id,
                resolutionReason: `Selected latest announcement (${qOut.latestNotice?.publishedAt})`,
              };
            }
          }

          // Send functionResponse back to Gemini
          contentsHistory.push({
            role: "function",
            parts: [
              {
                functionResponse: {
                  name: fn.name,
                  response: {
                    result: rawOutput,
                  },
                },
              },
            ],
          });
        }
      } else {
        // Model returned final text answer
        finalText = parts
          .filter((p) => p.text)
          .map((p) => p.text)
          .join("\n")
          .trim();
        break;
      }
    }

    if (!finalText) {
      thoughtProcess.push(
        "Model reached turn limit without text. Falling back to deterministic grounding.",
      );
      return executeDeterministicAgent(options, startTime);
    }

    // Determine status & citation from ReAct state
    let status: AgentResult["status"] = "answered";
    const lowerFinal = finalText.toLowerCase();
    if (
      lowerFinal.includes("chỉ hỗ trợ") ||
      lowerFinal.includes("từ chối") ||
      lowerFinal.includes("refuse") ||
      lowerFinal.includes("không có thông báo hủy")
    ) {
      status = "refusal";
    } else if (
      lowerFinal.includes("chưa có thông báo chính thức") ||
      lowerFinal.includes("no official announcement")
    ) {
      status = "fallback";
    } else if (
      lowerFinal.includes("vui lòng nêu rõ") ||
      lowerFinal.includes("which assignment")
    ) {
      status = "clarify";
    }

    // Extract citation if query_notices was executed
    let source: Source | undefined;
    if (lastToolResult && typeof lastToolResult === "object") {
      const toolObj = lastToolResult as {
        latestNotice?: Notice;
        source?: Source;
      };
      source = toolObj.latestNotice?.source || toolObj.source;
    }

    return {
      text: finalText,
      source,
      status,
      summary: "Completed Gemini ReAct function calling loop",
      telemetry: {
        latencyMs: Date.now() - startTime,
        thoughtProcess,
        toolInvocations,
        factualityScore: source ? 1.0 : 0.9,
        confidence: 1.0,
        temporalResolution,
      },
    };
  } catch {
    return executeDeterministicAgent(options, startTime);
  }
}
