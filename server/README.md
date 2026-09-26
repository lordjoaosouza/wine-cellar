# Wine Cellar API

Express + Prisma + PostgreSQL backend for the [Wine Cellar](../README.md) app: wine search (local catalog first, GPT research as a fallback), prices from real store listings, a personal cellar/wishlist/ratings collection, Tuya cellar-sensor integration, and passwordless email login.

## Stack

- **Express 5** (TypeScript, ESM)
- **Prisma 7** with the `@prisma/adapter-pg` driver adapter (Postgres)
- **Zod** for request validation, reused to generate the OpenAPI schema (`@asteasolutions/zod-to-openapi`)
- **JWT** access/refresh tokens; login is a 6-digit code emailed via **Resend**
- **OpenAI** Responses API (`gpt-4.1` + web search) for wine research and label reading, called with each user's own stored API key
- **Frankfurter** (ECB reference rates, no API key) to convert store prices abroad to BRL
- **Local disk** (a Docker volume) for label/tasting photos, served through the API
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

The API listens on `http://localhost:3000`, migrations run automatically on container start, and Swagger UI is at `http://localhost:3000/docs`. Uploaded photos live in the `uploads` Docker volume (mounted at `/data/uploads`).

### Locally (without Docker)

Requires Node 22+, pnpm and a running Postgres.

```bash
cp server/.env.example server/.env   # point DATABASE_URL at your local Postgres
pnpm install
pnpm --filter server prisma:migrate
pnpm --filter server dev
```

## Environment variables

See [`.env.example`](./.env.example) for a starting point.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | Postgres connection string (set by `docker-compose.yml` in Docker) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | yes | — | Token signing secrets, at least 32 characters each |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | no | `15m` / `30d` | Token lifetimes |
| `ENCRYPTION_KEY` | yes | — | 32 bytes, base64 — encrypts stored OpenAI keys and Tuya secrets |
| `RESEND_API_KEY` / `EMAIL_FROM` | yes | — | Sending login codes by email |
| `PUBLIC_URL` | no | `http://localhost:3000` | Address clients reach the API at; photo URLs are built from it |
| `UPLOADS_DIR` | no | `uploads` | Where photos are written (`/data/uploads` in Docker) |
| `CORS_ORIGINS` | no | empty (any origin) | Comma-separated browser origins allowed to call the API (web app) |
| `PORT` | no | `3000` | HTTP port |

Generate secrets with:

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

`GET /wines/search?q=...` checks the local `Wine` table first (name/winery/region, case-insensitive). If nothing matches — or `?refresh=true` is passed — it calls GPT with the caller's own stored OpenAI key (web search over the producer's site and wine stores, guided by [`prompts/wine-search.md`](prompts/wine-search.md)), upserts the results into the catalog (deduplicated by a normalized `producer+name+vintage` key), and returns those instead. `POST /wines/:id/refresh` re-runs GPT for one exact wine and overwrites its stored record in place.

### Prices: store offers

GPT never produces the displayed price. For every wine it returns the individual store listings it opened (`offers`: store, country, product URL, currency and the amount exactly as printed), and `src/modules/wines/wine-pricing.ts` computes the price deterministically:

1. **Brazilian stores first.** If any listing is in BRL, only BRL listings are used.
2. **Stores abroad as a fallback.** Only when no Brazilian store sells the wine are foreign listings converted to BRL with the current exchange rate (`src/lib/exchange-rates.ts` — Frankfurter, cached for 12h; the last good rates are reused if it is unreachable). The prompt limits stores abroad to currencies Frankfurter can convert (USD, EUR, GBP and a few others — no ARS/CLP/UYU). The two groups are never mixed.
3. **Aggregation:** one price is used as-is, two are averaged, three or more use the median after discarding anything above double or below half of it.
4. **Rounding:** to the nearest R$ 5 below R$ 100, R$ 10 up to R$ 999, R$ 50 above — formatted as `~R$ 1.350`.

Wine responses include `price`, `offers` (each with its original `amount`/`currency` plus `amountBrl`) and `priceMarket` (`BR`, `INTERNATIONAL`, or `null` when there are no offers). The app lists the offers under "Where to buy" with links to each store.

There is no external wine score (Vivino, critics, etc.): the only score in the app is the user's own tasting rating.

### Images

Wine photos are **not** looked up automatically — the app shows a static illustration per wine `type` instead (see the closed 13-value type enum in `src/modules/wines/wine-prompts.ts`). You can still:
- `POST /wines/:id/image` — upload your own label photo (`imageSource = MANUAL`). Body: `{ "image": "data:image/jpeg;base64,..." }` (JPEG/PNG/WebP, up to 8 MB) — the same JSON shape as `POST /wines/identify-label` and `POST /ratings/:wineId/photo`, since React Native's multipart uploads can't send `data:` URIs.
- `PUT /wines/:id/image` — point a wine at any URL instead.
- `POST /wines/:id/image/search` — opt-in, slower: asks GPT to agentically search retailer pages for a real product photo (`imageSource = GPT`). Not called by anything else.

Uploaded photos (label images and `POST /ratings/:wineId/photo` tasting photos) are written to `UPLOADS_DIR` (created automatically on boot; `/data/uploads` in Docker) and served back through `GET /uploads/:key`, so `PUBLIC_URL` stays the only address a client ever needs. Back up that directory (or the `uploads` volume) together with Postgres.

## Tests

```bash
pnpm --filter server test:unit          # pure logic, no DB required
pnpm --filter server test:integration   # needs DATABASE_URL pointing at a running, migrated Postgres
pnpm --filter server test               # both
pnpm --filter server test:coverage
```

Integration tests mock Resend and OpenAI at the module boundary, and the exchange-rate tests stub `fetch` — no real network calls.

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
  lib/                     prisma client, jwt, crypto, uploads, storage (local disk), logger, HttpError
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

The server needs outbound internet access to OpenAI, Resend, Tuya Cloud and `api.frankfurter.dev`.

### Backups

All state lives in two Docker volumes: `pgdata` (Postgres) and `uploads` (photos). Back up both together — photo URLs in the database point at files in `uploads`. The app's own export (`GET /account/export`) is a per-user JSON archive of the collection; it references photos by URL but does not include the image files.

## Upgrading

Migrations run automatically on container start, so upgrading is `git pull` + `docker compose up --build --remove-orphans` (`--remove-orphans` removes containers of services that were dropped from the compose file). Notes for specific changes:

### External scores removed, prices from store offers

Migration `20260925120000_store_offers_drop_guide_score` drops the `guideScore` column (the Vivino rating) and adds `offers`. Existing wines keep their previous `price` with no store list until they are refreshed (the refresh button on the wine screen, or `POST /wines/:id/refresh`). Archives exported before this change still import; their `guideScore` is ignored.
