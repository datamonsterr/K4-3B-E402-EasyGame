# Agent validation observation log

This append-only log tracks what the evidence establishes, what it does not establish, and which experiment should run next. Machine-readable run evidence is linked from `version_log.csv`.

Safe decision summaries, selected evidence identifiers, ordered tool events, permission outcomes, and bounded database deltas may be observed. Private chain-of-thought is prohibited and must never be requested, stored, or inferred from traces.

## Validity gates

A result is comparable only when all applicable gates are true:

| Gate                       | Required proof                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Production API path        | The case entered through the deployed application HTTP route.                          |
| Provider completion        | A real provider completed the request; an error or substitute response fails the gate. |
| Authenticated identity     | The server resolved the dedicated test identity and stored guild membership.           |
| Hosted database provenance | Selected evidence belongs to the run-owned synthetic hosted dataset.                   |
| Write read-back            | An authorized mutation is visible in a bounded postcondition snapshot.                 |
| Permission and RLS         | Unauthorized and cross-guild attempts are denied with zero unintended delta.           |
| No fallback                | No fixture, in-memory, deterministic, or fabricated result replaced a live failure.    |
| Safe trace                 | Only allowlisted events and brief decision summaries were retained.                    |
| Cleanup                    | Exact run-owned rows were verified and removed without a broad delete.                 |

Statuses have these meanings:

- `valid`: all applicable gates passed; its metric can be a headline and comparable predecessor.
- `partial`: useful evidence exists, but at least one required gate was not established.
- `invalid`: a required gate failed or unsafe evidence invalidated the run.
- `incomplete`: execution did not reach a scoreable terminal state.

## 2026-09-18 — legacy baseline

Classification: **partial and non-comparable**.

Evidence: [`runs/baseline/legacy-2026-09-18-partial.json`](runs/baseline/legacy-2026-09-18-partial.json).

The historical evaluator reported 24/24 on its offline master suite and 8/8 on a Gemini-attempt logistics suite. These aggregates show that the legacy harness exercised its own assertions, but they do not demonstrate a production-path, authenticated, hosted-Supabase agent. The retained record contains only counts and artifact hashes.

### Results by story

| Story                     | Historical aggregate                     | Baseline conclusion                                                                                                  |
| ------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| US-B1 verified logistics  | 8/8 logistics cases reported             | Partial; real notice provenance and production routing were not proved.                                              |
| US-B2 unanswered radar    | Included in the 24-case master aggregate | Partial; hosted SLA reads, alert writes, and idempotency were not proved independently.                              |
| US-B3 authenticated agent | Included in the 24-case master aggregate | Partial; provider completion, authenticated context, and observation-dependent multi-step execution were not proved. |
| US-B4 role permissions    | No isolated acceptance evidence          | Unmeasured; RLS and cross-guild denial remain open.                                                                  |
| US-B5 messages and reply  | No isolated acceptance evidence          | Unmeasured; authorized reply writes and answered-versus-resolved state remain open.                                  |

### Observed failure clusters

| Cluster                | Observation                                                                                    | Evidence                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Execution provenance   | The legacy result cannot prove that requests traversed the production HTTP route.              | Baseline validity reasons and false gates.        |
| Data provenance        | Tool success cannot be tied consistently to run-owned hosted Supabase rows.                    | `consistent_hosted_database_provenance=false`.    |
| Fallback ambiguity     | Provider or database failure could be replaced by deterministic, fixture, or memory behavior.  | `no_fallback=false`.                              |
| Authorization coverage | No retained before/after evidence proves role, cross-guild, or RLS denial.                     | `row_level_security=false`; no write read-back.   |
| Mutation lifecycle     | Authorized writes, concurrency conflicts, idempotency, and exact cleanup were not established. | `write_readback=false`; `cleanup_verified=false`. |

### Hypotheses and next experiments

