# Development

## Toolchain

- Node 22+, pnpm 10 (the only package manager; `pnpm-lock.yaml` is the lockfile)
- PostgreSQL 17 for the API (any local Postgres works for development)
- Ollama and a SearXNG for real research; both are mocked in tests
- Expo SDK 57 for the app: `pnpm start`, `pnpm ios`, `pnpm android`, `pnpm web`

## Scripts

| Where | Command | What |
| --- | --- | --- |
| root | `pnpm lint` / `pnpm lint:fix` / `pnpm format` | Biome over the app and `scripts/` |
| root | `pnpm typecheck` | TypeScript for the app |
| root | `pnpm test` | Vitest for `src/**/*.test.ts` (pure utilities and services) |
| root | `pnpm screenshots` | Regenerates `docs/screenshots` (see [screenshots.md](screenshots.md)) |
| server | `pnpm --filter server dev` | API with `tsx watch` |
| server | `pnpm --filter server lint` / `typecheck` / `build` | Biome, `tsc`, compile to `dist/` |
| server | `pnpm --filter server test:unit` | Pure logic, no database |
| server | `pnpm --filter server test:integration` | Supertest against a real Postgres, migrations applied first |
| server | `pnpm --filter server test` | Both |
| server | `pnpm --filter server prisma:migrate` | Create and apply a migration in development |

## Running the API locally

```bash
docker run -d --name wine-cellar-searxng -p 8888:8080 -e SEARXNG_SECRET=$(openssl rand -hex 32) \
  -v "$PWD/searxng/settings.yml:/etc/searxng/settings.yml:ro" searxng/searxng:2026.9.25-12f8b6515
cp server/.env.example server/.env    # point DATABASE_URL at your Postgres
pnpm install
pnpm --filter server prisma:migrate
pnpm --filter server dev
```

## Tests

Integration tests truncate every table between tests, so `DATABASE_URL` must point at a throwaway database whose name ends in `_test`; the helper refuses anything else. A disposable one:

```bash
docker run -d --rm --name wine-cellar-test-pg -e POSTGRES_USER=wine_cellar -e POSTGRES_PASSWORD=wine_cellar \
  -e POSTGRES_DB=wine_cellar_test -p 55432:5432 postgres:17-alpine
export DATABASE_URL=postgresql://wine_cellar:wine_cellar@localhost:55432/wine_cellar_test
pnpm --filter server test
```

What the suites cover:

- `test/unit/`: the Ollama client (streamed pull progress, error mapping), the job queue (progress, cancellation, retention), model pulls, the model catalog, search tokenization, image preparation, the rate limiter, the research pipeline with SearXNG, pages and the model mocked (profiles, progress, cancellation, label confidence), pricing, stores, photos, storage, URLs, crypto and JWT.
- `test/integration/`: auth flow and throttling, cellar, wine offers and legacy imports, research jobs end to end (memo, cancellation, photo rules, relative URLs), catalog search, the AI routes with the Ollama singleton spied, settings persistence, health.
- App `src/**/*.test.ts`: formatting helpers, rating validation, illustration slugs, job following with cancellation and timeouts.

No test talks to the network or needs a model.

## Conventions

- **No comments in code.** Explain with names, types, small functions and tests. Lint suppressions live in `biome.jsonc` (`noVoid` and `noAwaitInLoops` are off; the Express type augmentation is the one file allowed a namespace).
- **Strict types everywhere**: `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` on the server.
- **Zod at the boundary.** Every request body, query and param is validated; the same schemas build the OpenAPI document and type the DTOs.
- **Routes → services → lib.** Routes never touch Prisma; services never build HTTP responses; `lib` never imports a module.
- **Jobs, not long requests.** Anything the model does runs through `JobQueue` with progress and cancellation.
- **Deterministic money and matching.** Prices, store matching, photo verdict overrides and search keys are code, not prompts, and are unit-tested.
- **Prompts are data** in `server/prompts/*.md`, read at startup.

## Adding a feature module

1. `src/modules/<name>/<name>.schemas.ts`: Zod schemas and DTO types.
2. `<name>.service.ts`: use cases over Prisma and `lib`.
3. `<name>.routes.ts`: `registry.registerPath` next to each handler, using `security`, `jsonResponse` and `okResponseSchema` from `openapi/registry.ts`.
4. Mount it in `app.ts`; add unit tests for logic and an integration test per route.

## Adding a setting

Add a key to `definitions` in `server/src/lib/app-settings.ts` with a Zod schema and a default. Reads are cached in memory; `resetSettingsCache()` exists for tests.

## Migrations

Prisma 7 with the `pg` driver adapter. Create one with `pnpm --filter server prisma:migrate --name <change>` against a development database, review the SQL, and keep data backfills in the migration itself (see `20260927120000_ai_settings_search_memo`, which fills `searchText` for existing wines).
