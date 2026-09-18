# Hosted Agent Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a canonical validation system that proves the production EasyGame agent uses a real provider and authenticated allowlisted tools backed by hosted Supabase for reads, writes, permissions, and bounded multi-step workflows.

**Architecture:** The live runner authenticates dedicated validation identities and calls the production HTTP API. A separate privileged validation controller only arranges and cleans uniquely namespaced synthetic hosted data; the agent and its tools always use session-scoped clients and server-bound actor/guild context. Versioned JSON contracts, invariant scoring, and allowlist-based report serialization prevent silent fallback, testset overfitting, unsafe telemetry, and unproven success claims.

**Tech Stack:** Next.js 16 App Router, strict TypeScript, AI SDK `ToolLoopAgent`, Supabase Auth/PostgreSQL/RLS, Zod, Ajv JSON Schema 2020-12, Vitest, pgTAP, Playwright, pnpm.

---

## File Structure

New or canonical files:

```text
validation/
  README.md
  OBSERVATION_LOG.md
  version_log.csv
  tsconfig.json
  fixtures/
    README.md
    synthetic-validation-data.json
  schemas/
    eval-dataset.schema.json
    eval-run.schema.json
  testsets/
    manifest.json
    us-b1-verified-logistics.json
    us-b2-unanswered-radar.json
    us-b3-authenticated-agent.json
    us-b4-role-permissions.json
    us-b5-messages-reply.json
  scripts/
    validate-testsets.ts
    run-agent-eval.ts
    log-version.ts
    summarize-runs.ts
    lib/
      contracts.ts
      schema-validation.ts
      hosted-config.ts
      hosted-auth.ts
      hosted-fixtures.ts
      scorer.ts
      safe-report.ts
      hashes.ts
  tests/
    schema-validation.test.ts
    hosted-config.test.ts
    hosted-auth.test.ts
    hosted-fixtures.test.ts
    scorer.test.ts
    safe-report.test.ts
    run-agent-eval.test.ts
    version-log.test.ts
  runs/baseline/
    README.md
    legacy-2026-09-18-partial.json
```

Production changes stay behind the existing assistant, auth, radar, and database interfaces. Route handlers remain composition-only.

### Task 1: Define versioned evaluation contracts

**Files:**

- Create: `validation/tsconfig.json`
- Create: `validation/schemas/eval-dataset.schema.json`
- Create: `validation/schemas/eval-run.schema.json`
- Create: `validation/scripts/lib/contracts.ts`
- Create: `validation/scripts/lib/schema-validation.ts`
- Create: `validation/scripts/validate-testsets.ts`
- Create: `validation/tests/schema-validation.test.ts`
- Modify: `codebase/package.json`
- Modify: `codebase/pnpm-lock.yaml`

- [ ] **Step 1: Add failing schema tests**

Define a minimal valid case and assert rejection of caller authority and unsafe report fields:

```ts
it("rejects caller-supplied authority", () => {
  const invalid = structuredClone(validDataset);
  invalid.cases[0].request = { query: "Lab 1?", role: "lab_coach" };
  expect(() => validateDataset(invalid)).toThrow(/role/);
});

it.each(["thoughtProcess", "accessToken", "rawProviderResponse"])(
  "rejects unsafe report field %s",
  (field) => {
    expect(() => validateRun({ ...validRun, [field]: "secret" })).toThrow();
  },
);
```

The dataset schema requires `schema_version`, `dataset_id`, `story_id`, `language: "vi"`, and at least ten cases. Each case requires an identity alias, user-only conversation, AC references, fixture references, partition and paraphrase family, ordered tool workflow, bounded public expectations, database deltas, safe trace expectations, and forbidden external effects. Set `additionalProperties: false` on authority-sensitive objects.

- [ ] **Step 2: Verify the tests fail for missing contracts**

Run:

```bash
cd codebase
pnpm tsx --test ../validation/tests/schema-validation.test.ts
```

Expected: FAIL because the schema validator and schemas do not exist.

- [ ] **Step 3: Implement the minimal typed contracts and Ajv validator**

Use discriminated execution kinds and validity states:

```ts
export type ExecutionKind = "agent_api" | "tool_contract" | "http" | "browser";
export type IdentityFixture =
  | "learner_a"
  | "coach_a"
  | "learner_b"
  | "coach_b"
  | "unauthenticated";

export type RunValidity = "valid" | "partial" | "invalid" | "incomplete";
```

