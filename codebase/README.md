# EasyGame application

One Next.js application serves the frontend and backend. The public preview uses synthetic notices and a fixed radar clock; the original interaction mock is available at `/mock/index.html`.

```bash
mise install
pnpm install --frozen-lockfile
pnpm dev
```

Run commands from `codebase/`. Copy `.env.example` to the ignored `.env` when
using hosted Supabase; mise loads it automatically. Open http://localhost:3000.
No cloud credentials are required for the synthetic preview.

```bash
pnpm check
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:db # Docker required; creates and removes an isolated PostgreSQL container
```

The optional AI SDK agent is selected entirely through server environment
variables: `AI_PROVIDER=gemini` with `GEMINI_API_KEY`/`GEMINI_MODEL`, or
`AI_PROVIDER=openrouter` with `OPENROUTER_API_KEY`/`OPENROUTER_MODEL`. The
Gemini default is `gemini-3.5-flash-lite`. Browser requests cannot provide or
persist provider keys, models, guilds, or roles.

The canonical evaluator calls the deployed production HTTP API with dedicated
validation identities, arranges only namespaced synthetic data in hosted
Supabase, and cleans exact owned IDs:

```bash
pnpm validation:datasets
pnpm validation:test
pnpm eval:hosted
```

`eval:hosted` is guarded by the explicit acknowledgement and hosted-only
settings documented in `.env.example`. It never treats deterministic fallback
or a local database as proof of a valid hosted run.

See the [schema](../docs/architecture/DATABASE_SCHEMA.md), [architecture](../docs/architecture/NEXTJS_FOUNDATION_DESIGN.md), and [use-case coverage review](../docs/usecases/IMPLEMENTATION_COVERAGE.md).

`app/frontend` owns interactive views. `app/backend` owns domain interfaces, tools, artifacts, auth and database adapters. `app/` composes them. The root repository `index.html` is canonical; `public/mock` is generated. Archived Python tools are reference-only.
