import assert from "node:assert/strict";
import test from "node:test";
import { scoreCase } from "../scripts/lib/scorer.ts";

function expected(overrides: Record<string, unknown> = {}) {
  return {
    expected: {
      outcome: "answered",
      ordered_tool_workflow: [{ tool: "query_notices" }],
      public_response: {
        max_code_points: 300,
        max_sentences: 3,
        source_card: "required",
        allowed_source_refs: ["notice.lab1.latest"],
      },
      database_deltas: [],
      trace: {
        provider_call: "required",
        required_events: ["decision", "tool_call", "observation"],
        forbidden_fields: ["thoughtProcess", "accessToken"],
      },
      forbidden_external_effects: ["fabricated_link"],
      ...overrides,
    },
  } as unknown as Parameters<typeof scoreCase>[0];
}

function observed(overrides: Record<string, unknown> = {}) {
  return {
    response: {
      outcome: "answered",
      body: "Hạn là 20:00.",
      source_card: "https://discord.com/channels/100/200/300",
    },
    tool_calls: [{ name: "query_notices" }],
    provider_attempted: true,
    provider_succeeded: true,
    source_ids: ["notice.lab1.latest"],
    database_deltas: [],
    detected_forbidden_effects: [],
    telemetry: {
      decision_summaries: ["decision"],
      tool_events: ["query_notices"],
      observation_summaries: ["observation"],
    },
    ...overrides,
  } as unknown as Parameters<typeof scoreCase>[1];
}

test("scores workflow, provider, trace, provenance, and response invariants", () => {
  assert.deepEqual(scoreCase(expected(), observed()), {
    passed: true,
    reasons: [],
  });
});

test("provider failure expectation requires an attempted but failed real call", () => {
  const providerFailure = expected({
    outcome: "unavailable",
    ordered_tool_workflow: [],
    public_response: {
      max_code_points: 300,
      max_sentences: 3,
      source_card: "forbidden",
    },
    trace: {
      provider_call: "required",
      required_events: ["provider_error"],
      forbidden_fields: [],
    },
  });
  const failedCall = observed({
    response: { outcome: "unavailable" },
    tool_calls: [],
    provider_attempted: true,
    provider_succeeded: false,
    source_ids: [],
    telemetry: {
      decision_summaries: ["provider_error"],
      tool_events: [],
      observation_summaries: [],
    },
  });
  assert.equal(scoreCase(providerFailure, failedCall).passed, true);
  assert.match(
    scoreCase(
      providerFailure,
      observed({ ...failedCall, provider_attempted: false }),
    ).reasons.join(),
    /provider was not attempted/,
  );
});

test("rejects mismatched database deltas, provenance, trace, and forbidden effects", () => {
  const scored = scoreCase(
    expected({
      database_deltas: [
        {
          table: "questions",
          operation: "update",
          fixture_ref: "question.open.versioned",
          expected_count: 1,
        },
      ],
    }),
    observed({
      source_ids: ["notice.other"],
      database_deltas: [
        {
          table: "questions",
          operation: "update",
          fixture_ref: "question.open.versioned",
          expected_count: 0,
        },
      ],
      detected_forbidden_effects: ["fabricated_link"],
      telemetry: {
        decision_summaries: [],
        tool_events: ["query_notices"],
        observation_summaries: [],
      },
    }),
  );
  assert.equal(scored.passed, false);
  assert.match(scored.reasons.join("\n"), /database delta mismatch/);
  assert.match(scored.reasons.join("\n"), /source provenance mismatch/);
  assert.match(scored.reasons.join("\n"), /required trace event missing/);
  assert.match(scored.reasons.join("\n"), /forbidden effect detected/);
});

test("forbidden provider calls fail when the provider was attempted", () => {
  const scored = scoreCase(
    expected({
      ordered_tool_workflow: [],
      trace: {
        provider_call: "forbidden",
        required_events: [],
        forbidden_fields: [],
      },
    }),
    observed({ tool_calls: [], provider_attempted: true }),
  );
  assert.match(scored.reasons.join(), /provider was unexpectedly attempted/);
});
