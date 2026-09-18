# EasyGame application

One Next.js application serves the frontend and backend. The public preview uses synthetic notices and a fixed radar clock; the original interaction mock is available at `/mock/index.html`.

```bash
mise install
npm ci
npm run dev
```

Run commands from `codebase/`. Copy `.env.example` to the ignored `.env` when
using hosted Supabase; mise loads it automatically. Open http://localhost:3000.
No cloud credentials are required for the synthetic preview.

```bash
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:db # Docker required; creates and removes an isolated PostgreSQL container
```

See the [schema](../docs/architecture/DATABASE_SCHEMA.md), [architecture](../docs/architecture/NEXTJS_FOUNDATION_DESIGN.md), and [use-case coverage review](../docs/usecases/IMPLEMENTATION_COVERAGE.md).

`src/frontend` owns interactive views. `src/backend` owns domain interfaces, tools, artifacts, auth and database adapters. `src/app` composes them. The root repository `index.html` is canonical; `public/mock` is generated. Archived Python tools are reference-only.
