# Wine Cellar API

Express + Prisma + PostgreSQL backend for the [Wine Cellar](../README.md) app: wine search (local catalog first, GPT research as a fallback), a personal cellar/wishlist/ratings collection, Tuya cellar-sensor integration, and passwordless email login.

## Stack

- **Express 5** (TypeScript, ESM)
- **Prisma 7** with the `@prisma/adapter-pg` driver adapter (Postgres)
- **Zod** for request validation, reused to generate the OpenAPI schema (`@asteasolutions/zod-to-openapi`)
- **JWT** access/refresh tokens; login is a 6-digit code emailed via **Resend**
- **OpenAI** Responses API (`gpt-4.1`) for wine research, called with each user's own stored API key
- **MinIO** (S3-compatible) for label/tasting photos, proxied through the API
- **Vitest** + **Supertest** for tests
- **Biome** (via `ultracite`'s shared config) for linting/formatting

## Getting started

### With Docker (recommended)

From the repository root:

```bash
cp server/.env.example server/.env
# fill in JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / ENCRYPTION_KEY / RESEND_API_KEY / EMAIL_FROM
docker compose up --build
```

The API listens on `http://localhost:3000`, migrations run automatically on container start, the MinIO bucket is created automatically on boot, and Swagger UI is at `http://localhost:3000/docs`. The MinIO admin console is at `http://localhost:9001` (login with `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` — see the repo root's [`.env.example`](../.env.example)).

### Locally (without Docker)

Requires Node 22+, pnpm, a running Postgres, and a running MinIO (or any S3-compatible endpoint).

```bash
cp server/.env.example server/.env   # point DATABASE_URL and MINIO_* at your local instances
pnpm install
pnpm --filter server prisma:migrate
pnpm --filter server dev
```

## Environment variables

See [`.env.example`](./.env.example) for the full list. Generate secrets with:

```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
openssl rand -base64 32   # ENCRYPTION_KEY (must decode to exactly 32 bytes)
```

`ENCRYPTION_KEY` is used to encrypt each user's stored OpenAI API key and Tuya client secret at rest (AES-256-GCM) — it is never sent back to the client.

## API overview

All routes except `/auth/*` and `/health` require `Authorization: Bearer <accessToken>`.

| Area | Routes |
| --- | --- |
| Auth | `POST /auth/request-code`, `POST /auth/verify-code`, `POST /auth/refresh`, `POST /auth/logout` |
| Profile | `GET/PATCH /users/me`, `GET/PUT/DELETE /users/me/tuya` |
| Wines | `GET /wines/search`, `POST /wines/identify-label`, `GET /wines/:id`, `POST /wines/:id/refresh`, `PUT/POST /wines/:id/image`, `POST /wines/:id/image/search` |
| Cellar | `GET/POST /cellar`, `PATCH/DELETE /cellar/:wineId` |
| Wishlist | `GET/POST /wishlist`, `DELETE /wishlist/:wineId` |
| Ratings | `GET /ratings`, `GET/PUT/DELETE /ratings/:wineId`, `POST /ratings/:wineId/photo` |
| Recent views | `GET/DELETE /recent-views`, `POST /recent-views/:wineId` |
| Tuya | `GET /tuya/reading`, `POST /tuya/test` |
| Account | `GET /account/export`, `POST /account/import` |

Full request/response schemas are in Swagger UI at `/docs` (generated from the same Zod schemas the routes validate against, so it can't drift).

### Search: database-first, GPT as a fallback

`GET /wines/search?q=...` checks the local `Wine` table first (name/winery/region, case-insensitive). If nothing matches — or `?refresh=true` is passed — it calls GPT with the caller's own stored OpenAI key, upserts the results into the catalog (deduplicated by a normalized `producer+name+vintage` key), and returns those instead. `POST /wines/:id/refresh` re-runs GPT for one exact wine and overwrites its stored record in place.

### Images

Wine photos are **not** looked up automatically — the app shows a static illustration per wine `type` instead (see the closed 13-value type enum in `src/modules/wines/wine-prompts.ts`). You can still:
- `POST /wines/:id/image` — upload your own label photo (`imageSource = MANUAL`). Body: `{ "image": "data:image/jpeg;base64,..." }` (JPEG/PNG/WebP, up to 8 MB) — the same JSON shape as `POST /wines/identify-label` and `POST /ratings/:wineId/photo`, since React Native's multipart uploads can't send `data:` URIs.
- `PUT /wines/:id/image` — point a wine at any URL instead.
- `POST /wines/:id/image/search` — opt-in, slower: asks GPT to agentically search retailer pages for a real product photo (`imageSource = GPT`). Not called by anything else.

Uploaded photos (label images and `POST /ratings/:wineId/photo` tasting photos) are stored in a MinIO bucket (`MINIO_BUCKET`, created automatically on boot) and served back through `GET /uploads/:key`, which streams the object from MinIO — the bucket itself is never exposed directly, so `PUBLIC_URL` stays the only address a client ever needs.

## Tests

```bash
pnpm --filter server test:unit          # pure logic, no DB required
pnpm --filter server test:integration   # needs DATABASE_URL pointing at a running, migrated Postgres
pnpm --filter server test               # both
pnpm --filter server test:coverage
```

Integration tests mock Resend and OpenAI at the module boundary — no real network calls.

They **truncate every table** between tests, so `DATABASE_URL` must point at a throwaway database whose name ends in `_test` (the helper refuses to run otherwise). Never aim it at the compose Postgres. A disposable one:

```bash
docker run -d --rm --name wine-cellar-test-pg -e POSTGRES_USER=wine_cellar -e POSTGRES_PASSWORD=wine_cellar \
  -e POSTGRES_DB=wine_cellar_test -p 55432:5432 postgres:17-alpine
export DATABASE_URL=postgresql://wine_cellar:wine_cellar@localhost:55432/wine_cellar_test
pnpm --filter server test:integration   # applies migrations first via `pretest:integration`
```

## Project layout

```
src/
  app.ts / server.ts     Express app assembly + entrypoint
  config/env.ts           Zod-validated environment loading
  lib/                     prisma client, jwt, crypto, uploads, storage (MinIO), logger, HttpError
  middleware/              auth, request validation, error handler
  modules/<name>/          routes + service + zod schemas per domain (auth, users, wines, cellar, wishlist, ratings, recent-views, tuya, account)
  openapi/                 shared Zod-to-OpenAPI registry, document builder
prompts/                  GPT prompts as plain Markdown (wine-search.md), read at startup by modules/wines/wine-prompts.ts
prisma/                   schema.prisma + migrations
test/unit/                pure-logic tests
test/integration/         Supertest tests against a real Postgres
```

## Deploying on a homelab (Tailscale)

`docker-compose.yml` has no TLS termination — it's meant to sit behind Tailscale (Tailscale Serve, or your own reverse proxy) rather than being exposed directly. Point the mobile app's `EXPO_PUBLIC_API_URL` at your Tailscale MagicDNS name (e.g. `http://homelab:3000`) so it's reachable from outside your LAN without opening any ports.
