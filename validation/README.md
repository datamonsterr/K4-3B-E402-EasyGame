# Hosted agent validation

This directory is the canonical home for EasyGame agent evaluation. It contains
five Vietnamese acceptance suites (10 cases per US-B1…US-B5), symbolic synthetic
fixtures, versioned JSON schemas, safe run history, and the guarded hosted runner.

From `codebase/` run:

```bash
pnpm validation:datasets
pnpm validation:typecheck
pnpm validation:test
pnpm eval:hosted
```

The hosted command requires the exact acknowledgement and dedicated credentials
listed in `codebase/.env.example`. It authenticates through application routes,
calls `/api/demo/answer`, reads safe server-recorded events, and uses a privileged
controller only to arrange and clean exact namespaced synthetic rows. The agent
itself receives no database credential and reaches Supabase only through its
authenticated allowlisted tools.

Reports expose decisions, tool names, bounded observations, source IDs, outcome,
and latency. They never store prompts, private reasoning, cookies, credentials,
raw provider payloads, unrestricted rows, or the restricted Discord pack.

The legacy aggregate is deliberately marked partial. Only runs whose validity
gates all pass may become comparable headline measurements in `version_log.csv`.
