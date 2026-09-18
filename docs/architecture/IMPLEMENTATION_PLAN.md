# Dataset foundation implementation plan

Approved design: NEXTJS_FOUNDATION_DESIGN.md, user confirmation 2026-09-18.
Goal: a runnable Next.js frontend/backend foundation with tested PostgreSQL contracts and deployable configuration.
Architecture: one Next.js App Router application, server-only composition, pure domain modules, Supabase database and auth adapters. Preserve the static mock and original starter reference.
Tech stack: TypeScript, Next.js, React, Supabase, Vitest, Playwright, GitHub Actions, Vercel.

- [ ] Scaffold `codebase/package.json`, TypeScript/lint/test config and mock sync; archive starter artifacts/tools with SHA-256 provenance.
- [ ] Write failing tests for import collisions, timezone parsing, evidence authority/latest notice, answer constraints and radar thresholds; implement `src/backend/{ingestion,assistant,radar}` through their interfaces.
- [ ] Implement `supabase/migrations`, local config, RLS and transactional functions; execute database integration tests including unauthorized identities and idempotency.
- [ ] Implement frontend, health/demo routes, Supabase auth and authorized data route; browser-test success and rejection flows.
- [ ] Add documented environment template, Vercel configuration, CI, deployment and migration workflows; synchronize Codex/Antigravity rules.
- [ ] Update accepted architecture/glossary/ADRs; run `npm run check`, `npm run build`, `npm run test:e2e`, `npm run test:db`, actual pack dry-run/import validation and browser inspection. Record exact results in VERIFICATION.md.

Database work is isolated to migrations/config/database scripts/tests and database adapter types. Parent owns package files, application, docs and CI. Review database spec compliance before code-quality review, then review integration. No hosted deployment or data upload is needed to initialize the project; cloud workflows clearly report missing credentials.
