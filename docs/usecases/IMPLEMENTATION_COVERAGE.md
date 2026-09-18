# Use Case Quality and Foundation Coverage Review

**Reviewed:** 2026-09-18  
**Method:** `use-case-writer` 20-point checklist plus requirement-to-test traceability  
**Scope:** Current dataset-first Next.js/Supabase foundation

## Use Case quality validation

| Item                                    | UC-B1-01 | UC-B2-01 | Review note                                                                       |
| --------------------------------------- | -------- | -------- | --------------------------------------------------------------------------------- |
| C1 Verb + object name                   | ✅       | ✅       | Both names use active verbs.                                                      |
| C2 User-goal level                      | ✅       | ❌       | B2 combines recurring detection, human triage, resolution and a later digest.     |
| C3 Unique ID                            | ✅       | ✅       | IDs follow the project convention.                                                |
| C4 One actor, goal, session             | ✅       | ❌       | B2 has scheduler-initiated and Lab Coach-initiated goals.                         |
| C5 Clear system seam                    | ✅       | ⚠️       | B2 crosses scanner, delivery, resolution and digest seams.                        |
| C6 Specific actor                       | ✅       | ✅       | Canonical Learner and Lab Coach terms are used.                                   |
| C7 Why, what, outcome                   | ✅       | ✅       | Both descriptions state the intended value.                                       |
| C8 Quantified frequency                 | ✅       | ✅       | B1 gives daily volume; B2 gives scan and digest cadence.                          |
| C9 Verifiable preconditions             | ✅       | ✅       | Preconditions describe observable access/integration states.                      |
| C10 Verifiable postconditions           | ✅       | ✅       | Postconditions describe answer, alert and digest states.                          |
| C11 Conditions vs assumptions           | ✅       | ✅       | The fields are separated.                                                         |
| C12 Numbered single actions             | ✅       | ✅       | Both Normal Courses are numbered with explicit subjects.                          |
| C13 Actor/system alternation            | ✅       | ⚠️       | B2 contains consecutive internal processing steps.                                |
| C14 No embedded branching               | ✅       | ✅       | Branches are in alternatives/exceptions.                                          |
| C15 Trigger reaches outcome             | ✅       | ❌       | B2's Normal Course does not reach its 22:00 digest postcondition.                 |
| C16 Alternatives anchored               | ✅       | ✅       | Alternatives identify their trigger step or tracked state.                        |
| C17 Complete exceptions                 | ✅       | ✅       | Exceptions state trigger, response and final state.                               |
| C18 Common failures                     | ✅       | ✅       | Missing evidence, injection, delivery/rate limits and corruption are represented. |
| C19 Valid includes                      | ✅       | ⚠️       | B2 says None although alert delivery and digest publication are reusable goals.   |
| C20 Non-functional special requirements | ✅       | ⚠️       | B2 mixes functional classification/link rules with privacy constraints.           |

UC-B1-01 is ready as a user-goal specification after aligning its 300-code-point limit, canonical role name, staff-only escalation and answered-versus-resolved semantics. UC-B2-01 is not a valid single sea-level use case yet.

Recommended B2 split, to be specified sequentially with stakeholder confirmation:

1. `UC-B2-01 Detect and Queue Overdue Questions` — primary actor: Authorized Scheduler.
2. `UC-B2-02 Review and Resolve Escalated Question` — primary actor: Lab Coach.
3. `UC-B2-03 Publish Daily Radar Digest` — primary actor: Authorized Scheduler.

## Requirement implementation coverage