Load Ajv from the single `codebase` package, compile both schemas, report JSON paths on failure, recompute manifest SHA-256 values, and reject duplicate case IDs/paraphrase families or missing AC mappings.

- [ ] **Step 4: Add package scripts and validate green**

Add:

```json
"validation:test": "tsx --test ../validation/tests/*.test.ts",
"validation:typecheck": "tsc --noEmit -p ../validation/tsconfig.json",
"validation:datasets": "tsx ../validation/scripts/validate-testsets.ts",
"eval:hosted": "tsx ../validation/scripts/run-agent-eval.ts"
```

Run the schema test again and expect PASS.

- [ ] **Step 5: Commit the contract slice**

```bash
git add validation/schemas validation/scripts/lib/contracts.ts validation/scripts/lib/schema-validation.ts validation/scripts/validate-testsets.ts validation/tests/schema-validation.test.ts validation/tsconfig.json codebase/package.json codebase/pnpm-lock.yaml
git commit -m "test(validation): define evaluation contracts"
```

### Task 2: Add the synthetic fixture catalog and five Vietnamese suites

**Files:**

- Create: `validation/fixtures/README.md`
- Create: `validation/fixtures/synthetic-validation-data.json`
- Create: `validation/testsets/manifest.json`
- Create: `validation/testsets/us-b1-verified-logistics.json`
- Create: `validation/testsets/us-b2-unanswered-radar.json`
- Create: `validation/testsets/us-b3-authenticated-agent.json`
- Create: `validation/testsets/us-b4-role-permissions.json`
- Create: `validation/testsets/us-b5-messages-reply.json`
- Modify: `validation/tests/schema-validation.test.ts`

- [ ] **Step 1: Add failing inventory and fixture-provenance tests**

Assert five exact suite names, 50 total unique case IDs, at least ten cases per story, every documented AC represented, manifest hashes matching raw files, and every mutable fixture declaring `run_owned: true` with a `${run_id}` provenance template. Reject credentials, production UUIDs, real identities, restricted-pack content, and assistant-authored initial turns.

- [ ] **Step 2: Verify RED**

Run `cd codebase && pnpm tsx --test ../validation/tests/schema-validation.test.ts`.

Expected: FAIL because the manifest, fixture catalog, and suites are absent.

- [ ] **Step 3: Create the symbolic synthetic fixture catalog**

Include two allowlisted validation guild aliases; verified/unverified notice revisions; a tied conflict; 119/120/239/240-minute questions; older unresolved, answered, resolved, and version-conflict records; and valid/missing Discord-link cases. Store no hosted IDs or credentials.

- [ ] **Step 4: Create ten Vietnamese cases for each story**

Use this minimum matrix:

| Story | Required coverage |
| --- | --- |
| B1 | latest verified notice, extension, tied conflict, ignore unverified, mixed intent, missing evidence, injection, learner mutation denial, cross-guild source denial, no-diacritic query |
| B2 | 119/120/239/240 boundaries, old unresolved retention, answered-not-resolved, authorized resolution, radar→idempotent alert, stale version, real digest |
| B3 | authority payload rejection, missing/ambiguous membership, grounded ReAct order, real two-turn clarification, academic refusal, exfiltration refusal, radar→alert, radar→resolve, learner denial, provider failure |
| B4 | no-membership block, static learner/coach roles, self-provision denials, promotion/demotion denials, guild spoof, cross-guild RLS, ambiguous membership |
| B5 | ticket navigation, scoped context, no raw JSON, coach reply, answered-not-resolved, learner denial, cross-guild denial, invalid reply, no Discord side effect, authentic-or-absent link |

Use distinct paraphrase families and development/held-out partitions. Assertions target tool order, source IDs, permission/state invariants, and database deltas—not exact prose.

- [ ] **Step 5: Generate manifest hashes and verify GREEN**

Run:

```bash
cd codebase
pnpm validation:datasets
pnpm tsx --test ../validation/tests/schema-validation.test.ts
```

Expected final line: `Validated 5 suites / 50 cases` and all tests pass.

- [ ] **Step 6: Commit the datasets**

```bash
git add validation/fixtures validation/testsets validation/tests/schema-validation.test.ts
git commit -m "test(validation): add Vietnamese acceptance suites"
```

### Task 3: Make active Supabase operations typed and fail closed

**Files:**

