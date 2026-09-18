# UC-B1 Secure Answer Boundary Design

Status: approved design, awaiting implementation plan

Date: 2026-09-18

Scope: `UC-B1-01 Verify and Answer Logistics Query`

## Outcome

Replace the public, all-purpose demo answer path with an authenticated, guild-scoped answer boundary that can only produce grounded logistics responses from verified notices. The boundary must fail closed: an authentication, authorization, storage, provider, validation, or delivery problem must never become a synthetic answer, fabricated citation, successful staff alert, or privileged mutation.

This is the first security-first slice in the wider EasyGame remediation. Radar resolution, digest delivery, ingestion transitions, registry consolidation, and hosted data import remain separate PRs so each change can be reviewed and verified at its own module interface.

## Decisions

### 1. Public interface

The B1 application module exposes one interface:

```ts
type AnswerLogisticsRequest = {
  actor: Actor;
  guildId: GuildId;
  message: string;
};

type AnswerLogisticsResult =
  | {
      status: "answered";
      body: string;
      source: NoticeSourceCard;
      decisionSummary: string;
    }
  | {
      status: "clarify";
      body: string;
      source: null;
      decisionSummary: string;
    }
  | {
      status: "fallback";
      body: string;
      source: null;
      alert: "queued" | "not_queued";
      decisionSummary: string;
    }
  | {
      status: "refused";
      body: string;
      source: null;
      decisionSummary: string;
    };

interface LogisticsAssistant {
  answer(request: AnswerLogisticsRequest): Promise<AnswerLogisticsResult>;
}
```

`Actor` and `guildId` are server-derived values. HTTP callers cannot provide a role, guild membership, confidence score, provider, model, API key, tool authority, or notice authority. The implementation uses branded identifiers for actor, guild, and notice IDs so they cannot be substituted accidentally without widening the caller interface.

The interface is intentionally small. Provider selection, tool execution, evidence ranking, output validation, telemetry, and alert persistence stay inside the module implementation.

### 2. HTTP boundary

The production route performs only composition work:

1. Parse the request body with Zod and accept only the learner message.
2. Load the authenticated session through the ordinary user-scoped Supabase client.
3. Resolve the actor and active guild membership on the server.
4. Call `LogisticsAssistant.answer` with the verified actor and guild.
5. Translate the result into a stable JSON response.

Error responses use one shape:

```ts
type ErrorResponse = {
  error: {
    code:
      | "INVALID_REQUEST"
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "ASSISTANT_UNAVAILABLE";
    message: string;
  };
};
```

The route returns 400 for malformed input, 401 without a session, 403 without guild membership, and 503 when authentication or evidence storage is unavailable. A provider failure produces a safe fallback result. A fallback-alert failure produces `alert: "not_queued"`, records a safe server event, and never claims successful escalation. The route never includes raw provider responses, model reasoning, full tool payloads, stack traces, credentials, or internal database errors.

The existing `/api/demo/answer` URI temporarily remains for compatibility but adopts this authenticated contract; it no longer accepts demo authority, provider selection, or credentials. Synthetic composition exists only as an injected test adapter, never as an HTTP fallback. A later additive route migration may introduce `/api/assistant/answers` and deprecate the old URI without maintaining two behavioral versions.

### 3. Authentication and authorization

Authentication and guild authorization happen before the assistant sees the request. The auth module is the only source of `Actor`, fixed role, guild membership, and capabilities.

- Learners may request a logistics answer only for their verified active guild.
- A caller cannot select another guild through JSON, query parameters, cookies, local storage, prompt text, or model tool arguments.
- Client-selected roles are ignored and cannot reveal staff-only radar, alerts, digests, or resolution commands.
- Ordinary requests use a user-scoped Supabase client. A privileged client is not available to the assistant or model tool executor.

### 4. Evidence interface

The assistant depends on a guild-scoped read interface:

```ts
interface NoticeEvidenceSource {
  findVerifiedNotices(input: {
    guildId: GuildId;
    topic: LogisticsTopic;
  }): Promise<readonly VerifiedNotice[]>;
}
```

The production adapter applies `guild_id` and `topic_key` filters in PostgreSQL under RLS. It never fetches all guilds and filters in memory. It preserves the stored guild identity and authentic nullable Discord source fields; it does not rewrite evidence into the requested guild or invent jump links.

The synthetic adapter uses committed synthetic fixtures and is selected explicitly at composition time. Production empty results remain empty, and production errors remain errors. Neither case falls back to synthetic notices.

### 5. Model and tool containment

For UC-B1 the model receives a read-only notice lookup capability. Radar evaluation, alert creation, question claiming, question resolution, digest formatting, web search, and other mutation or unrelated tools are absent from its allowlist.

Tool arguments are untrusted provider output and must be parsed with Zod before execution. The executor supplies the authorized guild from server context rather than accepting it from tool arguments. Unknown tools, malformed arguments, and attempts to request another guild are rejected and recorded as safe tool events.

Fallback staff alerts are orchestration effects, not model-selected tools. The assistant decides that a fallback is required, then calls a capability-checked durable alert interface with the verified actor/guild context. The production adapter must either confirm durable queueing or return an error; it must not report an in-memory placeholder as persisted.

### 6. Final answer gate

Every deterministic and online-provider path passes through the same final result gate. An `answered` result is valid only when all conditions hold:

