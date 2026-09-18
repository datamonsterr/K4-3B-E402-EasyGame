# User Story US-B3: Authenticated Tool-Using Course Agent

> **Story ID:** `US-B3`  
> **Module:** Track B shared Assistant and Radar orchestration  
> **Method:** `user-story-ac-writer` (BA Zone / Digital School), Mode A  
> **Reviewed:** 2026-09-18

## User Story

**As a** Learner or Lab Coach with a verified EasyGame guild membership  
**I want to** ask the course agent for logistics or radar assistance through my authenticated workspace  
**So that** I receive evidence-grounded help while every database read and mutation remains tenant-scoped, role-authorized, observable, and free of unnecessary tool calls.

## INVEST self-check

| Criterion | Result | Evidence |
| --- | :---: | --- |
| Independent | ✅ | The story uses the existing Auth, Assistant, Radar, and database interfaces without requiring Discord Gateway delivery. |
| Negotiable | ✅ | Provider and model adapters may change while the observable domain outcomes remain stable. |
| Valuable | ✅ | Learners get verified answers and Lab Coaches get safe radar operations without self-promotion or cross-guild access. |
| Estimable | ✅ | Five explicit acceptance seams and their test sets define the implementation scope. |
| Small | ✅ | Scope is one authenticated request/response agent flow; live Discord collection and hosted deployment remain separate. |
| Testable | ✅ | Every AC maps to ten automated scenarios plus an opt-in real-provider and real-local-database verification. |

## Acceptance Criteria

### AC1: Derive authority from the authenticated membership

- **Given** a request reaches the agent route with a Supabase session and stored guild membership
- **When** the request contains a bounded user message
- **Then** the system derives actor ID, guild ID, and role from the server-side session and membership
- **And** rejects caller-supplied role, guild, provider key, model, confidence, or notice authority
- **And** prevents learners from creating or promoting memberships.

### AC2: Execute the grounded logistics ReAct flow

- **Given** a Learner has access to a guild containing verified notices
- **When** the Learner asks an unambiguous logistics question
- **Then** the agent emits a safe decision event, calls `query_notices`, observes its result, and returns the latest matching verified notice
- **And** calls no unrelated tool
- **And** returns no more than 300 Unicode code points and three sentences with a separate authentic source card.

### AC3: Avoid tools when clarification or refusal is sufficient

- **Given** a request is ambiguous, non-logistics, an academic-integrity request, or a prompt-injection attempt
- **When** the agent classifies the request before provider execution
- **Then** it returns `clarify` or `refused` without invoking database, web, radar, alert, digest, or mutation tools
- **And** does not disclose system instructions, credentials, raw provider payloads, or private model reasoning.

### AC4: Restrict radar and mutation tools to authorized workflows

- **Given** a Lab Coach or Learner requests radar work in one guild
- **When** the agent selects a radar capability
- **Then** read-only radar evaluation is guild-scoped
- **And** staff alerts, resolution, and digest operations require a Lab Coach
- **And** a reply marks a question answered rather than resolved
- **And** no operation sends an unsolicited direct message.

### AC5: Preserve behavior across Gemini and OpenRouter adapters

- **Given** server-side provider configuration selects Gemini or OpenRouter
- **When** the agent runs or a provider fails, times out, or exhausts quota
- **Then** the provider adapter uses AI SDK with the configured model (`gemini-3.5-flash-lite` by default for Gemini)
- **And** records only model identity, latency, safe decision summaries, tool calls, and summarized observations
- **And** fails closed or uses deterministic verified evidence without fabricating an answer.

## Acceptance test inventory

| Test set | AC | Minimum scenarios | Required coverage |
| --- | --- | ---: | --- |
| `authenticated-authority.acceptance.test.ts` | AC1 | 10 | session, membership, strict payload, tenant and promotion denial |
| `grounded-react.acceptance.test.ts` | AC2 | 10 | decision → tool call → observation, timestamp resolution, output gate |
| `tool-discipline.acceptance.test.ts` | AC3 | 10 | ambiguity, refusal, injection and zero tool calls |
| `radar-authorization.acceptance.test.ts` | AC4 | 10 | all radar tools, coach authorization, answered/resolved semantics |
| `provider-resiliency.acceptance.test.ts` | AC5 | 10 | Gemini/OpenRouter selection, model defaults, failure and safe telemetry |

## Notes

- The real-provider test is opt-in because CI has no cloud keys. It must be run locally with a real Gemini key and the local Supabase stack.
- “Thinking” means a brief observable decision summary. Raw model reasoning and chain-of-thought are neither returned nor persisted.
- Provider availability is runtime configuration. The requested Gemini model ID is tested as configuration; a live provider rejection must be reported accurately rather than hidden.

