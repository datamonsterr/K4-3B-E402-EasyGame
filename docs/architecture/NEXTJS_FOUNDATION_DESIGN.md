# Next.js foundation design

Status: proposed for review, 2026-09-18. This document describes the intended initialization; it does not claim the application, database, or deployment already exists.

## Scope and layout

Use one Next.js App Router application, written in strict TypeScript and deployed as one Vercel project. Frontend and backend are separate modules in the same deployment. Supabase provides PostgreSQL and authentication. Separate frontend/backend deployments would add configuration and network interfaces without a present need; keeping the Python starter as the active backend would conflict with the requested stack.

```text
K4-3B-E402-EasyGame/
  index.html                         # canonical existing static mock: HTML, CSS, JS together
  AGENTS.md                          # canonical development instructions
  .agents/rules/easygame.md           # Antigravity entry point referencing AGENTS.md
  .github/workflows/ci.yml
  .github/workflows/deploy.yml
  .github/workflows/database.yml
  docs/architecture/                  # architecture, schema, setup and verification
  docs/adr/                          # accepted decisions and explicit proposals
  data/discord-pack/                  # existing restricted local input; CSV stays ignored
  codebase/
    package.json                     # one application, one lockfile
    .env.example
    next.config.ts
    vercel.json
    src/app/                         # pages, layouts, route handlers; composition only
    src/frontend/                    # view modules and interactive controls
    src/backend/
      ingestion/                     # parse, validate, import and report source ambiguity
      assistant/                     # authority, retrieval, latest notice, bounded response
      radar/                         # SLA, claim/resolve, digest and idempotency
      auth/                          # session validation and authorization
      database/                      # Supabase adapters and generated types
      tools/<tool_name>/TOOL.md
      tools/<tool_name>/tool.ts
      tools/index.ts                 # allowlisted tool registry
      artifacts/                     # active EasyGame prompts and tool manifests
        versions/v0/
        CURRENT_VERSION
        version_log.csv
        REPORT.md
        reference/starter_v0/        # copied original artifacts + tools, never active
    public/mock/index.html           # generated from root mock, not a second source
    public/mock/assets/              # retained reference screens, if required by mock
    scripts/                         # import, mock sync, instruction sync/check
    tests/fixtures/                  # synthetic records only
    tests/e2e/
    supabase/config.toml
    supabase/migrations/
    supabase/tests/
```

The repository-root `index.html` is canonical; no duplicate lives in `codebase/`. `npm run sync:mock` copies it into generated `codebase/public/mock/index.html` before development and builds. Preserve screen reference assets; they are historical design inputs. Next.js owns `/`; the existing full mock remains available at `/mock/index.html`. This initializes the real frontend without claiming that every mock interaction has been ported.

Copy the original starter `artifacts/` and `tools/` beneath `reference/starter_v0/` with a provenance manifest and checksums. Its Python IT-helpdesk tools, prompts and evaluations are reference material. Implement the active EasyGame tool contract in TypeScript: `query_notices`, `evaluate_radar`, and later authorized mutation tools. Do not run original Python or import its employee/device data into EasyGame.

## Deep modules and interfaces

| Module | Interface callers learn | Hidden implementation |
| --- | --- | --- |
| Ingestion | `importPack(source, store) -> ImportReport` | CSV rules, timezone conversion, stable row identity, reference resolution, transactions, retry safety |
| Assistant | `answerLogistics(request, evidence) -> AnswerResult` | authority filtering, entity matching, revision ordering, ambiguity, citation and length checks |
| Radar | `evaluateRadar(questions, now) -> RadarSnapshot` | elapsed-time thresholds, terminal states, summaries and deterministic ordering |
| Auth | `requireActor(session, guild, capability) -> Actor` | verified session, membership lookup, role enforcement and rejection |

`AnswerResult` distinguishes answered, clarify, and fallback, and carries source references and a concise decision summary. Do not expose model private reasoning. Record observable tool events, selected evidence, latency and outcome.

