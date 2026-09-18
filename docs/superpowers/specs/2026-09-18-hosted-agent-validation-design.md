# Hosted Agent Validation Design

**Status:** Approved design, pending implementation plan  
**Date:** 2026-09-18  
**Scope:** EasyGame production-path agent, hosted Supabase tools, and evaluation assets

## Objective

Replace the current legacy evaluation path with a trustworthy validation system that proves the EasyGame agent uses a real model provider and allowlisted server-side tools backed by hosted Supabase. The system must exercise authenticated reads, authorized writes, permission denials, cross-guild isolation, concurrency behavior, and bounded multi-step workflows without exposing database credentials to the model.

The current results become the baseline, but their reported accuracy is classified as partial and unsuitable for end-to-end claims because provider errors can silently fall back to deterministic behavior and database tools can silently fall back to fixtures or memory.

## Normative Boundaries

`AGENTS.md` remains authoritative when existing user stories or use cases conflict with it:

- Only verified notices may ground factual logistics answers.
- The latest matching notice within the authenticated guild wins; tied conflicting notices require clarification.
- An answer body has at most 300 Unicode code points and three sentences. Its source card is separate.
- A reply marks a question answered, not resolved. Only authorized resolution ends radar tracking.
- Radar SLA tiers start at 120 and 240 minutes, and older unresolved questions remain tracked.
- Staff alerts remain staff-only; the system never sends unsolicited direct messages.
- Roles and guild access come from the authenticated session and hosted membership records, never from test input or model arguments.
- Validation stores safe decision summaries, tool events, selected evidence metadata, and state changes. It never stores private chain-of-thought, credentials, raw provider payloads, or unrestricted database rows.
- The restricted CSV and derived message dumps are outside validation scope. Hosted validation uses synthetic records only.

## Selected Architecture

Use a hybrid validation architecture with three complementary layers.

### Production-path API validation

The live runner authenticates as pre-provisioned validation users and invokes the same route/composition used by the application. The server derives the actor, guild, and role from Supabase Auth and memberships. Dataset fields cannot grant a role, select another guild, set confidence, or authorize a notice.

A live case is valid only if the configured provider completes successfully. Live mode must never silently switch to a deterministic implementation. Provider failure, malformed tool calls, database failure, or fixture fallback fails the case and is recorded explicitly.

### Tool contract validation

Focused tests invoke tool interfaces with authenticated, guild-scoped dependencies. They verify input validation, permitted tool exposure, RLS behavior, expected database effects, and fail-closed errors. They also make root causes visible when a black-box API case fails.

The agent does not receive a Supabase client, database credential, table name, or arbitrary SQL capability. It selects from allowlisted tool schemas. Each server-side adapter binds the authenticated guild and actor before executing a parameterized database operation.

### Hosted database verification controller

A validation-only controller uses server-side privileged credentials to arrange synthetic fixtures, inspect before/after state, and clean up. These credentials are not passed to the model, production agent, or tool schemas.

Each run has a cryptographically random run ID and an isolated synthetic namespace. Fixture records carry provenance through dataset identity and related foreign keys. Cleanup runs in `finally`, deletes only rows whose provenance matches the current run, follows foreign-key order, and refuses unnamespaced or production-like targets. Cleanup failure makes the run incomplete and leaves an auditable run ID for manual recovery.

## Hosted Validation Identities and Data

Hosted configuration provides dedicated validation identities rather than ordinary user accounts:

- one learner and one Lab Coach in validation guild A;
- one learner and one Lab Coach in validation guild B;
- trusted operator provisioning performed before tests;
- no dataset case may create or promote its own membership.

The synthetic fixture pack includes verified and unverified notice revisions, a tied conflicting notice pair, questions around the 119/120/239/240-minute boundaries, an older unresolved question, answered and resolved questions, and records with versions suitable for conflict tests. Synthetic Discord links may be stored only when structurally valid; the agent never manufactures them.

Provider keys, Supabase URLs, user credentials, and privileged keys remain environment configuration. Reports contain presence/provenance flags and opaque record identifiers, never secret values.