| Requirement                                    | Status                                | Current evidence                                                                                                                                        | Remaining work                                                                                                                             |
| ---------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Latest verified notice per guild/topic         | Implemented with RLS tenant isolation | `app/backend/assistant/logistics/supabase-evidence.ts`; `tests/logistics-assistant.test.ts`; `supabase/tests/foundation.test.sql`                       | Multi-guild membership selector when user belongs to multiple active guilds.                                                               |
| Caller authority / confidence override         | Removed / Fail-closed                 | `app/api/demo/answer/handler.ts`; `app/backend/auth/context.ts`; `tests/acceptance/authenticated-authority.acceptance.test.ts`                          | None. Caller role, guild, confidence, model and keys are rejected; membership is operator-provisioned.                                    |
| ≤300 Unicode code points, ≤3 sentences         | Implemented                           | `app/backend/assistant/logistics/finalize.ts`; `tests/logistics-assistant.test.ts`; `notices_answer_excerpt_length` database constraint                 | Live LLM draft provider adapter remains disabled in production route until separately reviewed; tested with deterministic fakes.           |
| Authentic source link                          | Implemented with format validation    | `app/backend/assistant/logistics/finalize.ts`; `app/frontend/workspace/public-answer.ts`; `tests/public-answer.test.ts`; `tests/e2e/foundation.spec.ts` | Live Discord message collector/sync to populate authentic Discord snowflakes in production notices. Fabricated links rejected fail-closed. |
| Missing evidence fallback & alerts             | Implemented (`alert: not_queued`)     | `app/backend/assistant/logistics/finalize.ts`; `tests/logistics-assistant.test.ts`; `tests/answer-route.test.ts`                                        | Durable background alert queue and staff triage dispatch for unanswered chat questions.                                                    |
| Tool execution boundary                        | Implemented (intent/role allowlist)   | `app/backend/assistant/agent/agent.ts`; `tests/acceptance/grounded-react.acceptance.test.ts`; `tests/acceptance/radar-authorization.acceptance.test.ts` | Every request activates only its classified AI SDK tool; staff mutations are denied before provider execution for Learners.                |
| UI transparency & telemetry sanitation         | Implemented                           | `app/frontend/workspace/chat-view.tsx`; `app/frontend/workspace/public-answer.ts`; `tests/public-answer.test.ts`; `tests/e2e/foundation.spec.ts`        | None for public answer view. Private model reasoning and raw provider telemetry removed from learner-facing UI.                            |
| Hybrid query routing                           | Implemented for B3 intents            | `app/backend/assistant/agent/agent.ts`; five B3 acceptance suites                                                                                       | Natural-language coverage is deliberately narrow; expand classifiers only with new acceptance examples.                                  |
| Homework refusal and prompt-injection handling | Implemented before provider execution | `app/backend/assistant/agent/agent.ts`; `tests/acceptance/tool-discipline.acceptance.test.ts`                                                            | Add new adversarial fixtures as attack patterns are observed.                                                                               |
| Discord receive/reply delivery                 | Not implemented                       | Explicitly outside foundation scope                                                                                                                     | Operate a separate collector/delivery integration; do not run a Gateway listener in a request handler.                                     |
| 120/240-minute SLA tiers                       | Implemented                           | TypeScript and SQL tests at exact thresholds                                                                                                            | Consolidate duplicated policy behind the Radar module seam.                                                                                |
| Answered is not resolved                       | Implemented                           | Question states; Radar tests retain answered questions                                                                                                  | Original-Learner resolution confirmation is not implemented because imported authors are not auth identities.                              |
| Authorized resolution and claim concurrency    | Implemented for Lab Coaches           | Versioned database functions and real concurrent PostgreSQL test                                                                                        | Add original-Learner confirmation when trusted live identity mapping exists.                                                               |
| Staff-only radar visibility                    | Implemented                           | RLS cross-guild/role tests; anonymous privileges revoked                                                                                                | Live Discord channel authorization/delivery remains unimplemented.                                                                         |
| Idempotent alert and digest queueing           | Implemented                           | Unique constraints and retry tests                                                                                                                      | Exactly-once Discord delivery needs remote-message reconciliation.                                                                         |
| 22:00 local digest schedule                    | Partially implemented                 | Timezone-aware idempotent digest row creation                                                                                                           | No scheduler activation, topic grouping, zero-backlog banner or Discord dispatch.                                                          |
| Rate-limit recovery                            | Not implemented                       | Use-case exception only                                                                                                                                 | Delivery adapter must honor Discord `Retry-After` and bounded retry policy.                                                                |
| Vietnamese corruption prevention               | Not implemented                       | Use-case exception only                                                                                                                                 | Add sanitizer behavior and regression fixtures before live digest generation.                                                              |
| Restricted pack provenance                     | Implemented                           | Checksum + ordinal import, ambiguity retention, rollback and concurrency tests                                                                          | The pack cannot establish roles, official authority or authentic Discord links.                                                            |

## UC-B1 Secure Answer Boundary Verification Summary

The B1 security boundary refactor establishes server-authoritative answer handling, tenant-isolated notice retrieval, and transparent UI rendering:

1. **Authenticated single-membership answer context:**
   - Evidence: [`app/backend/assistant/logistics/composition.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/backend/assistant/logistics/composition.ts), [`tests/answer-route.test.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/tests/answer-route.test.ts).
   - Behavior: Route derives actor ID, guild ID, and learner role strictly from Supabase session cookies. Unauthenticated requests return 401; users with zero or multiple memberships return 403.
2. **Strict request schema rejecting caller authority/provider fields:**
   - Evidence: [`app/api/demo/answer/handler.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/api/demo/answer/handler.ts), [`tests/answer-route.test.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/tests/answer-route.test.ts).
   - Behavior: Request body is validated with strict zod schema accepting only `{ query: string }`. Any extra fields (`role`, `guildId`, `confidence`, `provider`, `apiKey`, `model`) cause a 400 rejection.
3. **Exact-guild notice retrieval and RLS isolation:**
   - Evidence: [`app/backend/assistant/logistics/supabase-evidence.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/backend/assistant/logistics/supabase-evidence.ts), [`tests/logistics-assistant.test.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/tests/logistics-assistant.test.ts), [`supabase/tests/foundation.test.sql`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/supabase/tests/foundation.test.sql).
   - Behavior: Queries filter strictly by authenticated `guildId` using user-scoped client. Multi-guild PostgreSQL RLS test proves cross-guild notice leakage is blocked at the database engine level.