- Create: `codebase/app/backend/assistant/agent/operation-errors.ts`
- Create: `codebase/tests/agent-operations.test.ts`
- Modify: `codebase/app/backend/assistant/agent/contracts.ts`
- Modify: `codebase/app/backend/assistant/agent/operations.ts`
- Modify: `codebase/app/backend/assistant/logistics/supabase-evidence.ts`
- Modify: `codebase/app/backend/tools/evaluate_radar/tool.ts`
- Modify: `codebase/app/backend/tools/format_daily_digest/tool.ts`
- Modify: `codebase/app/backend/artifacts/tools.yaml`
- Modify: `codebase/tests/tools-db.test.ts`

- [ ] **Step 1: Write failing operation-boundary tests**

Cover successful empty reads versus database errors, mandatory guild filters, sanitized stable errors, radar question `id/status/version`, real digest derivation, and absence of fabricated broadcast/profile/score success.

```ts
await expect(operations.evaluateRadar({ guildId })).rejects.toMatchObject({
  kind: "unavailable",
  operation: "evaluate_radar",
});
expect(serializedError).not.toContain("SUPABASE_SECRET_KEY");
```

- [ ] **Step 2: Verify RED**

Run `cd codebase && pnpm vitest run tests/agent-operations.test.ts tests/tools-db.test.ts`.

Expected: failures demonstrating empty/fabricated fallback behavior.

- [ ] **Step 3: Implement fail-closed adapters**

Introduce:

```ts
export class ToolOperationError extends Error {
  constructor(
    readonly operation: string,
    readonly kind: "unavailable" | "forbidden" | "conflict" | "invalid",
  ) {
    super(`${operation} failed`);
  }
}
```

Make the active operations accept only the already-authenticated client supplied by composition. Database errors throw sanitized errors; zero rows remain legitimate data. Remove environment-created clients, fixture/memory fallback, and fabricated profile/score/broadcast outputs from the active live registry. Model-visible schemas never accept guild, actor, role, client, or SQL arguments.

- [ ] **Step 4: Derive digest and radar output from real rows**

Use injected clocks and bounded summaries. Preserve exact 120/240-minute behavior and retain older unresolved questions. Return only fields required by a subsequent allowlisted operation.

- [ ] **Step 5: Verify GREEN and commit**

Run the targeted tests, then:

```bash
git add codebase/app/backend/assistant codebase/app/backend/tools codebase/app/backend/artifacts/tools.yaml codebase/tests/agent-operations.test.ts codebase/tests/tools-db.test.ts
git commit -m "fix(agent): fail closed on tool data errors"
```

### Task 4: Add an authenticated idempotent staff-alert RPC and concurrency coverage

**Files:**

- Create: next additive file from `cd codebase && pnpm supabase migration new hosted_agent_operations`
- Create: `codebase/supabase/tests/agent_tools.test.sql`
- Modify: `codebase/app/backend/database/schema.types.ts` using the generator
- Modify: `codebase/app/backend/assistant/agent/operations.ts`
- Modify: `codebase/tests/agent-operations.test.ts`
- Modify: `codebase/scripts/test-db.mjs`

- [ ] **Step 1: Generate the additive migration file**

Use the Supabase CLI command rather than inventing a timestamp. Do not edit an existing migration.

- [ ] **Step 2: Write failing pgTAP authorization and concurrency tests**

Assert coach success, learner denial (`42501`), anonymous denial, cross-guild denial, idempotent retry, conflicting key reuse, invalid tier/summary, learner inability to read alerts, stale resolution (`40001`), and exactly one winner for two concurrent resolution sessions.

- [ ] **Step 3: Verify RED on a clean local database**

Run `cd codebase && pnpm test:db`.

Expected: FAIL because `create_staff_alert` and new columns do not exist.

- [ ] **Step 4: Implement the minimal SQL contract**

Add nullable `actor_id`, bounded `summary`, and `idempotency_key` to `radar_alerts`, with indexed foreign keys and an atomic uniqueness constraint. Implement `public.create_staff_alert(p_question_id, p_tier, p_summary, p_idempotency_key)` that derives actor from `auth.uid()` and guild from the question, checks coach membership, pins `search_path`, performs an atomic insert/replay, and never accepts actor/guild parameters.

Revoke execution from `PUBLIC` and `anon`; grant only `authenticated`. Do not grant broad table mutation rights. Keep resolution locking to a short single-row transaction and preserve one audit event.

