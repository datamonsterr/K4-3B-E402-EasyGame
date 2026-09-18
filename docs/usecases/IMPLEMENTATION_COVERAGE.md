# Use Case Quality and Foundation Coverage Review

**Reviewed:** 2026-09-18  
**Method:** `use-case-writer` 20-point checklist plus requirement-to-test traceability  
**Scope:** EasyGame Track B (B1, B2, B3, B4) Next.js/Supabase Architecture & Vercel AI-SDK

## Use Case quality validation

| Item | UC-B1-01 | UC-B1-02 | UC-B2-01 | UC-B2-02 | UC-B3-01 | UC-B3-02 | Review note |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| C1 Verb + object name | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | All use case names use active verbs with clear grammatical objects. |
| C2 User-goal level | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | Pass coffee-break test. B2-01 remains mixed background scan. |
| C3 Unique ID | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | IDs strictly follow `UC-[Track]-[Sequence]` convention. |
| C4 One actor, goal, session | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | Valid single-actor sea-level goals achieved across interactive user cases. |
| C5 Clear system seam | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | Clear boundaries between Client UI, AI-SDK runtime, Auth API, and PostgreSQL DB. |
| C6 Specific actor | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Canonical Learner, Lab Coach, and Authenticated User roles applied. |
| C7 Why, what, outcome | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Explicit business value, system behavior, and observable postconditions. |
| C8 Quantified frequency | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Quantified based on 200-student cohort operational telemetry. |
| C9 Verifiable preconditions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Observable database states, active tokens, and tool configurations. |
| C10 Verifiable postconditions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Verifiable database changes, refusal cards, and thread state changes. |
| C11 Conditions vs assumptions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | System prerequisites clearly separated from administrative assumptions. |
| C12 Numbered single actions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Strictly sequential numbering with explicit subjects per step. |
| C13 Actor/system alternation | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | Strict actor/system toggling in all interactive use cases. |
| C14 No embedded branching | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Linear normal paths; branching cleanly moved to ACs and Exceptions. |
| C15 Trigger reaches outcome | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | Triggers flow to postconditions without hanging states. |
| C16 Alternatives anchored | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ACs explicitly identify trigger step or tracked state. |
| C17 Complete exceptions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Exceptions document trigger, system mitigation, and terminal state. |
| C18 Common failures | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Missing evidence, injection, permissions breach, concurrency, network drops covered. |
| C19 Valid includes | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | Self-contained user goals cleanly delineated. |
| C20 Non-functional special requirements | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | Latency, code points, design system fidelity, and zero secret leakage. |

---

## Requirement implementation coverage