4. **Read-only tool allowlist:**
   - Evidence: [`app/backend/assistant/logistics/tools.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/backend/assistant/logistics/tools.ts), [`tests/logistics-assistant.test.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/tests/logistics-assistant.test.ts).
   - Behavior: Only `get_verified_notice` is permitted. Unknown or mutating tools throw `Unknown logistics tool`.
5. **Shared 300-code-point / 3-sentence / authentic-source gate:**
   - Evidence: [`app/backend/assistant/logistics/finalize.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/backend/assistant/logistics/finalize.ts), [`tests/logistics-assistant.test.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/tests/logistics-assistant.test.ts).
   - Behavior: Output gate validates Unicode code points (`Array.from(body).length <= 300`), sentence count (`<= 3`), guild match, and authentic source URL format. Gate fails closed to fallback if any rule is violated.
6. **Faithful UI rendering without fabricated badges or sources:**
   - Evidence: [`app/frontend/workspace/chat-view.tsx`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/frontend/workspace/chat-view.tsx), [`app/frontend/workspace/public-answer.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/frontend/workspace/public-answer.ts), [`tests/public-answer.test.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/tests/public-answer.test.ts), [`tests/e2e/foundation.spec.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/tests/e2e/foundation.spec.ts).
   - Behavior: Removed fake latency, hardcoded "100% Grounded" badge, invented Discord snowflake URLs, and private model reasoning. Displays verified source link when grounded and brief decision summary in the inspector.
7. **Explicit fallback alert state:**
   - Evidence: [`app/backend/assistant/logistics/finalize.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/backend/assistant/logistics/finalize.ts), [`tests/logistics-assistant.test.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/tests/logistics-assistant.test.ts).
   - Behavior: Fallback results return `alert: "not_queued"` until a durable background alert schema is provisioned.
8. **AI SDK production composition with deterministic safety gates:**
   - The production route selects Gemini or OpenRouter from server-only environment configuration and runs a bounded `ToolLoopAgent`. Intent classification, authority binding, evidence selection, source validation and output limits remain deterministic. Without a provider key, the existing verified-evidence assistant remains the fail-closed deployment path.

## UC-B3 Authenticated Tool Agent Verification Summary

The PR #8 Python prototype was treated as a source of behavioral ideas, not as a second deployable service. Its useful provider/tool concepts now live behind the existing Next.js Assistant, Auth and Radar interfaces:

| Acceptance criterion | Automated evidence | Scenarios |
| --- | --- | ---: |
| AC1 server-derived authority | `tests/acceptance/authenticated-authority.acceptance.test.ts` | 12 |
| AC2 grounded ReAct flow | `tests/acceptance/grounded-react.acceptance.test.ts` | 11 |
| AC3 unnecessary-tool prevention | `tests/acceptance/tool-discipline.acceptance.test.ts` | 10 |
| AC4 radar authorization | `tests/acceptance/radar-authorization.acceptance.test.ts` | 10 |
| AC5 Gemini/OpenRouter resilience | `tests/acceptance/provider-resiliency.acceptance.test.ts` | 10 |

The 53 scenarios exercise AI SDK mock models through the real agent/tool loop rather than testing private helper details. `tests/integration/live-agent.integration.test.ts` additionally passed on 2026-09-18 against local Supabase RLS and a real Gemini `gemini-3.5-flash-lite` provider call, producing `decision → tool_call(query_notices) → observation` and the latest seeded Lab 1 notice. This opt-in result is local evidence only; it does not claim hosted deployment success.

Provider keys and model IDs are server-managed. `/api/health/llm` requires an authenticated session, rejects client-supplied configuration, probes through AI SDK, and never returns raw provider errors. OAuth and credential sign-in no longer accept a requested role; an existing single membership is required.

### Remaining Work and Open Items

- **Discord Delivery & Idempotency:** Inbound Discord gateway listeners and outbound reply dispatch are outside the Next.js request lifecycle and require a dedicated worker service.
- **Durable Chat Fallback Alerts:** Escalating unanswered chat questions into `#ta-radar` requires a durable job queue rather than in-memory or synchronous dispatch.
- **Multi-Membership Active Guild Selection:** Currently, users with multiple memberships receive a 403. A future iteration will add an active-guild session selector or request header.
- **Hosted Account E2E:** Local tests use synthetic PostgreSQL fixtures and Playwright mocks. Hosted Supabase migrations and production deployment verification require hosted cloud environment runs.

## Conclusion

The foundation does **not** solve every end-to-end flow in UC-B1-01 and UC-B2-01. It establishes the secure, deterministic data and domain core needed for those flows and now names the remaining integration work explicitly. Hosted Supabase success, live Discord behavior, and production grounding accuracy must not be claimed from these local tests.