1. If every validation conversation enters through the production API using a dedicated authenticated identity, actor and guild spoofing will be observable and rejectable at the server boundary.
2. If synthetic records carry a unique run namespace and tools return bounded source identifiers, read provenance can be verified without exposing row contents.
3. If write cases compare bounded preconditions and postconditions, authorized mutation, unauthorized zero-delta behavior, idempotency, and stale-version conflict can be scored independently of prose.
4. If provider, database, or tool errors fail closed, the new runner will expose infrastructure failure instead of inflating agent accuracy.

### Regression ledger

| Date       | Run                     | Comparable predecessor | Regression status                               |
| ---------- | ----------------------- | ---------------------- | ----------------------------------------------- |
| 2026-09-18 | Legacy partial baseline | None                   | Not assessable; no valid comparable run exists. |

### Remaining risks

- Hosted test identities or memberships may be missing or ambiguous.
- Synthetic data cleanup may fail and require exact-ID operator review; broader cleanup is forbidden.
- Provider nondeterminism requires invariant scoring rather than exact prose matching.
- A successful local test or build does not establish hosted success.
- Traces must be checked continuously for credentials, private data, raw provider content, and unrestricted database output.

## 2026-09-19 — guarded harness implementation checkpoint

Classification: **incomplete and non-comparable**.

No hosted run artifact was created. The required acknowledgement, dedicated hosted identities, Supabase keys, validation-guild allowlist, deployed application origin, and provider configuration are not available in this checkout. `pnpm eval:hosted` stopped at the acknowledgement guard before network or database access, as designed.

### Improvements established locally

| Area          | Evidence-backed observation                                                                                                                                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dataset       | Five Vietnamese suites validate with 10 unique cases each, explicit acceptance-criterion mappings, immutable manifest hashes, and per-case synthetic fixture references.                                                                                                                             |
| Runtime       | Unit and acceptance tests exercise the production agent interface, artifact-driven tool permissions, bounded multi-step tool loops, history, and fail-closed provider errors without deterministic substitution. Provider behavior is mocked only in local tests; this is not hosted-provider proof. |
| Tool boundary | Server-owned actor, guild, role, and clock values are not accepted from model arguments; active database reads and writes use authenticated Supabase operations.                                                                                                                                     |
| Database      | PostgreSQL tests pass same-guild reads, learner and anonymous write denial, cross-guild denial, server-time SLA enforcement, authorized alert writes, service-role-only run recording, concurrent resolution, and clean synthetic seed application.                                                  |
| Observability | Persisted events are bounded to tool calls, selected notice identifiers, outcomes, latency, and brief summaries; secret and private-reasoning canaries are rejected. Provider failures receive a safe error run identifier when recording succeeds.                                                  |
| Application   | A production webpack build, 205 unit/acceptance tests, 35 validation-harness tests, 5 browser E2E cases, and an accessibility-tree browser inspection pass locally. The default Turbopack build is blocked in this managed environment because its CSS worker cannot bind an internal local port.    |

### Remaining hosted experiments

1. Provision exactly one membership for each dedicated validation identity in each allowlisted validation guild.
2. Run all production-API and tool-contract cases against the hosted deployment with a real provider completion and run-owned hosted rows.
3. Confirm authorized write read-back, unauthorized zero-delta behavior, provider-failure reporting, exact cleanup, and sanitized trace gates in the generated report.
4. Keep HTTP and browser execution kinds non-headline until the runner executes and scores them rather than marking them skipped.

### Regression ledger

| Date       | Run                             | Comparable predecessor | Regression status                                        |
| ---------- | ------------------------------- | ---------------------- | -------------------------------------------------------- |
| 2026-09-19 | Local implementation checkpoint | None                   | Not assessable; hosted validity gates were not executed. |

## Append template

Copy this section for a new observation; do not rewrite earlier entries.

```markdown
## YYYY-MM-DD — short run name

Classification: valid | partial | invalid | incomplete.

Evidence: [`runs/<run-file>.json`](runs/<run-file>.json).

### Results by story

| Story | Result | Evidence-backed conclusion |
| ----- | ------ | -------------------------- |

### Failure clusters and root causes

| Cluster | Root-cause evidence | Next experiment |
| ------- | ------------------- | --------------- |

### Regressions and remaining risks

- Comparable predecessor:
- Regressions:
- Remaining risks:
```