- [ ] **Step 5: Update the TypeScript adapter and generated types**

Call the authenticated RPC, map SQLSTATE `40001` to `conflict`, and return only bounded fields. Regenerate database types using the repository command after the local schema is current.

- [ ] **Step 6: Verify GREEN and commit**

Run:

```bash
cd codebase
pnpm test:db
pnpm vitest run tests/agent-operations.test.ts
pnpm typecheck
```

Commit:

```bash
git add codebase/supabase codebase/app/backend/database/schema.types.ts codebase/app/backend/assistant/agent/operations.ts codebase/tests/agent-operations.test.ts codebase/scripts/test-db.mjs
git commit -m "feat(database): add authenticated staff alert operation"
```

### Task 5: Add bounded observation-dependent multi-tool workflows

**Files:**

- Modify: `codebase/app/backend/assistant/agent/contracts.ts`
- Modify: `codebase/app/backend/assistant/agent/agent.ts`
- Modify: `codebase/app/backend/assistant/agent/tool-registry.ts`
- Create: `codebase/tests/agent-workflows.test.ts`
- Modify: `codebase/tests/acceptance/radar-authorization.acceptance.test.ts`
- Modify: `codebase/tests/acceptance/tool-discipline.acceptance.test.ts`

- [ ] **Step 1: Write failing workflow tests**

Prove ordered `evaluate_radar → create_staff_alert` and `evaluate_radar → resolve_question` execution. The second call must use a question ID, tier, or expected version present in the first observation. Learner requests must stop before any privileged adapter call. Attempts to inject a foreign guild or unseen question ID fail.

- [ ] **Step 2: Verify RED**

Run `cd codebase && pnpm vitest run tests/agent-workflows.test.ts tests/acceptance/radar-authorization.acceptance.test.ts tests/acceptance/tool-discipline.acceptance.test.ts`.

- [ ] **Step 3: Implement explicit workflow policies**

Represent allowed transitions as data, for example:

```ts
const WORKFLOWS = {
  alert_overdue: ["evaluate_radar", "create_staff_alert"],
  resolve_overdue: ["evaluate_radar", "resolve_question"],
} as const;
```

Expose only the tools for the authenticated role and classified workflow. Bind guild/actor in closures, cap steps, validate that mutation arguments reference the preceding observation, and emit only safe decision/tool/observation summaries.

- [ ] **Step 4: Verify GREEN and commit**

Run the targeted tests and commit:

```bash
git add codebase/app/backend/assistant/agent codebase/tests/agent-workflows.test.ts codebase/tests/acceptance
git commit -m "feat(agent): add bounded multi-tool workflows"
```

### Task 6: Persist safe production execution evidence and support real conversation history

**Files:**

- Create: `codebase/app/backend/assistant/observability.ts`
- Create: additive observability migration using `supabase migration new agent_run_observability`
- Create: `codebase/tests/agent-observability.test.ts`
- Create: `codebase/tests/agent-conversation.test.ts`
- Modify: `codebase/app/backend/assistant/agent/contracts.ts`
- Modify: `codebase/app/backend/assistant/agent/agent.ts`
- Modify: `codebase/app/backend/assistant/logistics/contracts.ts`
- Modify: `codebase/app/backend/assistant/logistics/composition.ts`
- Modify: `codebase/app/api/demo/answer/handler.ts`
- Modify: `codebase/app/api/demo/answer/route.ts`
- Modify: `codebase/tests/answer-route.test.ts`
- Modify: `codebase/supabase/tests/invariants.test.sql`
- Regenerate: `codebase/app/backend/database/schema.types.ts`

- [ ] **Step 1: Write failing route, trace, and history tests**

Assert missing model/provider failure returns generic 503 without deterministic success; success returns unchanged public JSON plus `X-EasyGame-Run-Id`; public output contains no trace; recorded events are ordered and allowlisted; secret/raw-payload canaries never enter recorder input. Validate a bounded `history` containing only alternating user/assistant public messages and reject tool roles, authority fields, excessive turns, and excessive code points.

- [ ] **Step 2: Verify RED**

Run:

```bash
cd codebase
pnpm vitest run tests/answer-route.test.ts tests/agent-observability.test.ts tests/agent-conversation.test.ts
```

- [ ] **Step 3: Implement live-only production execution contract**

Define:

```ts
type AgentExecution = {
  answer: AnswerLogisticsResult;
  provider: string;
  model: string;
  providerAttempted: true;
  providerSucceeded: boolean;
  executionMode: "live_provider";
  trace: readonly SafeAgentTraceEvent[];
};
```

Remove deterministic substitution from the production route and propagate provider failures. Keep deterministic logic only behind explicit unit/local-preview dependencies. Persist an opaque run and bounded events through a server-only recorder. Never persist prompts, reasoning, raw tool output, provider bodies, cookies, tokens, or learner email.

- [ ] **Step 4: Add bounded history without adding authority**

The API accepts only `{ query, history? }`. The runner later builds history from actual prior user input and actual prior public responses. Tool authority remains server-bound. Existing clients without history remain compatible.

- [ ] **Step 5: Add additive database constraints and RLS tests**

Extend run status/provider fields and event types/metadata allowlist only as needed for safe traces. Ordinary clients cannot insert or alter evidence. Cross-guild users cannot read runs/events. Use RLS and least privilege documented in the current Supabase guidance.

- [ ] **Step 6: Verify GREEN and commit**

Run targeted tests, `pnpm test:db`, and `pnpm typecheck`, then commit:

```bash
git add codebase/app codebase/tests codebase/supabase
git commit -m "feat(agent): record safe production execution evidence"
```

### Task 7: Build guarded hosted authentication and synthetic fixture lifecycle

**Files:**

- Create: `validation/scripts/lib/hosted-config.ts`
- Create: `validation/scripts/lib/hosted-auth.ts`
- Create: `validation/scripts/lib/hosted-fixtures.ts`
- Create: `validation/tests/hosted-config.test.ts`
- Create: `validation/tests/hosted-auth.test.ts`
- Create: `validation/tests/hosted-fixtures.test.ts`
- Modify: `codebase/.env.example`

- [ ] **Step 1: Write failing guard/auth/cleanup tests with injected HTTP fakes**

Reject missing acknowledgement, HTTP/local Supabase URLs, malformed or empty guild allowlists, absent dedicated identities, ambiguous memberships, and secret-bearing error messages. Prove login cookies remain only in memory. Prove cleanup runs after execution errors, refuses any ownership mismatch, and issues no broad delete.

- [ ] **Step 2: Verify RED**

Run `cd codebase && pnpm tsx --test ../validation/tests/hosted-config.test.ts ../validation/tests/hosted-auth.test.ts ../validation/tests/hosted-fixtures.test.ts`.

- [ ] **Step 3: Implement the environment contract**

Require an exact acknowledgement, HTTPS hosted app/Supabase origins, two allowlisted validation guild UUIDs, four dedicated pre-provisioned identity credentials, publishable credentials for auth, and a server-only secret for arrangement/cleanup. Validate values but never print them; reports retain only presence flags and host fingerprints.

- [ ] **Step 4: Implement production HTTP authentication**

Authenticate through the app route with same-origin headers, keep cookies in memory, verify `/api/auth/me` reports exactly the expected stored membership, call `/api/demo/answer`, capture bounded public response/run ID/latency, and log out in `finally`. Never call agent functions directly.

- [ ] **Step 5: Implement exact-ID hosted seeding and cleanup**

Generate a random run ID and `easygame-validation/<run-id>` namespace. Seed only symbolic synthetic fixtures into allowlisted guilds and record every created ID in a typed manifest. Before deletion, re-read exact IDs and verify dataset checksum/name, source namespace, guild allowlist, and run prefix. Delete only exact owned IDs in foreign-key order; never delete guilds, memberships, or auth users.

- [ ] **Step 6: Verify GREEN and commit**

Run the three tests and commit:

```bash
git add validation/scripts/lib/hosted-*.ts validation/tests/hosted-*.test.ts codebase/.env.example
git commit -m "feat(validation): add guarded hosted fixture lifecycle"
```

### Task 8: Implement invariant scoring, sanitized reports, and the canonical runner

**Files:**

- Create: `validation/scripts/lib/scorer.ts`
- Create: `validation/scripts/lib/safe-report.ts`
- Create: `validation/scripts/lib/hashes.ts`
- Create: `validation/scripts/run-agent-eval.ts`
- Create: `validation/tests/scorer.test.ts`
- Create: `validation/tests/safe-report.test.ts`
- Create: `validation/tests/run-agent-eval.test.ts`