HTTP route handlers validate input, authenticate, call these interfaces and translate results to responses. They contain no SQL, SLA arithmetic or prompt assembly. Use a database seam where the production Supabase adapter and in-memory test adapter actually differ; do not add generic repository layers for every table.

## Data findings and consequences

The inspected CSV has 1,092 rows, 313 bot messages, 202 author labels and 10 distinct guild/channel pairs across two guilds. Its timestamp range is 2026-09-12 06:57 through 2026-09-14 23:54 in Asia/Ho_Chi_Minh.

There are only 1,089 distinct `msg_id` labels:

| Label | Collision |
| --- | --- |
| M80709 | Different guilds and timestamps |
| M59723 | Same guild/channel, different timestamps |
| M88243 | Same guild/channel, different timestamps |

Even `(guild, msg_id)` is not unique. Preserve every record using an immutable dataset checksum plus parsed record ordinal. Store `msg_id` as a source label, never as the database primary key. With guild-scoped lookup there are 501 uniquely resolvable reply references, five missing references and two ambiguous references; 584 rows have no target. Do not guess an ambiguous parent based on timestamp proximity.

Staff roles, notice authority, channel names, pinned status and actual Discord snowflakes/jump URLs are absent. Imported humans have unknown roles. A reply means there was a response, not that a question was solved. The bot daily reports are derived and contain known corruption; they are not official evidence. No production grounding accuracy can be claimed from this pack alone.

See [the schema proposal](DATABASE_SCHEMA.md) for the relational model, constraints and access rules.

## Proposed resolution of conflicting requirements

| Issue | Existing sources | Recommended rule |
| --- | --- | --- |
| Answer length | UC-B1 says 400 characters; architecture/glossary say 300 | At most 300 visible Unicode code points and three sentences, citation represented separately as a source card |
| Confidence | UC happy path ≥0.85; fallback <0.70 | ≥0.85 plus verified evidence may answer; 0.70–0.85 asks clarification; below 0.70 falls back; score never substitutes for evidence |
| Resolution | UC-B2 allows any peer/bot reply; ADR-0003 requires staff/learner confirmation | Any reply marks answered; resolution requires verified staff resolution or original learner confirmation |
| Radar lookback | UC scans last 24h | Discover recent questions, but continue tracking all open questions until resolved; never silently drop older ones |
| Staff notifications | UC-B1 mentions TA publicly; ADR-0003 restricts escalation | Public response may acknowledge escalation; staff alert and role ping occur only in staff channel |
| Transparency | Architecture asks for chain-of-thought capture | Tool/evidence events and brief decision summaries only, never private model reasoning |
| Login | Mock uses usernames/passwords | Supabase email/password for actual authentication; username is display metadata; server-controlled guild role |

These are proposed product decisions, not already accepted changes to prior ADRs or use cases. On acceptance, update the conflicting documents and glossary together.

## Runtime and deployment

Start dataset-first with synthetic public fixtures and an explicit local import command for the restricted pack. Do not publish the pack, bake it into the Next.js bundle or put it in CI artifacts. No inferred roles or invented Discord URLs. The initial assistant can exercise deterministic evidence selection on synthetic verified notices; live AI is a separately configured adapter, not required for smoke tests.

Vercel Functions execute finite requests. A continuously connected Discord Gateway collector has lifecycle and heartbeat requirements; it should not run inside a Next.js request. Live ingestion requires a separately operated collector forwarding authenticated events, or a separately designed polling integration. Keep that extension outside the initialization unless live ingestion is selected.

The documented 15-minute SLA schedule is incompatible with Vercel Hobby cron limits (daily minimum). Proposed hosting default: Vercel for Next.js and Supabase Cron for scheduled calls to protected Next.js job routes. Initialize the route contracts and runbooks first; enable production schedules only after a configured database and reachable protected routes exist. Alternatively, Vercel Pro can run the schedules. Daily digest target 22:00 Asia/Ho_Chi_Minh equals 15:00 UTC. Use guild/date and question/tier uniqueness to make retries harmless.

