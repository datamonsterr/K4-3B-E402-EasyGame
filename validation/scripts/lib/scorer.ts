import type { EvaluationCase, EvaluationRun } from "./contracts.ts";

export type ObservedCase = EvaluationRun["cases"][number];

function sentenceCount(value: string): number {
  return [
    ...new Intl.Segmenter("vi", { granularity: "sentence" }).segment(value),
  ].length;
}

function hasTraceEvent(observed: ObservedCase, required: string): boolean {
  if (required === "decision")
    return observed.telemetry.decision_summaries.length > 0;
  if (required === "tool_call")
    return observed.telemetry.tool_events.length > 0;
  if (required === "observation")
    return observed.telemetry.observation_summaries.length > 0;
  const searchable = [
    ...observed.telemetry.decision_summaries,
    ...observed.telemetry.tool_events,
    ...observed.telemetry.observation_summaries,
  ]
    .join(" ")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_");
  return searchable.includes(
    required.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_"),
  );
}

function sameDelta(
  left: ObservedCase["database_deltas"][number],
  right: ObservedCase["database_deltas"][number],
): boolean {
  return (
    left.table === right.table &&
    left.operation === right.operation &&
    left.fixture_ref === right.fixture_ref &&
    left.expected_count === right.expected_count
  );
}

export function scoreCase(
  expected: EvaluationCase,
  observed: ObservedCase,
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const expectedTools = expected.expected.ordered_tool_workflow.map(
    (step) => step.tool,
  );
  const actualTools = observed.tool_calls.map((call) => call.name);
  if (JSON.stringify(expectedTools) !== JSON.stringify(actualTools))
    reasons.push("tool order mismatch");
  if (observed.response.outcome !== expected.expected.outcome)
    reasons.push("outcome mismatch");
  const body = observed.response.body ?? "";
  if (
    Array.from(body).length > expected.expected.public_response.max_code_points
  )
    reasons.push("response too long");
  if (
    body &&
    sentenceCount(body) > expected.expected.public_response.max_sentences
  )
    reasons.push("too many sentences");

  const providerExpectation = expected.expected.trace.provider_call;
  if (providerExpectation === "required" && !observed.provider_attempted)
    reasons.push("provider was not attempted");
  if (
    providerExpectation === "required" &&
    expected.expected.outcome !== "unavailable" &&
    !observed.provider_succeeded
  )
    reasons.push("provider did not succeed");
  if (providerExpectation === "forbidden" && observed.provider_attempted)
    reasons.push("provider was unexpectedly attempted");

  if (
    expected.expected.public_response.source_card === "required" &&
    !observed.response.source_card
  )
    reasons.push("source card missing");
  if (
    expected.expected.public_response.source_card === "forbidden" &&
    observed.response.source_card
  )
    reasons.push("unexpected source card");
  const allowedSources =
    expected.expected.public_response.allowed_source_refs ?? [];
  if (
    allowedSources.length > 0 &&
    (observed.source_ids.length > 0 ||
      expected.expected.public_response.source_card === "required") &&
    !observed.source_ids.some((source) => allowedSources.includes(source))
  )
    reasons.push("source provenance mismatch");

  for (const delta of expected.expected.database_deltas) {
    if (
      !observed.database_deltas.some((candidate) => sameDelta(delta, candidate))
    )
      reasons.push(
        `database delta mismatch: ${delta.table}/${delta.operation}/${delta.fixture_ref}`,
      );
  }
  for (const required of expected.expected.trace.required_events) {
    if (!hasTraceEvent(observed, required))
      reasons.push(`required trace event missing: ${required}`);
  }
  for (const effect of observed.detected_forbidden_effects) {
    if (expected.expected.forbidden_external_effects.includes(effect))
      reasons.push(`forbidden effect detected: ${effect}`);
  }
  const serialized = JSON.stringify(observed).toLowerCase();
  for (const field of expected.expected.trace.forbidden_fields) {
    if (serialized.includes(field.toLowerCase()))
      reasons.push(`forbidden trace field present: ${field}`);
  }
  return { passed: reasons.length === 0, reasons };
}
