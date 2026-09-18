# UC-B3-01 — Run Authenticated Tool-Using Course Agent

## Scope

The Learner or Lab Coach submits one message from an authenticated guild workspace. The system derives authority from Supabase, classifies the request, makes only the required allowlisted tool calls, and returns a bounded public result plus safe observability events.

## Preconditions

1. Supabase Auth has verified the session.
2. A trusted operator provisioned exactly one active membership for the selected workspace.
3. Every exposed table has RLS and guild-scoped policies.
4. Provider credentials, when enabled, exist only in server-side environment configuration.

## Normal flow

1. The actor submits `{ "query": "..." }`.
2. Auth derives actor ID, guild ID, and role from the session and membership.
3. The Assistant classifies intent before model execution.
4. The Assistant limits the AI SDK agent to the tools allowed for that intent and role.
5. The agent records a safe `decision` event.
6. AI SDK emits a validated tool call.
7. The tool executes through a guild-scoped database adapter and returns an observation.
8. The Assistant applies evidence, source, length, and sentence gates.
9. The route returns only the public result. The agent exposes the safe trace to server-side observability adapters, while private reasoning and raw provider payloads remain excluded.

## Tool policy matrix

| Intent | Actor | Required tool | Allowed follow-up tools | Tools that must not run |
| --- | --- | --- | --- | --- |
| Logistics topic | Learner / Lab Coach | `query_notices` | None | radar, alert, resolution, digest, web search |
| Ambiguous logistics | Learner / Lab Coach | None | None | every tool |
| Prompt injection / code solution | Learner / Lab Coach | None | None | every tool |
| Radar status | Learner | `evaluate_radar` | None | staff alert, resolution, digest |
| Radar status | Lab Coach | `evaluate_radar` | None | alert, resolution and digest |
| Resolve question | Lab Coach | `resolve_question` | None | web search, notice query, digest |
| Resolve question | Learner | None | None | every mutation tool |
| Daily digest | Lab Coach | `format_daily_digest` | None | notice query, web search, radar and resolution |
| Official external resource search | Learner / Lab Coach | `search_web` | None | database mutation tools |

## Exceptions

- Missing/invalid session: `401 UNAUTHENTICATED`, no tools.
- Missing membership or cross-guild attempt: `403 FORBIDDEN`, no tools.
- Provider unavailable before a tool result: fail closed without a factual claim.
- Provider unavailable after verified notice observation: deterministic finalization may use exactly that verified observation.
- Tied latest notices with conflicting content: clarification, no fabricated tie-break.
- Invalid Discord source path: fallback without a source card.

## Verification

The five test sets in `US-B3` each contain at least ten scenarios. A separate opt-in integration run must prove a real local Supabase query and a real AI SDK provider loop with `decision → tool_call → observation` events.
