# EasyGame development rules

Run agents from this Git repository root. The runnable app is `codebase/`. Read `CONTEXT.md`, `docs/architecture/NEXTJS_FOUNDATION_DESIGN.md` and the relevant use case before changing behavior.

- One Next.js deployment. Keep route handlers small; domain decisions belong behind the ingestion, assistant, radar and auth module interfaces. Accept dependencies where production and test adapters differ.
- Use strict TypeScript. Validate untrusted input at entry; never trust client-supplied roles, guild access, confidence or notice authority. Keep privileged Supabase clients in server-only modules or local scripts.
- Data pack labels are not unique IDs. Preserve rows by dataset checksum and record ordinal. Ambiguous and missing reply targets remain explicit. Unknown source roles/channels stay unknown.
- Never commit or publish the restricted CSV, derived message dumps, credentials, `.env.local`, Supabase CLI state or browser authentication state. Tests and public previews use synthetic fixtures.
- Only verified notices can ground answers. Select the latest matching topic within a guild; clarify tied conflicts. Answer body: at most 300 Unicode code points and three sentences, with a separate source card. Never fabricate Discord links.
- A reply means answered, not resolved. Stop radar tracking only on authorized resolution. SLA tiers begin at 120 and 240 minutes; retain older unresolved questions. Staff alerts are staff-only; no unsolicited DMs.
- RLS is mandatory for every exposed table. Ordinary web requests use user-scoped clients. Memberships are provisioned by trusted operators; users cannot self-promote. Test cross-guild denial and concurrent state changes against PostgreSQL.
- Add forward, additive migrations. Never edit a migration already applied to a shared environment. Generate database types after schema changes. Keep auth schema management with Supabase.
- Observability contains tool events, selected evidence and brief decision summaries. Never store private model reasoning, passwords or raw provider payloads in traces.
- `index.html` at repository root is the canonical static mock (HTML/CSS/JS together). `npm run sync:mock` generates its Next.js public copy. Do not edit generated copies. Archived starter tools/prompts are reference-only.
- `AGENTS.md` is the canonical rule source for Codex and Antigravity. `.agents/rules/easygame.md` references this file. Do not sync account tokens or global agent settings.
- Validate a change with appropriate checks. Foundation acceptance: in `codebase/`, run `npm ci`, `npm run check`, `npm run build`, `npm run test:e2e` and `npm run test:db` (Docker). Use agent-browser for exploratory browser inspection. Test behavior across module interfaces; do not merely test implementation details.
- CI has no cloud keys. Deployment and hosted migration workflows use separate GitHub environments; production uses main. Never claim hosted success from a local build. Document missing external configuration.
- Consult official framework/CLI documentation for version-specific behavior. Skills are listed in `docs/architecture/DEVELOPMENT_SKILLS.md`; inspect their instructions before installation/use.