- at least one selected notice is verified and belongs to the authorized guild;
- the selected notice is the latest matching topic revision;
- tied latest notices with conflicting claims produce `clarify`, not `answered`;
- the body contains no more than three sentences and 300 Unicode code points;
- factual dates and policies are supported by the selected notice;
- the source card is authentic and separate from the answer body;
- a Discord jump link is returned only when all stored numeric identifiers are present and valid.

If provider output violates the contract, the assistant returns a safe clarify or fallback result. It does not truncate a factual answer into apparent validity and does not mark unsupported output as grounded.

### 7. Safe observability

Server-side observability may record:

- tool name and safe outcome;
- selected evidence identifiers;
- latency;
- result status;
- a brief decision summary.

It must not store or return private model reasoning, passwords, API keys, raw provider payloads, unrestricted user records, or full tool output objects. The browser receives only the public result union.

### 8. Frontend behavior

The chat view renders the server result without embellishment:

- show a source card only when `source` is non-null;
- never synthesize a Discord URL or a `100% grounded` score;
- distinguish answered, clarify, fallback, refused, and unavailable states;
- report staff escalation as queued only when the durable adapter confirmed it;
- do not use local storage, cookies, email substrings, or failed role updates as verified identity.

Staff-only navigation and the broader role-selection removal are outside this B1 PR and must be completed in the later auth/radar PR. This PR does not treat browser role state as authority and does not expose privileged behavior through the B1 route.

## Data flow

```text
browser message
  -> Zod request validation
  -> authenticated session
  -> server-derived actor and guild membership
  -> LogisticsAssistant.answer
       -> intent classification
       -> guild-scoped NoticeEvidenceSource
       -> optional provider with read-only notice tool
       -> shared final answer gate
       -> durable fallback alert when required
  -> stable public result
  -> faithful UI rendering
```

At no point can browser input or model output introduce a role, membership, guild scope, notice authority, or mutation capability.

## TDD seams and vertical slices

Tests verify behavior through three agreed public seams.

### Assistant module seam

Each slice follows red, green, then review:

1. Authenticated guild evidence produces one bounded answer and authentic source card.
2. Cross-guild evidence is unavailable even when the topic matches.
3. Missing evidence produces fallback without a fabricated source.
4. Tied conflicting latest notices produce clarification.
5. Overlong, unsupported, or unsourced provider output cannot become answered.
6. A provider-selected mutation or unknown tool is rejected.
7. Durable alert failure is observable and never reported as queued.

Tests use injected synthetic adapters and provider fakes through the module interface. They do not mock private helpers or assert internal call order.

### HTTP seam

Route tests cover:

- malformed request: 400;
- anonymous request: 401;
- authenticated non-member: 403;
- caller-supplied role, guild, provider, key, confidence, or tool authority: rejected or ignored by the schema;
- authenticated member: stable public result;
- adapter failure: 503 without internal details;
- serialized response contains no thought process, raw tool output, provider payload, prompt, or credential.

### PostgreSQL seam

Local PostgreSQL/Supabase tests cover:

- guild A cannot retrieve guild B notices through the production evidence adapter;
- identical topics and source labels in different guilds remain isolated;
- only verified notices are eligible;
- missing source identifiers never produce a fabricated jump link;
- ordinary user-scoped access obeys RLS.

Hosted Supabase is not used for automated tests. The restricted Discord CSV and derived message dumps never enter fixtures, logs, CI artifacts, commits, or PR descriptions.

## Verification

The PR must pass the repository's lockfile-authoritative checks in `codebase/`:

```text
pnpm install --frozen-lockfile
pnpm run check
pnpm run build
pnpm run test:e2e
pnpm run test:db
```

`npm ci` currently cannot run because the repository contains `pnpm-lock.yaml` and no `package-lock.json`. A separate documentation-only PR will align `AGENTS.md` and `codebase/README.md` with the package manager already enforced by CI. That policy correction is not bundled into the B1 behavior PR.

Exploratory browser verification with `agent-browser` occurs after automated E2E passes. Real authenticated-account verification requires a user-provided or already configured non-production test account and must not persist browser authentication state in Git.

## PR boundaries

This design produces one focused behavior PR for the B1 security boundary. It does not include:

- radar claim or resolution behavior;
- reply-to-answered ingestion transitions;
- digest generation or delivery;
- hosted data import;
- a general-purpose agent tool registry redesign;
- removal of the tracked restricted derivative from repository history;
- OAuth changes currently being developed in another checkout.

Those changes remain separate reviewable slices. If B1 requires a shared primitive, the primitive is added only when exercised by the B1 interface and its tests.

## Acceptance criteria

The B1 security PR is complete only when:

1. Production answer requests require an authenticated guild member.
2. Browser and model inputs cannot choose roles, guild scope, provider credentials, or mutation authority.
3. Notice lookup is exact-guild, verified-only, RLS-backed, and fail-closed.
4. The model tool allowlist is read-only and tool arguments are runtime-validated.
5. Every answer path uses the same grounding and output gate.
6. Fallback alerts are durable or explicitly reported as not queued.
7. HTTP and UI output contains no fabricated citations, scores, roles, private reasoning, or raw provider payloads.
8. Module, HTTP, PostgreSQL, build, and browser tests pass.
9. The implementation contains no restricted data, credentials, Supabase CLI state, or browser authentication state.