## Tool Behavior

All tools used by live validation must have real hosted adapters. Fixture, memory, or fabricated-success fallbacks are prohibited in live mode.

Initial read tools:

- `query_notices`: query verified notices in the authenticated guild and return bounded evidence plus source identity;
- `evaluate_radar`: query unresolved questions and compute current SLA state using an injected clock;
- `format_daily_digest`: derive a staff-only digest from hosted question data rather than hard-coded metrics.

Initial write tools:

- `create_staff_alert`: create an idempotent staff-only alert with actor and question audit metadata;
- `resolve_question`: update an authorized question using optimistic concurrency and record an audit event;
- an announcement or reply mutation may enter the live set only after its database contract, authorization, and audit semantics are real and fail closed.

Profile, score, broadcast, search, or other tools that currently fabricate data must either receive a real schema-backed implementation or be excluded from live claims. A database error cannot be converted into success.

## Multi-Step Agent Workflows

Multi-step behavior is bounded by explicit workflow policy rather than granting arbitrary tool chains. Supported complex cases include:

1. Evaluate radar, inspect returned question/tier data, then create the permitted staff alert.
2. Evaluate radar, select the requested question from the observation, then resolve it using its observed version.
3. Ask for clarification on an ambiguous first turn, consume the real user clarification on the next turn, then query notices.

The runner executes every conversation turn and feeds actual prior assistant results forward. It does not insert hand-authored assistant messages as proof of earlier execution. Ordered trace events and database state must show that later calls used earlier observations. Maximum step counts and allowed tool transitions are explicit per intent and role.

Learners cannot invoke staff-alert, resolution, digest, membership, or other privileged mutations. The denial happens before a mutation tool executes, and validation proves no database delta.

## Evaluation Dataset Design

Create separate Vietnamese JSON datasets under `validation/testsets/`:

- `us-b1-verified-logistics.json`;
- `us-b2-unanswered-radar.json`;
- `us-b3-authenticated-agent.json`;
- `us-b4-role-permissions.json`;
- `us-b5-messages-reply.json`.

Each file has at least ten cases and maps every case to its user story and acceptance criterion. Cases use natural Vietnamese variations, missing diacritics, indirect phrasing, code-switching, ambiguity, prompt injection, boundary times, cross-guild attempts, authorized writes, unauthorized writes, and concurrent changes.

US-B3 starts with a ten-case baseline and is structured for expansion to the story's documented ten scenarios per acceptance criterion. UI-only B4/B5 criteria use HTTP or browser execution kinds instead of pretending an LLM call verifies UI behavior.

A manifest references suite files and hashes rather than copying all cases into a second aggregate file. Public development cases are separated from held-out paraphrase families. Scoring emphasizes invariants, tool order, source identity, database effects, and permissions rather than matching memorized answer phrases.

Each case declares:

- execution kind and whether a live provider is mandatory;
- authenticated fixture identity;
- fixture references and injected clock;
- complete user conversation;
- exact ordered tool sequence and maximum count;
- permitted argument subsets and forbidden tools;
- expected public status, source identity, and output limits;
- expected database changes and tables that must remain unchanged;
- expected HTTP or permission result;
- safe trace event requirements and prohibited content;
- forbidden external effects such as Discord webhook calls or direct messages.

## Runner and Evidence

The canonical runner lives under `validation/scripts/` and is invoked from `codebase/package.json`. It performs these phases:

1. Validate environment and refuse missing or obviously local hosted configuration.
2. Validate testset JSON against the versioned schema.
3. Create the run namespace and seed synthetic hosted records.
4. Authenticate the specified validation identity.
5. Capture bounded preconditions from hosted Supabase.
6. Execute every conversation turn through the production agent path.
7. Capture safe trace events and bounded postconditions.
8. Score the result and classify infrastructure/provider errors separately.
9. Clean up the run namespace in `finally`.
10. Write a sanitized report and append version evidence only when run validity is known.

Required proof fields include provider/model identity, successful provider completion, ordered tool events, hosted-database provenance, selected source IDs or counts, database deltas, permission result, latency, prompt/tools/testset hashes, code commit, and cleanup status.