- [ ] **Step 1: Write failing scorer and redaction tests**

Test exact ordered tools, maximum steps, observation dependency, source ownership, output bounds, permission results, exact database delta/unchanged tables, safe events, provider completion, and cleanup. Infrastructure failures remain in the denominator. Add canaries for bearer/JWT/cookie/key/password/thought-process/raw-provider/unrestricted-row content and require report writing to fail if any survives.

- [ ] **Step 2: Verify RED**

Run `cd codebase && pnpm tsx --test ../validation/tests/scorer.test.ts ../validation/tests/safe-report.test.ts ../validation/tests/run-agent-eval.test.ts`.

- [ ] **Step 3: Implement allowlist scoring and serialization**

A run is valid only when provider completion, production API path, hosted Supabase provenance, authenticated context, no fallback, safe trace, and cleanup gates all pass. Use an allowlist serializer plus a final deny-pattern scan; never recursively dump arbitrary objects.

- [ ] **Step 4: Implement the ten runner phases**

Validate config/schema; create namespace; seed; authenticate; take bounded pre-snapshots; execute every user turn while forwarding only actual prior public messages; load the server-recorded safe trace by run ID; take bounded post-snapshots; score; clean in `finally`; write the sanitized report only after cleanup status is known.

- [ ] **Step 5: Verify GREEN and commit**

Run all validation tests and commit:

```bash
git add validation/scripts validation/tests
git commit -m "feat(validation): add hosted production-path evaluator"
```

### Task 9: Record the partial baseline and append-only improvement history

**Files:**

- Create: `validation/runs/baseline/legacy-2026-09-18-partial.json`
- Create: `validation/runs/baseline/README.md`
- Create: `validation/version_log.csv`
- Create: `validation/OBSERVATION_LOG.md`
- Create: `validation/scripts/log-version.ts`
- Create: `validation/scripts/summarize-runs.ts`
- Create: `validation/tests/version-log.test.ts`

- [ ] **Step 1: Write failing ledger tests**

Assert the exact 12-column sibling schema, duplicate run rejection without file change, path confinement to `validation/`, schema-valid report requirement, partial/invalid metric prefixing, last-valid-comparable predecessor selection, and headline exclusion of non-valid runs.

- [ ] **Step 2: Verify RED**

Run `cd codebase && pnpm tsx --test ../validation/tests/version-log.test.ts`.

- [ ] **Step 3: Create the sanitized partial baseline**

Retain aggregate historical facts only: the 24/24 offline master and 8/8 Gemini-attempt logistics result, prompt/tool hashes, and reasons the score is non-comparable. Mark gates false for production API, authenticated identity, consistent hosted DB provenance, writes, RLS, no fallback, and cleanup. Do not copy queries, full answers, tool outputs, thought-process fields, identities, or provider payloads.

- [ ] **Step 4: Implement append-only logging and summaries**

Use columns:

```text
version,author,changed_artifact,artifact_version,prompt_hash,tools_hash,reason,hypothesis,metric_name,metric_before,metric_after,run_file
```

Append atomically; reject duplicate evidence; preserve invalid classifications; compare only prior valid runs of the same suite/metric.

- [ ] **Step 5: Write the observation history**

Include validity-gate definitions, baseline classification, results by story, observed failure clusters with evidence paths, hypotheses/experiments, regression ledger, remaining risks, and an append template. State that safe decisions are observable but private reasoning is prohibited.

- [ ] **Step 6: Verify GREEN and commit**

Run the ledger test and commit:

```bash
git add validation/runs/baseline validation/version_log.csv validation/OBSERVATION_LOG.md validation/scripts/log-version.ts validation/scripts/summarize-runs.ts validation/tests/version-log.test.ts
git commit -m "docs(validation): record partial baseline history"
```

### Task 10: Make validation canonical and retire unsafe legacy assets

**Files:**

- Create: `validation/README.md`
- Modify: `.gitignore`
- Modify: `codebase/scripts/verify-structure.mjs`
- Modify: `codebase/package.json`
- Modify: `codebase/pnpm-lock.yaml`
- Modify: `README.md`
- Modify: `codebase/README.md`
- Modify: `spec.md`
- Modify: all five files under `docs/user-stories/`
- Modify: `docs/usecases/UC-B3-01_run-authenticated-tool-agent.md`
- Delete: `validation/user_testing_log.md`
- Delete: `agent_tests/`
- Delete: `codebase/eval/`
- Delete: `codebase/scripts/run_agent_eval.ts`
- Remove ignored output directories: `agent_test_runs/`, `codebase/agent_test_runs/`

