# Use Case Quality and Foundation Coverage Review

**Reviewed:** 2026-09-18  
**Method:** `use-case-writer` 20-point checklist plus requirement-to-test traceability  
**Scope:** Current dataset-first Next.js/Supabase foundation

## Use Case quality validation

| Item | UC-B1-01 | UC-B2-01 | Review note |
| --- | --- | --- | --- |
| C1 Verb + object name | ✅ | ✅ | Both names use active verbs. |
| C2 User-goal level | ✅ | ❌ | B2 combines recurring detection, human triage, resolution and a later digest. |
| C3 Unique ID | ✅ | ✅ | IDs follow the project convention. |
| C4 One actor, goal, session | ✅ | ❌ | B2 has scheduler-initiated and Lab Coach-initiated goals. |
| C5 Clear system seam | ✅ | ⚠️ | B2 crosses scanner, delivery, resolution and digest seams. |
| C6 Specific actor | ✅ | ✅ | Canonical Learner and Lab Coach terms are used. |
| C7 Why, what, outcome | ✅ | ✅ | Both descriptions state the intended value. |
| C8 Quantified frequency | ✅ | ✅ | B1 gives daily volume; B2 gives scan and digest cadence. |
| C9 Verifiable preconditions | ✅ | ✅ | Preconditions describe observable access/integration states. |
| C10 Verifiable postconditions | ✅ | ✅ | Postconditions describe answer, alert and digest states. |
| C11 Conditions vs assumptions | ✅ | ✅ | The fields are separated. |
| C12 Numbered single actions | ✅ | ✅ | Both Normal Courses are numbered with explicit subjects. |
| C13 Actor/system alternation | ✅ | ⚠️ | B2 contains consecutive internal processing steps. |
| C14 No embedded branching | ✅ | ✅ | Branches are in alternatives/exceptions. |
| C15 Trigger reaches outcome | ✅ | ❌ | B2's Normal Course does not reach its 22:00 digest postcondition. |
| C16 Alternatives anchored | ✅ | ✅ | Alternatives identify their trigger step or tracked state. |
| C17 Complete exceptions | ✅ | ✅ | Exceptions state trigger, response and final state. |
| C18 Common failures | ✅ | ✅ | Missing evidence, injection, delivery/rate limits and corruption are represented. |
| C19 Valid includes | ✅ | ⚠️ | B2 says None although alert delivery and digest publication are reusable goals. |
| C20 Non-functional special requirements | ✅ | ⚠️ | B2 mixes functional classification/link rules with privacy constraints. |

UC-B1-01 is ready as a user-goal specification after aligning its 300-code-point limit, canonical role name, staff-only escalation and answered-versus-resolved semantics. UC-B2-01 is not a valid single sea-level use case yet.

Recommended B2 split, to be specified sequentially with stakeholder confirmation:

1. `UC-B2-01 Detect and Queue Overdue Questions` — primary actor: Authorized Scheduler.
2. `UC-B2-02 Review and Resolve Escalated Question` — primary actor: Lab Coach.
3. `UC-B2-03 Publish Daily Radar Digest` — primary actor: Authorized Scheduler.

## Requirement implementation coverage

| Requirement | Status | Current evidence | Remaining work |
| --- | --- | --- | --- |
| Latest verified notice per guild/topic | Implemented domain rule | `assistant/index.ts`; tied timestamp tests | Production notice retrieval adapter is not wired. |
| 0.70/0.85 confidence behavior | Implemented domain rule | `answerLogistics`; Vitest coverage | Confidence is still supplied by the caller; no Intent Router exists. |
| ≤300 Unicode code points, ≤3 sentences | Implemented | Assistant validation; `notices_answer_excerpt_length` database constraint | None for stored excerpts; live generation is not wired. |
| Authentic source link | Implemented domain rule | Discord URL checks in TypeScript and PostgreSQL | Restricted pack has no Discord snowflakes, so no live link can be produced from it. |
| Missing evidence fallback | Implemented domain rule | Assistant fallback tests | Staff-only alert creation is not connected to fallback execution. |
| Hybrid query routing | Not implemented | Use-case requirement only | Implement the Intent Router and escalation orchestration. |
| Homework refusal and prompt-injection handling | Not implemented | Use-case requirement and artifact prompt only | Add production classification/guardrail behavior and interface tests. |
| Discord receive/reply delivery | Not implemented | Explicitly outside foundation scope | Operate a separate collector/delivery integration; do not run a Gateway listener in a request handler. |
| 120/240-minute SLA tiers | Implemented | TypeScript and SQL tests at exact thresholds | Consolidate duplicated policy behind the Radar module seam. |
| Answered is not resolved | Implemented | Question states; Radar tests retain answered questions | Original-Learner resolution confirmation is not implemented because imported authors are not auth identities. |
| Authorized resolution and claim concurrency | Implemented for Lab Coaches | Versioned database functions and real concurrent PostgreSQL test | Add original-Learner confirmation when trusted live identity mapping exists. |
| Staff-only radar visibility | Implemented | RLS cross-guild/role tests; anonymous privileges revoked | Live Discord channel authorization/delivery remains unimplemented. |
| Idempotent alert and digest queueing | Implemented | Unique constraints and retry tests | Exactly-once Discord delivery needs remote-message reconciliation. |
| 22:00 local digest schedule | Partially implemented | Timezone-aware idempotent digest row creation | No scheduler activation, topic grouping, zero-backlog banner or Discord dispatch. |
| Rate-limit recovery | Not implemented | Use-case exception only | Delivery adapter must honor Discord `Retry-After` and bounded retry policy. |
| Vietnamese corruption prevention | Not implemented | Use-case exception only | Add sanitizer behavior and regression fixtures before live digest generation. |
| Restricted pack provenance | Implemented | Checksum + ordinal import, ambiguity retention, rollback and concurrency tests | The pack cannot establish roles, official authority or authentic Discord links. |

## Conclusion

The foundation does **not** solve every end-to-end flow in UC-B1-01 and UC-B2-01. It establishes the secure, deterministic data and domain core needed for those flows and now names the remaining integration work explicitly. Hosted Supabase success, live Discord behavior, and production grounding accuracy must not be claimed from these local tests.