CI should run on pull requests and the default branch: locked install, formatting, lint, TypeScript, module tests, production build, browser smoke tests and PostgreSQL migration/RLS tests. Use synthetic fixtures and no external keys for this pipeline. Browser tests cover frontend render, static mock load, health route and predictable invalid requests. Database tests cover cross-guild isolation, learner/staff access, self-promotion rejection, duplicate imports, missing replies, claim conflicts and notification deduplication.

Deployment workflow: run checks before a Vercel CLI preview on trusted same-repository changes; production deploy only from the default branch through a GitHub `production` environment. Fork PRs receive tests without deployment credentials. Hosted migrations use a separate environment-scoped workflow and expansion-first migrations before app rollout. Document required secrets and report unconfigured integrations explicitly. A successful local build does not prove a hosted deployment.

## Environment and development rules

The intended `.env.example` documents local URLs and full provider dashboard links. Values are placeholders; no real key is required for the synthetic foundation.

| Variable | Scope and source |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000`; deployed value is the actual HTTPS Vercel/custom domain |
| `NEXT_PUBLIC_SUPABASE_URL` | local `http://127.0.0.1:54321`; hosted `https://<project-ref>.supabase.co`, from https://supabase.com/dashboard/project/_/settings/api |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public project key from the same project settings; local key from `supabase status` |
| `SUPABASE_SECRET_KEY` | backend/import only, never public; same project settings, bypasses RLS and requires explicit authorization before use |
| `SUPABASE_ACCESS_TOKEN` | CLI/CI only: https://supabase.com/dashboard/account/tokens |
| `SUPABASE_PROJECT_REF` | CLI/CI only: https://supabase.com/dashboard/project/_/settings/general |
| `SUPABASE_DB_PASSWORD` | CLI migration only: https://supabase.com/dashboard/project/_/settings/database |
| `VERCEL_TOKEN` | CI only: https://vercel.com/account/settings/tokens |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | CLI project linking metadata from `vercel link`; https://vercel.com/dashboard |
| `CRON_SECRET` | generated random server secret, shared with the configured scheduler |

Only add AI and Discord keys when an implemented adapter consumes them; their setup belongs in the optional integration guide. Never include dummy credentials that silently enable production features.

Canonical `AGENTS.md` should define module interfaces, server-only imports, strict types, migration discipline, RLS, source provenance, restricted-data rules, safe telemetry, acceptance checks and deployment commands. Antigravity reads a tracked `.agents/rules/easygame.md` reference to that same source. Narrow `.gitignore` exceptions to permit that rules file while keeping the existing secret-bearing plugin/IDE configuration ignored. Codex and Antigravity share project instructions, not authentication state or global settings.

## Implementation order and acceptance

1. Preserve and verify the root mock; copy starter references and checksums; initialize one Next.js package.
2. Add ingestion and domain interfaces with synthetic tests, then implement their TypeScript behavior.
3. Add migrations, RLS, generated database types and local import tooling; test against a real local PostgreSQL/Supabase instance.
4. Wire initial frontend and backend routes; verify production build and browser behavior.
5. Add environment guide, CI/deployment configuration, shared instructions and skill shortlist.
6. Run every configured local check and record commands/results. Validate hosted services only when configured; distinguish external setup still needed.

Acceptance requires that the static mock remains usable, the Next.js app boots without cloud secrets, all 1,092 source rows survive an authorized local import with reference ambiguity reported, application tests pass, migrations apply to a clean database and reject unauthorized reads/writes, and CI/deployment configuration has been validated. Full live Discord behavior and a complete conversion of the mock into React are subsequent features, not silently claimed by scaffolding.

## Official references checked

- [Next.js project structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
- [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Vercel build root directory](https://vercel.com/docs/builds/configure-a-build)
- [Vercel cron plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel function lifetime limits](https://vercel.com/docs/functions/limitations)
- [Discord Gateway lifecycle](https://docs.discord.com/developers/events/gateway)
- [Antigravity rules](https://www.antigravity.google/docs/rules-workflows/)
