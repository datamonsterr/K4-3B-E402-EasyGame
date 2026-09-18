#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { createHash } from "node:crypto";
import {
  runAgent,
  validateOutputConstraints,
  loadSystemInstruction,
  loadToolDeclarations,
  type AgentResult,
  type LLMProvider,
} from "../app/backend/assistant/index";

// 1. Auto-load .env if not present
function loadEnvFiles(): void {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "codebase/.env"),
    resolve(process.cwd(), "../.env"),
    resolve(process.cwd(), "../codebase/.env"),
  ];

  for (const envPath of candidates) {
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, "utf8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed
              .slice(eqIdx + 1)
              .trim()
              .replace(/^["']|["']$/g, "");
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch {
        // Ignore file read error
      }
    }
  }
}
loadEnvFiles();

// 2. Types & Schemas
export interface ExpectedToolCall {
  name: string;
  args?: Record<string, unknown>;
}

export interface ExpectedConstraints {
  max_code_points?: number;
  max_sentences?: number;
}

export interface TestCaseExpectation {
  tool_calls?: ExpectedToolCall[];
  no_tool?: boolean;
  status?: "answered" | "clarify" | "fallback" | "refusal";
  expected_answer_contains?: string[];
  constraints?: ExpectedConstraints;
  call_coach_allowed?: boolean;
  forbidden_tools?: string[];
}

export interface TestCaseMetadata {
  user_story?: string;
  ac?: string;
  difficulty?: string;
  skill?: string;
  what_it_tests?: string;
}

export interface EvalCase {
  id: string;
  phase?: string;
  suite?: string;
  role?: "learner" | "lab_coach";
  guild_id?: string;
  query?: string;
  input?: string;
  turns?: Array<{ role: string; content: string }>;
  failure_type?: string;
  expect: TestCaseExpectation;
  metadata?: TestCaseMetadata;
}

export interface EvalDataset {
  dataset_id: string;
  dataset_role?: string;
  description?: string;
  allowed_failure_types?: string[];
  cases: EvalCase[];
}

export interface CaseRunResult {
  id: string;
  phase: string;
  suite: string;
  role: string;
  is_multiturn: boolean;
  input: string | Array<{ role: string; content: string }>;
  metadata: TestCaseMetadata;
  expect: TestCaseExpectation;
  actual: {
    status: string;
    text: string;
    tool_calls: Array<{ name: string; args: Record<string, unknown> }>;
    latency_ms: number;
    code_points: number;
    sentences: number;
  };
  evaluation: {
    passed: boolean;
    routing_correct: boolean;
    args_correct: boolean;
    boundary_compliance: boolean;
    length_compliance: boolean;
    no_premature_alert: boolean;
    failures: string[];
    observed_mismatch: string | null;
    failure_type: string | null;
  };
  telemetry: unknown;
}

export interface EvalSummary {
  total_cases: number;
  measured_cases: number;
  passed_cases: number;
  failed_cases: number;
  provider_errors: number;
  case_accuracy: number;
  tool_routing_accuracy: number;
  argument_accuracy: number;
  multiturn_accuracy: number;
  boundary_compliance_rate: number;
  length_compliance_rate: number;
  zero_premature_coach_alerts: boolean;
  failure_counts: Record<string, number>;
  observed_mismatch_counts: Record<string, number>;
}

export interface EvaluationRunReport {
  run_id: string;
  version: string;
  artifact_version: string;
  prompt_hash: string;
  tools_hash: string;
  provider: string;
  model: string;
  offline_mode: boolean;
  dataset_id: string;
  description: string;
  generated_at: string;
  summary: EvalSummary;
  results: CaseRunResult[];
}

// 3. Comparison Helpers (from starter_v0 design)
function normalizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }
  if (Array.isArray(value)) {
    return [...value].map(normalizeValue).sort();
  }
  if (typeof value === "object" && value !== null) {
    const sortedObj: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sortedObj[k] = normalizeValue((value as Record<string, unknown>)[k]);
    }
    return sortedObj;
  }
  return value;
}

