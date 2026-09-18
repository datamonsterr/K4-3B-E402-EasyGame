# AI SDK Authenticated Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-written provider dispatch with an authenticated AI SDK agent that uses every EasyGame tool through role- and guild-scoped interfaces and is covered by five ten-scenario acceptance suites.

**Architecture:** Route handlers validate transport input and open an authenticated context. A deep Assistant module classifies requests, selects the smallest active tool set, runs an injected AI SDK model through a bounded loop, and finalizes only verified evidence. Production Gemini and OpenRouter adapters sit behind the model seam; tests use AI SDK's mock language model while an opt-in run exercises real Gemini and local Supabase.

**Tech Stack:** Next.js 16 route handlers, strict TypeScript, AI SDK `ToolLoopAgent`, `@ai-sdk/google`, `@openrouter/ai-sdk-provider`, Zod 4, Supabase SSR/PostgreSQL, Vitest.

---

### Task 1: Acceptance contracts and traceability

**Files:**
- Create: `docs/user-stories/US-B3-authenticated-tool-using-agent.md`
- Create: `docs/usecases/UC-B3-01_run-authenticated-tool-agent.md`
- Modify: `docs/user-stories/README.md`
- Modify: `docs/usecases/README.md`

- [x] **Step 1: Define five INVEST/Gherkin acceptance seams**
- [x] **Step 2: Define the tool policy matrix and safe trace vocabulary**
- [x] **Step 3: Add catalog links and implementation coverage after tests identify exact evidence**

### Task 2: Secure authentication composition

**Files:**
- Create: `codebase/app/backend/auth/context.ts`
- Create: `codebase/app/api/auth/role/handler.ts`
- Modify: `codebase/app/api/auth/role/route.ts`
- Modify: `codebase/app/backend/assistant/logistics/composition.ts`
- Test: `codebase/tests/acceptance/authenticated-authority.acceptance.test.ts`

- [x] **Step 1: Write ten failing AC1 scenarios through handler/context interfaces**
- [x] **Step 2: Run `pnpm vitest run tests/acceptance/authenticated-authority.acceptance.test.ts` and confirm failures are caused by the missing secure interfaces**
- [x] **Step 3: Add strict `{query}` validation, session-derived actor context, exact membership selection, and a role endpoint that rejects self-provisioning**
- [x] **Step 4: Re-run the AC1 suite and the existing answer/auth suites**

### Task 3: AI SDK model and tool adapters

**Files:**
- Create: `codebase/app/backend/assistant/agent/contracts.ts`
- Create: `codebase/app/backend/assistant/agent/models.ts`
- Create: `codebase/app/backend/assistant/agent/tools.ts`
- Create: `codebase/app/backend/assistant/agent/agent.ts`
- Modify: `codebase/package.json`
- Modify: `codebase/pnpm-lock.yaml`
- Test: `codebase/tests/acceptance/grounded-react.acceptance.test.ts`

- [x] **Step 1: Add AI SDK packages with exact lockfile versions**
- [x] **Step 2: Write ten failing AC2 scenarios using `MockLanguageModelV3` and injected real tool adapters**
- [x] **Step 3: Implement typed `query_notices`, `evaluate_radar`, `create_staff_alert`, `resolve_question`, `format_daily_digest`, and `search_web` AI SDK tools**
- [x] **Step 4: Implement a bounded tool loop and convert its steps to `decision`, `tool_call`, and summarized `observation` events**
- [x] **Step 5: Apply the existing final answer gate after the observation**
- [x] **Step 6: Re-run AC2 and existing logistics tests**

### Task 4: Tool discipline and radar authorization

**Files:**
- Modify: `codebase/app/backend/assistant/agent/agent.ts`
- Modify: `codebase/app/backend/assistant/agent/tools.ts`
- Test: `codebase/tests/acceptance/tool-discipline.acceptance.test.ts`
- Test: `codebase/tests/acceptance/radar-authorization.acceptance.test.ts`

- [x] **Step 1: Write ten failing AC3 cases proving ambiguity/refusal executes zero tools**
- [x] **Step 2: Add deterministic guardrails and active-tool selection before model execution**
- [x] **Step 3: Write ten failing AC4 cases covering every radar tool and learner mutation denial**
- [x] **Step 4: Bind actor/guild inside tool closures so the model cannot provide authority**
- [x] **Step 5: Re-run AC3, AC4, existing Radar tests, and PostgreSQL RLS/concurrency tests**

### Task 5: Provider resiliency and live verification

**Files:**
- Create: `codebase/tests/acceptance/provider-resiliency.acceptance.test.ts`
- Create: `codebase/tests/integration/live-agent.integration.test.ts`
- Modify: `codebase/app/backend/assistant/agent/models.ts`
- Modify: `codebase/.env.example`
- Modify: `codebase/package.json`

- [x] **Step 1: Write ten failing AC5 scenarios for Gemini/OpenRouter selection, default models, timeouts, quota failures, and telemetry redaction**
- [x] **Step 2: Implement provider factories with server-only keys and deterministic verified-evidence fallback**
- [x] **Step 3: Add an opt-in live integration command that requires local Supabase and a real provider key**
- [x] **Step 4: Run the live test against local Supabase and Gemini and verify an actual tool call/result step**

### Task 6: Route wiring and documentation closure

**Files:**
- Modify: `codebase/app/api/demo/answer/handler.ts`
- Modify: `codebase/app/api/demo/answer/route.ts`
- Modify: `docs/usecases/IMPLEMENTATION_COVERAGE.md`
- Modify: `codebase/README.md`

- [x] **Step 1: Wire the authenticated route to the new Assistant interface without accepting provider or authority fields**
- [x] **Step 2: Document local Supabase and opt-in provider verification without recording secrets or raw payloads**
- [x] **Step 3: Record all 50 acceptance scenarios and live verification evidence in implementation coverage**
- [ ] **Step 4: Run `pnpm check`, `pnpm build`, `pnpm test:e2e`, and `pnpm test:db`**
