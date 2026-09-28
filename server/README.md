# Wine Cellar API

Express 5 + Prisma 7 + PostgreSQL backend for the [Wine Cellar](../README.md) app. It owns the wine catalog, the research pipeline on a local Ollama model, model management, collections, tastings, the Tuya sensor integration and passwordless login.

## Stack

| | |
| --- | --- |
| HTTP | Express 5, TypeScript (ESM), Helmet, CORS, pino |
| Validation and docs | Zod schemas, reused for the OpenAPI document at `/docs` |
| Database | PostgreSQL through Prisma 7 with the `pg` driver adapter |
| AI | Ollama (research, label reading, photo checks, model downloads), SearXNG (web search) |
| Images | sharp (downscaling for the model, catalog photo trimming) |
| Auth | Email one-time codes via Resend, JWT access/refresh pairs, per-address rate limits |
| Tests | Vitest and Supertest |
| Lint | Biome through Ultracite |

## Run it

With Docker, from the repository root: see [docs/deployment.md](../docs/deployment.md). Locally: see [docs/development.md](../docs/development.md).

```bash
pnpm --filter server dev          # API on :3000 with tsx watch
pnpm --filter server test         # unit + integration (needs a *_test Postgres)
pnpm --filter server lint
pnpm --filter server typecheck
```

## Layout

```
src/
  app.ts, server.ts       composition root, health, graceful shutdown
  config/env.ts           environment, validated with Zod
  lib/                    Ollama client and facade, settings, job queue, web search and pages,
                          image prep, storage, health, errors, jwt, crypto, logger, prisma
  middleware/             auth, validation, rate limit, error handler
  modules/
    ai/                   model catalog, downloads, selection, research depth
    wines/                search, research pipeline, profiles, jobs, memo, pricing, stores, photos
    auth, users, cellar, wishlist, ratings, recent-views, tuya, account, uploads
  openapi/                registry and response helpers
prompts/                  model prompts (Markdown)
prisma/                   schema and migrations
test/unit, test/integration
```

Read [docs/architecture.md](../docs/architecture.md) for the layering rules, [docs/api.md](../docs/api.md) for every route, [docs/ai-models.md](../docs/ai-models.md) for model management and [docs/research-pipeline.md](../docs/research-pipeline.md) for how a search becomes a record.
