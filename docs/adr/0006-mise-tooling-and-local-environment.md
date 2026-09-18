# ADR-0006: App-local mise tooling and environment

- Status: Accepted
- Date: 2026-09-18

## Context

EasyGame runs from `codebase/`. Contributors need consistent Node.js, pnpm,
Vercel CLI and Supabase CLI versions while CI must remain able to use the
locked npm installation without mise. Hosted credentials must remain local and
must never enter tracked configuration.

## Decision

`codebase/mise.toml` is the source of truth for interactive development tool
versions. It loads the ignored `codebase/.env` file with credential-shaped
values redacted from mise output. `codebase/.env.example` documents required
names and non-secret project identifiers only.

The npm lockfile remains the source of truth for application dependencies and
CI. Keeping CLI development dependencies preserves the documented `npm ci`
workflow when mise is unavailable.

Vercel project metadata belongs under ignored `codebase/.vercel/`. Supabase
CLI state belongs under ignored `codebase/supabase/.temp/` and
`codebase/supabase/.branches/`.

## Consequences

- Run `mise install` from `codebase/` to provision the pinned tools.
- Run app, Supabase and Vercel commands from `codebase/`.
- Never place credentials in `mise.toml`, `.env.example`, documentation or CI
  artifacts.
- Tool upgrades require an intentional `mise.toml` change and validation of
  the npm-based fallback workflow.