Reports exclude private reasoning, raw provider responses, credentials, auth tokens, cookies, unrestricted tool outputs, and private learner data.

## Validation Directory and Migration

The target layout is:

```text
validation/
  README.md
  OBSERVATION_LOG.md
  version_log.csv
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
  fixtures/
    README.md
    synthetic-validation-data.json
  scripts/
    run-agent-eval.ts
    log-version.ts
    summarize-runs.ts
  runs/
    baseline/
```

Move or replace the root `agent_tests` datasets, `codebase/scripts/run_agent_eval.ts`, duplicate `codebase/eval` evaluator assets where no longer referenced, and scattered `agent_test_runs` outputs. Preserve only sanitized baseline evidence in `validation/runs/baseline/`; future raw/local run output is ignored.

Delete `validation/user_testing_log.md` because its testimonial claims do not have machine-verifiable provenance. Archived `codebase/app/backend/artifacts/reference/starter_v0` files remain unchanged and inactive.

## Version and Observation History

`validation/version_log.csv` uses the sibling starter's append-only columns:

```text
version,author,changed_artifact,artifact_version,prompt_hash,tools_hash,reason,hypothesis,metric_name,metric_before,metric_after,run_file
```

The logger rejects duplicate run files, preserves invalid/partial classifications, and uses only the preceding valid comparable metric for before/after values.

`validation/OBSERVATION_LOG.md` records validity gates, results by story, failure clusters, root-cause evidence, hypotheses, experiments, regressions, and remaining risks. The existing reported 100% result is entered as a partial baseline: it proves some provider attempts but not consistent provider success, authenticated production-path execution, real hosted database use, writes, or RLS.

## Error Handling and Safety

- Hosted validation is opt-in and refuses to run without an explicit acknowledgement variable and a recognized validation guild allowlist.
- Destructive cleanup resolves exact run-owned identifiers before deletion and never uses broad filters, wildcards, or user-provided table names.
- Provider errors are visible and never scored as correct model behavior.
- Tool adapter errors fail closed and never produce factual or mutation-success claims.
- Cross-guild and unauthorized operations must produce zero database delta.
- Concurrent writes use expected versions or uniqueness constraints and return observable conflicts.
- A failed cleanup is prominently reported without attempting broader deletion.

## Acceptance Criteria

Implementation is accepted when:

1. Live evaluation executes the production agent path with a successful real provider response and no silent deterministic fallback.
2. Tool calls use hosted Supabase through server-side allowlisted adapters; the model has no direct database access or credentials.
3. At least one hosted read canary proves selected evidence came from the current synthetic run and not a fixture fallback.
4. Authorized write cases prove database mutation and audit state by read-back.
5. Unauthorized, cross-guild, and stale-version cases prove denial with zero unintended state change.
6. At least one bounded two-tool workflow proves ordered, observation-dependent execution.
7. Five separate Vietnamese user-story datasets contain at least ten cases each and validate against the schema.
8. Reports contain safe decision/tool/observation evidence but no private chain-of-thought, credentials, auth state, raw provider payload, or unrestricted database data.
9. All evaluation assets are canonical under `validation/`; obsolete `agent_tests` and duplicate runners/results are removed or replaced.
10. `user_testing_log.md` is removed, and append-only version and observation histories exist with the current result recorded as a partial baseline.
11. Archived starter reference artifacts remain unchanged and are not loaded by the active agent.
12. Appropriate unit, integration, database, build, and end-to-end checks pass, while hosted success is claimed only from an explicitly valid hosted run.

## Known Documentation Conflicts

The implementation plan must address or document these existing conflicts:

- the B4 and B5 user-story files contain stale internal IDs that disagree with their filenames and index;
- onboarding text allowing self-selected roles conflicts with trusted-operator provisioning and no self-promotion;
- language implying that any reply resolves a question conflicts with the canonical answered-versus-resolved rule;
- requests for a "full thinking process" are satisfied through safe decision/tool/observation traces, never private reasoning.

