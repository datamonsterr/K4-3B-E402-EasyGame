export const SCHEMA_VERSION = "1.0.0" as const;

export type ExecutionKind = "agent_api" | "tool_contract" | "http" | "browser";
export type IdentityFixture =
  "learner_a" | "coach_a" | "learner_b" | "coach_b" | "unauthenticated";
export type RunValidity = "valid" | "partial" | "invalid" | "incomplete";
export type ValidityGates = {
  production_api: boolean;
  real_provider: boolean;
  hosted_supabase: boolean;
  authenticated: boolean;
  no_fallback: boolean;
  safe_trace: boolean;
  cleanup: boolean;
};
export type DatasetPartition = "development" | "held_out";
export type ExpectedOutcome =
  | "answered"
  | "clarify"
  | "fallback"
  | "refused"
  | "succeeded"
  | "denied"
  | "unavailable";

export interface ConversationTurn {
  role: "user";
  content: string;
}

export interface ToolWorkflowStep {
  tool: string;
  depends_on_previous: boolean;
}

export interface DatabaseDeltaExpectation {
  table: string;
  operation: "insert" | "update" | "delete" | "none";
  fixture_ref: string;
  expected_count: number;
}

export interface EvaluationCase {
  id: string;
  title: string;
  identity_fixture: IdentityFixture;
  execution_kind: ExecutionKind;
  partition: DatasetPartition;
  paraphrase_family: string;
  request: { conversation: ConversationTurn[] };
  acceptance_criteria: string[];
  fixture_refs: string[];
  expected: {
    outcome: ExpectedOutcome;
    ordered_tool_workflow: ToolWorkflowStep[];
    public_response: {
      max_code_points: number;
      max_sentences: number;
      source_card: "required" | "forbidden" | "optional";
      allowed_source_refs?: string[];
    };
    database_deltas: DatabaseDeltaExpectation[];
    trace: {
      provider_call: "required" | "forbidden" | "optional";
      required_events: string[];
      forbidden_fields: string[];
    };
    forbidden_external_effects: string[];
  };
}

export interface EvaluationDataset {
  schema_version: typeof SCHEMA_VERSION;
  dataset_id: string;
  story_id: "US-B1" | "US-B2" | "US-B3" | "US-B4" | "US-B5";
  language: "vi";
  description: string;
  cases: EvaluationCase[];
}

export interface ManifestSuite {
  file: string;
  story_id: EvaluationDataset["story_id"];
  cases: number;
  sha256: string;
}

export interface TestsetManifest {
  schema_version: typeof SCHEMA_VERSION;
  generated_at: string;
  suites: ManifestSuite[];
}

export interface EvaluationRun {
  schema_version: typeof SCHEMA_VERSION;
  run_id: string;
  dataset_id: string;
  dataset_manifest_sha256: string;
  validity: { status: RunValidity; gates: ValidityGates; reasons: string[] };
  started_at: string;
  completed_at: string;
  provider: { name: string; model: string; real_api_call: boolean };
  artifact: {
    version: string;
    artifact_version: string;
    prompt_hash: string;
    tools_hash: string;
  };
  hosted: {
    app_host_fingerprint: string;
    supabase_host_fingerprint: string;
    authenticated: boolean;
    cleanup_completed: boolean;
  };
  cases: Array<{
    case_id: string;
    status: "passed" | "failed" | "skipped";
    provider_attempted: boolean;
    provider_succeeded: boolean;
    tool_calls: Array<{
      name: string;
      arguments_summary: string;
      result_summary: string;
    }>;
    source_ids: string[];
    database_deltas: DatabaseDeltaExpectation[];
    detected_forbidden_effects: string[];
    response: { outcome: ExpectedOutcome; body?: string; source_card?: string };
    telemetry: {
      model_identity: string;
      latency_ms: number;
      decision_summaries: string[];
      tool_events: string[];
      observation_summaries: string[];
    };
  }>;
  summary: {
    metric_name: string;
    metric_value: number;
    passed_cases: number;
    total_cases: number;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}