- [ ] **Step 1: Add failing structure assertions**

Require canonical schemas/suites/scripts/history, forbid legacy evaluator paths/imports, verify manifest hashes, and verify archived starter provenance remains unchanged and inactive.

- [ ] **Step 2: Verify RED**

Run `cd codebase && pnpm verify:structure`.

- [ ] **Step 3: Update scripts, ignore rules, and documentation**

Expose only `validation:datasets`, `validation:test`, `validation:typecheck`, and `eval:hosted` for the new system. Ignore future `validation/runs/*` while re-including the sanitized baseline. Document the hosted opt-in, dedicated identities, seed/run/cleanup lifecycle, validity gates, redaction, synthetic-only rule, and separation between local checks and hosted proof.

Correct the B4/B5 internal IDs and align stories with canonical rules: trusted-operator provisioning/no self-promotion, reply means answered, 300-code-point answer bound, hosted opt-in proof, and safe trace rather than full thinking.

- [ ] **Step 4: Remove the obsolete tracked and ignored evaluator assets**

Delete only the exact paths listed above. Do not alter `codebase/app/backend/artifacts/reference/starter_v0/**`.

- [ ] **Step 5: Verify structure and stale references**

Run:

```bash
cd codebase
pnpm validation:datasets
pnpm verify:structure
cd ..
test ! -e agent_tests
test ! -e agent_test_runs
test ! -e codebase/agent_test_runs
test ! -e codebase/eval
test ! -e codebase/scripts/run_agent_eval.ts
test ! -e validation/user_testing_log.md
rg -n 'agent_tests|agent_test_runs|codebase/eval|eval:agent:offline|user_testing_log' README.md spec.md codebase/README.md codebase/package.json validation docs/user-stories docs/usecases
git diff --exit-code -- codebase/app/backend/artifacts/reference/starter_v0
```

Expected: no stale active references and no archived-reference diff. Historical migration text in the approved design is allowed.

- [ ] **Step 6: Commit the canonical layout**

```bash
git add -A
git commit -m "chore(validation): retire legacy evaluation assets"
```

### Task 11: Run complete verification and one guarded hosted baseline

**Files:**

- Update generated evidence only: `validation/runs/<run-id>/report.json` (ignored)
- Append only after validity is established: `validation/version_log.csv`, `validation/OBSERVATION_LOG.md`

- [ ] **Step 1: Run fresh local verification**

```bash
cd codebase
pnpm install --frozen-lockfile
pnpm validation:typecheck
pnpm validation:test
pnpm validation:datasets
pnpm check
pnpm build
pnpm test:e2e
pnpm test:db
```

Record exact failures rather than claiming success from partial checks. If project policy still requires `npm ci`, document that the repository has only a pnpm lockfile and do not fabricate an npm result.

- [ ] **Step 2: Review the complete diff for secrets and restricted data**

Search tracked changes for credential prefixes, tokens, cookies, restricted CSV content, private reasoning fields, and raw provider payloads. Confirm the archived starter tree has no diff.

- [ ] **Step 3: Run the hosted evaluator only with explicit configured acknowledgement**

```bash
cd codebase
EASYGAME_HOSTED_VALIDATION_ACK=I_UNDERSTAND_SYNTHETIC_HOSTED_WRITES pnpm eval:hosted
```

Do not print environment values. Do not run if the guild allowlist or dedicated hosted identities are missing.

- [ ] **Step 4: Inspect the generated report and hosted cleanup**

Require `providerSucceeded: true`, production HTTP path, authenticated memberships, run-owned read canary, authorized write/read-back, learner and cross-guild zero-delta denials, ordered observation-dependent tools, safe trace, and `cleanup.status: "complete"`. Anything else is partial/invalid/incomplete.

- [ ] **Step 5: Append valid or explicitly qualified evidence**

Use the logger rather than editing historical rows. Update `OBSERVATION_LOG.md` with observed failures, root causes, and the next hypothesis. Never rewrite prior observations.

- [ ] **Step 6: Request final spec and quality review**

Provide the approved design, this plan, base SHA, head SHA, verification outputs, and hosted validity classification to independent reviewers. Fix every Critical or Important issue and re-run affected checks before completion.