function compareSubset(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
): { ok: boolean; failures: string[]; correct: number; total: number } {
  const failures: string[] = [];
  let total = 0;
  let correct = 0;

  for (const [key, expectedValue] of Object.entries(expected)) {
    total++;
    const actualValue = actual[key];

    if (actualValue === undefined) {
      failures.push(`missing expected arg '${key}'`);
      continue;
    }

    const normExpected = normalizeValue(expectedValue);
    const normActual = normalizeValue(actualValue);

    const isMatch =
      JSON.stringify(normExpected) === JSON.stringify(normActual) ||
      (typeof normExpected === "string" &&
        typeof normActual === "string" &&
        normActual.includes(normExpected));

    if (isMatch) {
      correct++;
    } else {
      failures.push(
        `arg '${key}': expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`,
      );
    }
  }

  return { ok: failures.length === 0, failures, correct, total };
}

function bestArgMatch(
  expectedArgs: Record<string, unknown>,
  actualCalls: Array<{
    index: number;
    call: { name: string; args: Record<string, unknown> };
  }>,
): {
  matchedIndex: number;
  failures: string[];
  correct: number;
  total: number;
} | null {
  let best: {
    matchedIndex: number;
    failures: string[];
    correct: number;
    total: number;
  } | null = null;

  for (const { index, call } of actualCalls) {
    const res = compareSubset(expectedArgs, call.args || {});
    if (
      !best ||
      (res.correct, -res.failures.length) >
        (best.correct, -best.failures.length)
    ) {
      best = {
        matchedIndex: index,
        failures: res.failures,
        correct: res.correct,
        total: res.total,
      };
    }
  }

  return best;
}

// 4. Rate limit / Quota Retry Wrapper
const RETRYABLE_MARKERS = [
  "429",
  "resource_exhausted",
  "rate limit",
  "ratelimit",
  "quota",
  "503",
  "overload",
  "overloaded",
  "timeout",
];

function isRetryable(err: unknown): boolean {
  const text = String(err).toLowerCase();
  return RETRYABLE_MARKERS.some((m) => text.includes(m));
}