| Requirement | Status | Current evidence | Remaining work |
|---|---|---|---|
| **Latest verified notice per guild/topic** | Implemented with RLS tenant isolation | `app/backend/assistant/logistics/supabase-evidence.ts`; `tests/logistics-assistant.test.ts`; `supabase/tests/foundation.test.sql` | Multi-guild membership selector when user belongs to multiple active guilds. |
| **Caller authority / confidence override** | Removed / Fail-closed | `app/api/demo/answer/handler.ts`; `app/backend/auth/context.ts`; `tests/acceptance/authenticated-authority.acceptance.test.ts` | None. Caller role, guild, confidence, model and keys are rejected. |
| **First Sign-In Role Onboarding** | Implemented & Locked | `docs/stitch_assets/screen6_onboarding.png` (`7488d0bd017b434aaf0d0e2ef6f567ea`); `onboarding-modal.tsx`; `tests/onboarding-role-lock.test.ts` | Complete. Onboarding modal prompts unprovisioned users on first sign-in. |
| **Immutable Role Lock** | Implemented | `app/api/auth/role/route.ts`; `tests/onboarding-role-lock.test.ts`; `settings-modal.tsx` | Enforces 403 when updating pre-existing role in database. |
| **≤300 Unicode code points, ≤3 sentences** | Implemented | `app/backend/assistant/logistics/finalize.ts`; `tests/logistics-assistant.test.ts`; `notices_answer_excerpt_length` database constraint | Deterministic gate enforced on agent output. |
| **Authentic source link** | Implemented with format validation | `app/backend/assistant/logistics/finalize.ts`; `app/frontend/workspace/public-answer.ts`; `tests/public-answer.test.ts`; `tests/e2e/foundation.spec.ts` | Live Discord message collector/sync to populate authentic Discord snowflakes. |
| **Missing evidence fallback & alerts** | Implemented (`alert: not_queued`) | `app/backend/assistant/logistics/finalize.ts`; `tests/logistics-assistant.test.ts`; `tests/answer-route.test.ts` | Durable background alert queue for unanswered chat questions. |
| **Tool execution boundary** | Implemented (intent/role allowlist) | `app/backend/assistant/agent/agent.ts`; `tests/acceptance/grounded-react.acceptance.test.ts`; `tests/acceptance/radar-authorization.acceptance.test.ts` | Every request activates only authorized AI SDK tools; staff mutations are denied for Learners. |
| **Role-Gated Tool Config** | Defined in YAML | `app/backend/artifacts/tools.yaml` (`roles` array per tool); `UC-B1-02` | Dynamic tool filtering in AI-SDK executor. |
| **Messages View (No Raw JSON)** | Implemented | `messages-view.tsx`; `workspace-shell.tsx`; `US-B4`; `UC-B2-02` | Compact multi-message triage UI with thread context. |
| **In-App Direct DB Reply** | Implemented | `app/api/workspace/reply/route.ts`; `tests/messages-reply.test.ts`; `US-B4` | Writes reply directly to `source_messages` table without Discord bot spam. |
| **Ticket-to-Messages Jump Flow** | Implemented | `radar-view.tsx` onSelectMessage; `workspace-shell.tsx`; `UC-B2-02` | Clicking "Xem tin nhắn" switches directly to internal Messages tab. |
| **120/240-minute SLA tiers** | Implemented | `evaluate_radar`; TypeScript and SQL tests at exact thresholds | Consolidate duplicated policy behind Radar module seam. |
| **Answered is not resolved** | Implemented | Question states; Radar tests retain answered questions | Original-Learner resolution confirmation flow. |
| **Authorized resolution and claim concurrency** | Implemented for Lab Coaches | Versioned database functions and real concurrent PostgreSQL test | Complete for staff actions. |
| **Staff-only radar visibility** | Implemented | RLS cross-guild/role tests; anonymous privileges revoked | Verified by PostgreSQL RLS policies. |

---

## Traceability to Verification Suite

1. **Authenticated single-membership answer context:**
   - Evidence: [`app/backend/assistant/logistics/composition.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/backend/assistant/logistics/composition.ts), [`tests/answer-route.test.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/tests/answer-route.test.ts).
2. **Strict request schema rejecting caller authority/provider fields:**
   - Evidence: [`app/api/demo/answer/handler.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/api/demo/answer/handler.ts), [`tests/answer-route.test.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/tests/answer-route.test.ts).
3. **Exact-guild notice retrieval and RLS isolation:**
   - Evidence: [`app/backend/assistant/logistics/supabase-evidence.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/backend/assistant/logistics/supabase-evidence.ts), [`tests/logistics-assistant.test.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/tests/logistics-assistant.test.ts), [`supabase/tests/foundation.test.sql`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/supabase/tests/foundation.test.sql).
4. **Onboarding role lock and immutability:**
   - Evidence: [`app/api/auth/role/route.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/api/auth/role/route.ts), [`tests/onboarding-role-lock.test.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/tests/onboarding-role-lock.test.ts).
5. **In-app direct DB reply and thread triage:**
   - Evidence: [`app/api/workspace/reply/route.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/api/workspace/reply/route.ts), [`tests/messages-reply.test.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/tests/messages-reply.test.ts).
6. **AI SDK production composition with deterministic safety gates:**
   - Evidence: [`app/backend/assistant/agent/agent.ts`](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/codebase/app/backend/assistant/agent/agent.ts), five B3 acceptance suites.

---

## UC-B3 Authenticated Tool Agent Verification Summary

| Acceptance criterion | Automated evidence | Scenarios |
| --- | --- | ---: |
| AC1 server-derived authority | `tests/acceptance/authenticated-authority.acceptance.test.ts` | 12 |
| AC2 grounded ReAct flow | `tests/acceptance/grounded-react.acceptance.test.ts` | 11 |
| AC3 unnecessary-tool prevention | `tests/acceptance/tool-discipline.acceptance.test.ts` | 10 |
| AC4 radar authorization | `tests/acceptance/radar-authorization.acceptance.test.ts` | 10 |
| AC5 Gemini/OpenRouter resilience | `tests/acceptance/provider-resiliency.acceptance.test.ts` | 10 |
