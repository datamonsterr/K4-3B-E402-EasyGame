# Development skill shortlist

Checked 2026-09-18 against skills.sh discovery and authenticated GitHub repository metadata. Counts are approximate and change. Selected skills are installed project-locally for Codex and recorded in `skills-lock.json`; their copied working files remain under ignored `.agents/skills/`. Skills provide instructions, while actual CLIs are pinned separately in `codebase/mise.toml`.

| Purpose | Skill | Installs | Source repository stars |
| --- | --- | ---: | ---: |
| Vercel CLI | [vercel/vercel: vercel-cli](https://skills.sh/vercel/vercel/vercel-cli) | 5.4K | 16,264 |
| Supabase CLI, migrations, Auth | [supabase/agent-skills: supabase](https://skills.sh/supabase/agent-skills/supabase) | 279.9K | 2,627 |
| PostgreSQL, RLS and indexes | [supabase-postgres-best-practices](https://skills.sh/supabase/agent-skills/supabase-postgres-best-practices) | 405.8K | 2,627 |
| Browser verification | [vercel-labs/agent-browser: agent-browser](https://skills.sh/vercel-labs/agent-browser/agent-browser) | 878.6K | 42,785 |
| Next.js conventions | [vercel-labs/openreview: next-best-practices](https://skills.sh/vercel-labs/openreview/next-best-practices) | 4.3K | 1,682 |
| Next.js runtime validation | [vercel/next.js: next-dev-loop](https://skills.sh/vercel/next.js/next-dev-loop) | 14.8K | 142,342 |
| TypeScript advanced types | [wshobson/agents: typescript-advanced-types](https://skills.sh/wshobson/agents/typescript-advanced-types) | 76.5K | 39,760 |

Installed for Codex: `supabase`, `supabase-postgres-best-practices`, `vercel-cli`, `next-best-practices`, and `api-and-interface-design`. Browser and advanced-TypeScript skills remain recommendations rather than project requirements.

Vercel/Supabase entries are vendor-maintained; TypeScript is a community skill. Popularity and stars are screening signals, not a security audit. Prefer ordinary strict TypeScript before advanced type machinery. The old `vercel-labs/next-skills/next-best-practices` directory page returned 404; use the verified location above.

For project-local installation from the EasyGame repository root:

```bash
npx skills add vercel/vercel --skill vercel-cli --agent codex antigravity -y
npx skills add supabase/agent-skills --skill supabase supabase-postgres-best-practices --agent codex antigravity -y
npx skills add vercel-labs/agent-browser --skill agent-browser --agent codex antigravity -y
npx skills add vercel-labs/openreview --skill next-best-practices --agent codex antigravity -y
npx skills add vercel/next.js --skill next-dev-loop --agent codex antigravity -y
npx skills add wshobson/agents --skill typescript-advanced-types --agent codex antigravity -y
```

Review downloaded instructions before use and retain the generated lockfile if installing. Do not copy local credentials or global agent configurations into the repository.

Codex uses [AGENTS.md project instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md). Antigravity CLI uses [workspace rules under `.agents/rules/`](https://www.antigravity.google/docs/rules-workflows/), supporting relative file references. A rule at `.agents/rules/easygame.md` can reference `@../../AGENTS.md` from this repository root. Open each CLI in `K4-3B-E402-EasyGame`, which is its own Git repository; the parent workspace is not a Git repository.