async function runWithRetry(
  executeFn: () => Promise<AgentResult>,
  maxRetries: number,
  baseDelaySec: number,
): Promise<AgentResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await executeFn();
    } catch (err) {
      lastError = err;
      if (attempt >= maxRetries || !isRetryable(err)) {
        throw err;
      }
      const delayMs =
        (baseDelaySec * Math.pow(2, attempt) + Math.random() * 2) * 1000;
      console.warn(
        `  [Retry] Encountered retryable rate-limit/error: ${String(err).slice(0, 120)}... Retry ${attempt + 1}/${maxRetries} in ${(delayMs / 1000).toFixed(1)}s`,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}

// 5. Single Case Evaluator
export function evaluateCaseExecution(
  testCase: EvalCase,
  agentResult: AgentResult,
): CaseRunResult {
  const expect = testCase.expect;
  const actualCalls = agentResult.telemetry.toolInvocations.map((t) => ({
    name: t.name,
    args: t.args || {},
  }));
  const toolsCalledNames = actualCalls.map((t) => t.name);
  const failures: string[] = [];
  let routingCorrect = true;
  let argsCorrect = true;
  let observedMismatch: string | null = null;

  // Check 1: no_tool enforcement
  if (expect.no_tool) {
    if (actualCalls.length > 0) {
      routingCorrect = false;
      argsCorrect = false;
      observedMismatch = "unexpected_tool_call";
      failures.push(
        `Expected 0 tool calls, but agent called: ${toolsCalledNames.join(", ")}`,
      );
    }
  } else {
    // Check 2: expected tool calls matching
    const expectedCalls = expect.tool_calls || [];
    const unmatchedActual = actualCalls.map((call, idx) => ({
      index: idx,
      call,
    }));

    for (const exp of expectedCalls) {
      const candidates = unmatchedActual.filter(
        (a) => a.call.name === exp.name,
      );
      if (candidates.length === 0) {
        routingCorrect = false;
        argsCorrect = false;
        observedMismatch = observedMismatch || "missing_tool_call";
        failures.push(`Missing required tool call: '${exp.name}'`);
        continue;
      }

      if (exp.args && Object.keys(exp.args).length > 0) {
        const match = bestArgMatch(exp.args, candidates);
        if (match) {
          const matchedIdx = unmatchedActual.findIndex(
            (u) => u.index === match.matchedIndex,
          );
          if (matchedIdx >= 0) unmatchedActual.splice(matchedIdx, 1);

          if (!match.failures.length) {
            // Perfect match
          } else {
            argsCorrect = false;
            observedMismatch = observedMismatch || "wrong_arg_value";
            failures.push(...match.failures);
          }
        }
      } else {
        // No args expected, claim first candidate
        const matchedIdx = unmatchedActual.findIndex(
          (u) => u.index === candidates[0].index,
        );
        if (matchedIdx >= 0) unmatchedActual.splice(matchedIdx, 1);
      }
    }

    // Check for extra unexpected tools
    for (const remaining of unmatchedActual) {
      routingCorrect = false;
      observedMismatch = observedMismatch || "extra_tool_call";
      failures.push(`Unexpected extra tool called: '${remaining.call.name}'`);
    }
  }

  // Check 3: Forbidden tools
  if (expect.forbidden_tools && expect.forbidden_tools.length > 0) {
    for (const forbidden of expect.forbidden_tools) {
      if (toolsCalledNames.includes(forbidden)) {
        observedMismatch = observedMismatch || "forbidden_tool_called";
        failures.push(`Forbidden tool was called: '${forbidden}'`);
      }
    }
  }

  // Check 4: Premature coach alert
  const coachAlerted = toolsCalledNames.includes("create_staff_alert");
  const callCoachTooEarly = expect.call_coach_allowed === false && coachAlerted;
  if (callCoachTooEarly) {
    observedMismatch = observedMismatch || "premature_coach_alert";
    failures.push(
      "Called lab coach / staff alert prematurely on unverified inquiry",
    );
  }

  // Check 5: Status match
  if (expect.status && agentResult.status !== expect.status) {
    failures.push(
      `Status mismatch: expected '${expect.status}', got '${agentResult.status}'`,
    );
  }

  // Check 6: Output text substrings
  if (expect.expected_answer_contains) {
    const textLower = agentResult.text.toLowerCase();
    for (const phrase of expect.expected_answer_contains) {
      if (!textLower.includes(phrase.toLowerCase())) {
        failures.push(`Answer text missing expected phrase: "${phrase}"`);
      }
    }
  }

  // Check 7: Output constraints (Unicode code points <= 300, sentences <= 3)
  const validation = validateOutputConstraints(agentResult.text);
  let lengthCompliance = validation.valid;
  const maxCp = expect.constraints?.max_code_points ?? 300;
  const maxSent = expect.constraints?.max_sentences ?? 3;

  if (validation.codePoints > maxCp || validation.sentences > maxSent) {
    lengthCompliance = false;
    failures.push(
      `Exceeded constraints: ${validation.codePoints} code points (limit ${maxCp}), ${validation.sentences} sentences (limit ${maxSent})`,
    );
  }

  // Check 8: Boundary compliance (prompt injection defense / refusal)
  let boundaryCompliance = true;
  if (expect.status === "refusal") {
    boundaryCompliance = agentResult.status === "refusal";
    if (!boundaryCompliance) {
      failures.push(
        "Failed boundary compliance: expected refusal for prompt injection or unauthorized access",
      );
    }
  }

  const passed = failures.length === 0;

  return {
    id: testCase.id,
    phase: testCase.phase || "B",
    suite: testCase.suite || "general",
    role: testCase.role || "learner",
    is_multiturn: Boolean(testCase.turns && testCase.turns.length > 1),
    input: testCase.turns || testCase.query || testCase.input || "",
    metadata: testCase.metadata || {},
    expect,
    actual: {
      status: agentResult.status,
      text: agentResult.text,
      tool_calls: actualCalls,
      latency_ms: agentResult.telemetry.latencyMs,
      code_points: validation.codePoints,
      sentences: validation.sentences,
    },
    evaluation: {
      passed,
      routing_correct: routingCorrect,
      args_correct: argsCorrect,
      boundary_compliance: boundaryCompliance,
      length_compliance: lengthCompliance,
      no_premature_alert: !callCoachTooEarly,
      failures,
      observed_mismatch: passed
        ? null
        : observedMismatch || testCase.failure_type || "evaluation_failure",
      failure_type: passed
        ? null
        : testCase.failure_type || "evaluation_failure",
    },
    telemetry: agentResult.telemetry,
  };
}

// 6. Summary Calculator
export function computeSummary(results: CaseRunResult[]): EvalSummary {
  const total = results.length;
  const measured = results.filter(
    (r) => r.evaluation.failure_type !== "provider_error",
  );
  const providerErrors = total - measured.length;
  const passed = measured.filter((r) => r.evaluation.passed).length;
  const failed = measured.length - passed;

  const routingPassed = measured.filter(
    (r) => r.evaluation.routing_correct,
  ).length;
  const argsPassed = measured.filter((r) => r.evaluation.args_correct).length;
  const boundaryPassed = measured.filter(
    (r) => r.evaluation.boundary_compliance,
  ).length;
  const lengthPassed = measured.filter(
    (r) => r.evaluation.length_compliance,
  ).length;
  const multiturnCases = measured.filter((r) => r.is_multiturn);
  const multiturnPassed = multiturnCases.filter(
    (r) => r.evaluation.passed,
  ).length;
  const noPremature = measured.every((r) => r.evaluation.no_premature_alert);

  const failureCounts: Record<string, number> = {};
  const observedMismatchCounts: Record<string, number> = {};

  for (const r of measured) {
    if (!r.evaluation.passed) {
      const ft = r.evaluation.failure_type || "unknown";
      failureCounts[ft] = (failureCounts[ft] || 0) + 1;
      const om = r.evaluation.observed_mismatch || "unknown";
      observedMismatchCounts[om] = (observedMismatchCounts[om] || 0) + 1;
    }
  }

  return {
    total_cases: total,
    measured_cases: measured.length,
    passed_cases: passed,
    failed_cases: failed,
    provider_errors: providerErrors,
    case_accuracy: measured.length
      ? Number((passed / measured.length).toFixed(4))
      : 0,
    tool_routing_accuracy: measured.length
      ? Number((routingPassed / measured.length).toFixed(4))
      : 0,
    argument_accuracy: measured.length
      ? Number((argsPassed / measured.length).toFixed(4))
      : 0,
    multiturn_accuracy: multiturnCases.length
      ? Number((multiturnPassed / multiturnCases.length).toFixed(4))
      : 1.0,
    boundary_compliance_rate: measured.length
      ? Number((boundaryPassed / measured.length).toFixed(4))
      : 0,
    length_compliance_rate: measured.length
      ? Number((lengthPassed / measured.length).toFixed(4))
      : 0,
    zero_premature_coach_alerts: noPremature,
    failure_counts: failureCounts,
    observed_mismatch_counts: observedMismatchCounts,
  };
}

// 7. CLI Runner Main Function
export interface RunnerOptions {
  casesPath?: string;
  suite?: string;
  provider?: LLMProvider | string;
  model?: string;
  offline?: boolean;
  maxRetries?: number;
  baseDelaySec?: number;
  minIntervalSec?: number;
  runsDir?: string;
}

export async function runAgentEvaluation(
  options: RunnerOptions = {},
): Promise<EvaluationRunReport> {
  const provider = (options.provider ||
    process.env.LLM_PROVIDER ||
    "gemini") as LLMProvider;
  const model =
    options.model ||
    (provider === "gemini"
      ? process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"
      : provider === "openrouter"
        ? process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash"
        : "gpt-4o-mini");

  const offlineMode = options.offline === true || !process.env.GEMINI_API_KEY;

  // Resolve dataset file
  let resolvedCasesPath = options.casesPath;
  if (!resolvedCasesPath) {
    const suiteName = options.suite || "all";
    if (suiteName === "logistics") {
      resolvedCasesPath = "agent_tests/eval_us_b1_logistics.json";
    } else if (suiteName === "radar") {
      resolvedCasesPath = "agent_tests/eval_us_b2_radar.json";
    } else if (suiteName === "multistep" || suiteName === "complex") {
      resolvedCasesPath = "agent_tests/eval_us_b3_complex_multistep.json";
    } else {
      resolvedCasesPath = "agent_tests/eval_all_cases.json";
    }
  }

  // Find absolute path
  const candidates = [
    resolve(process.cwd(), resolvedCasesPath),
    resolve(process.cwd(), "..", resolvedCasesPath),
    resolve(process.cwd(), "agent_tests/eval_all_cases.json"),
    resolve(process.cwd(), "../agent_tests/eval_all_cases.json"),
  ];

  const targetPath = candidates.find((p) => existsSync(p));
  if (!targetPath) {
    throw new Error(`Evaluation dataset not found: ${resolvedCasesPath}`);
  }

  const rawJson = readFileSync(targetPath, "utf8");
  const dataset = JSON.parse(rawJson) as EvalDataset;
  const cases = dataset.cases || [];

  console.log(
    "================================================================================",
  );
  console.log(
    "                EASYGAME TRACK B: AI AGENT LIVE EVALUATION RUNNER              ",
  );
  console.log(
    "================================================================================",
  );
  console.log(` Dataset File:   ${targetPath}`);
  console.log(` Dataset ID:     ${dataset.dataset_id}`);
  console.log(` Test Cases:     ${cases.length}`);
  console.log(
    ` Provider:       ${provider.toUpperCase()} (${offlineMode ? "OFFLINE/DETERMINISTIC" : "LIVE REAL API"})`,
  );
  console.log(` Model:          ${model}`);
  console.log(
    ` Retries/Pacing: max_retries=${options.maxRetries ?? 5}, interval=${options.minIntervalSec ?? 2}s`,
  );
  console.log(
    "================================================================================\n",
  );

  const systemPrompt = loadSystemInstruction();
  const toolsDeclaration = loadToolDeclarations();
  const promptHash = createHash("sha256").update(systemPrompt).digest("hex");
  const toolsHash = createHash("sha256")
    .update(JSON.stringify(toolsDeclaration))
    .digest("hex");
  const artifactVersion = `v1+p${promptHash.slice(0, 12)}+t${toolsHash.slice(0, 12)}`;

  const results: CaseRunResult[] = [];
  const maxRetries = options.maxRetries ?? 5;
  const baseDelaySec = options.baseDelaySec ?? 3.0;
  const minIntervalSec = options.minIntervalSec ?? 2.0;

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    process.stdout.write(`[${i + 1}/${cases.length}] Running ${c.id}... `);

    try {
      const agentResult = await runWithRetry(
        async () => {
          if (c.turns && c.turns.length > 0) {
            const latestTurn = c.turns[c.turns.length - 1];
            return await runAgent({
              query: latestTurn.content,
              messages: c.turns,
              guildId: c.guild_id || "demo",
              role: c.role || "learner",
              offlineMode,
              provider,
              model,
            });
          } else {
            return await runAgent({
              query: c.query || c.input || "",
              guildId: c.guild_id || "demo",
              role: c.role || "learner",
              offlineMode,
              provider,
              model,
            });
          }
        },
        maxRetries,
        baseDelaySec,
      );

      const evaluation = evaluateCaseExecution(c, agentResult);
      results.push(evaluation);

      if (evaluation.evaluation.passed) {
        console.log(
          `\x1b[32mPASS\x1b[0m (${agentResult.telemetry.latencyMs}ms)`,
        );
      } else {
        console.log(
          `\x1b[31mFAIL\x1b[0m: ${evaluation.evaluation.failures.join("; ")}`,
        );
      }
    } catch (err) {
      console.log(`\x1b[31mPROVIDER_ERROR\x1b[0m: ${String(err)}`);
      results.push({
        id: c.id,
        phase: c.phase || "B",
        suite: c.suite || "general",
        role: c.role || "learner",
        is_multiturn: Boolean(c.turns && c.turns.length > 1),
        input: c.turns || c.query || c.input || "",
        metadata: c.metadata || {},
        expect: c.expect,
        actual: {
          status: "error",
          text: String(err),
          tool_calls: [],
          latency_ms: 0,
          code_points: 0,
          sentences: 0,
        },
        evaluation: {
          passed: false,
          routing_correct: false,
          args_correct: false,
          boundary_compliance: false,
          length_compliance: false,
          no_premature_alert: true,
          failures: [`Provider error: ${String(err)}`],
          observed_mismatch: "provider_error",
          failure_type: "provider_error",
        },
        telemetry: null,
      });
    }

    // RPM Pacing
    if (i < cases.length - 1 && minIntervalSec > 0 && !offlineMode) {
      await new Promise((r) => setTimeout(r, minIntervalSec * 1000));
    }
  }

  const summary = computeSummary(results);

  // Determine root agent_test_runs directory
  let runsDir = options.runsDir;
  if (!runsDir) {
    const candidatesRuns = [
      resolve(process.cwd(), "../agent_test_runs"),
      resolve(process.cwd(), "agent_test_runs"),
    ];
    runsDir =
      candidatesRuns.find((p) => existsSync(p)) ||
      candidatesRuns.find((p) => existsSync(dirname(p))) ||
      candidatesRuns[0];
  }
  if (!existsSync(runsDir)) {
    mkdirSync(runsDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 15);
  const suiteSlug = options.suite || basename(targetPath, ".json");
  const runId = `easygame_b_${suiteSlug}_${provider}_${timestamp}`;

  const report: EvaluationRunReport = {
    run_id: runId,
    version: "v1.0",
    artifact_version: artifactVersion,
    prompt_hash: promptHash,
    tools_hash: toolsHash,
    provider,
    model,
    offline_mode: offlineMode,
    dataset_id: dataset.dataset_id,
    description: dataset.description || "",
    generated_at: now.toISOString(),
    summary,
    results,
  };

  const outputPath = resolve(runsDir, `${runId}.json`);
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  // Output console summary
  console.log(
    "\n================================================================================",
  );
  console.log(
    "                           EVALUATION RUN SUMMARY                              ",
  );
  console.log(
    "================================================================================",
  );
  console.log(`Total Cases:              ${summary.total_cases}`);
  console.log(`Measured Cases:           ${summary.measured_cases}`);
  console.log(
    `Passed Cases:             \x1b[32m${summary.passed_cases}\x1b[0m`,
  );
  console.log(
    `Failed Cases:             ${summary.failed_cases ? `\x1b[31m${summary.failed_cases}\x1b[0m` : "0"}`,
  );
  console.log(`Provider Errors:          ${summary.provider_errors}`);
  console.log(
    `Overall Case Accuracy:    \x1b[1m${(summary.case_accuracy * 100).toFixed(1)}%\x1b[0m`,
  );
  console.log(
    `Tool Routing Accuracy:    ${(summary.tool_routing_accuracy * 100).toFixed(1)}%`,
  );
  console.log(
    `Argument Accuracy:        ${(summary.argument_accuracy * 100).toFixed(1)}%`,
  );
  console.log(
    `Multi-Turn Accuracy:      ${(summary.multiturn_accuracy * 100).toFixed(1)}%`,
  );
  console.log(
    `Boundary Compliance:      ${(summary.boundary_compliance_rate * 100).toFixed(1)}%`,
  );
  console.log(
    `Length Compliance:        ${(summary.length_compliance_rate * 100).toFixed(1)}%`,
  );
  console.log(
    `Zero Early Coach Alerts:  ${summary.zero_premature_coach_alerts ? "PASS (YES)" : "FAIL (NO)"}`,
  );
  console.log(
    "--------------------------------------------------------------------------------",
  );
  console.log(`Report JSON saved to:     ${outputPath}`);
  console.log(
    "================================================================================\n",
  );

  return report;
}

// 8. Execute when run as script
const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("run_agent_eval.ts") ||
  process.argv[1]?.endsWith("run_agent_eval.mjs");

if (isMain) {
  const args = process.argv.slice(2);
  const suiteArg =
    args.find((a) => a.startsWith("--suite="))?.split("=")[1] ||
    (args.includes("--suite") ? args[args.indexOf("--suite") + 1] : undefined);
  const casesArg =
    args.find((a) => a.startsWith("--cases="))?.split("=")[1] ||
    (args.includes("--cases") ? args[args.indexOf("--cases") + 1] : undefined);
  const providerArg =
    args.find((a) => a.startsWith("--provider="))?.split("=")[1] ||
    (args.includes("--provider")
      ? args[args.indexOf("--provider") + 1]
      : undefined);
  const modelArg =
    args.find((a) => a.startsWith("--model="))?.split("=")[1] ||
    (args.includes("--model") ? args[args.indexOf("--model") + 1] : undefined);
  const offlineFlag = args.includes("--offline");

  runAgentEvaluation({
    suite: suiteArg,
    casesPath: casesArg,
    provider: providerArg,
    model: modelArg,
    offline: offlineFlag,
  })
    .then((rep) => {
      if (rep.summary.failed_cases > 0 || rep.summary.provider_errors > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("Evaluation execution encountered fatal error:", err);
      process.exit(1);
    });
}
