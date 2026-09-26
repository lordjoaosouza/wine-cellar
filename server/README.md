# Wine Cellar API

Express + Prisma + PostgreSQL backend for the [Wine Cellar](../README.md) app: wine search (local catalog first, web research by a local AI model as a fallback), prices from real store listings, a personal cellar/wishlist/ratings collection, Tuya cellar-sensor integration, and passwordless email login.

## Stack

- **Express 5** (TypeScript, ESM)
- **Prisma 7** with the `@prisma/adapter-pg` driver adapter (Postgres)
- **Zod** for request validation, reused to generate the OpenAPI schema (`@asteasolutions/zod-to-openapi`)
- **JWT** access/refresh tokens; login is a 6-digit code emailed via **Resend**
- **Ollama** running a local multimodal model (default `qwen3.5:9b`) for wine research and label reading
- **SearXNG** (self-hosted metasearch, in the compose stack) for web search
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
echo "SEARXNG_SECRET=$(openssl rand -hex 32)" > .env
docker compose up --build
```

Research needs Ollama running on the host with the model pulled (`ollama pull qwen3.5:9b` — see the root README); the API container reaches it at `host.docker.internal:11434`. The API listens on `http://localhost:3000`, migrations run automatically on container start, and Swagger UI is at `http://localhost:3000/docs`. Photos live in the `uploads` Docker volume (mounted at `/data/uploads`).

### Locally (without Docker)

Requires Node 22+, pnpm, a running Postgres, Ollama with the model pulled, and a SearXNG with this repo's settings (the `.env.example` defaults point at `localhost:11434` and `localhost:8888`):

```bash
docker run -d --name wine-cellar-searxng -p 8888:8080 -e SEARXNG_SECRET=$(openssl rand -hex 32) \
  -v "$PWD/searxng/settings.yml:/etc/searxng/settings.yml:ro" searxng/searxng:2026.9.25-12f8b6515
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
| `ENCRYPTION_KEY` | yes | — | 32 bytes, base64 — encrypts stored Tuya secrets |
| `OLLAMA_URL` | no | `http://localhost:11434` | Ollama API (`http://host.docker.internal:11434` in Docker) |
| `LLM_MODEL` | no | `qwen3.5:9b` | Ollama model for research and label reading — must accept images |
| `LLM_CONTEXT_TOKENS` | no | `8192` | Context window per request |
| `SEARXNG_URL` | no | `http://localhost:8888` | SearXNG instance with the JSON format enabled (`http://searxng:8080` in Docker) |
| `SEARXNG_SECRET` | yes, in Docker | — | Set in the **root** `.env`; secret for the SearXNG container |
| `RESEND_API_KEY` / `EMAIL_FROM` | yes | — | Sending login codes by email |
| `UPLOADS_DIR` | no | `uploads` | Where photos are written (`/data/uploads` in Docker) |
| `CORS_ORIGINS` | no | empty (any origin) | Comma-separated browser origins allowed to call the API (web app) |
| `PORT` | no | `3000` | HTTP port |

Generate secrets with:

```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
openssl rand -base64 32   # ENCRYPTION_KEY (must decode to exactly 32 bytes)
```

`ENCRYPTION_KEY` is used to encrypt each user's Tuya client secret at rest (AES-256-GCM) — it is never sent back to the client.

## API overview

All routes except `/auth/*` and `/health` require `Authorization: Bearer <accessToken>`.

| Area | Routes |
| --- | --- |
| Auth | `POST /auth/request-code`, `POST /auth/verify-code`, `POST /auth/refresh`, `POST /auth/logout` |
| Profile | `GET/PATCH /users/me`, `GET/PUT/DELETE /users/me/tuya` |
| Wines | `GET /wines/search`, `POST /wines/research`, `GET /wines/research/:jobId`, `POST /wines/identify-label`, `GET /wines/:id`, `POST /wines/:id/refresh` |
| Cellar | `GET/POST /cellar`, `PATCH/DELETE /cellar/:wineId` |
| Wishlist | `GET/POST /wishlist`, `DELETE /wishlist/:wineId` |
| Ratings | `GET /ratings`, `GET/PUT/DELETE /ratings/:wineId`, `POST /ratings/:wineId/photo` |
| Recent views | `GET/DELETE /recent-views`, `POST /recent-views/:wineId` |
| Tuya | `GET /tuya/reading`, `POST /tuya/test` |
| Account | `GET /account/export`, `POST /account/import` |

Full request/response schemas are in Swagger UI at `/docs` (generated from the same Zod schemas the routes validate against, so it can't drift).

### Search and research on a local model

`GET /wines/search?q=...` only searches the local `Wine` table (name/winery/region, case-insensitive) and answers immediately. Anything new is found with **research jobs**, because a local model takes a minute or more per wine — longer than a phone keeps an idle request open:

- `POST /wines/research` `{ "q": "catena malbec" }`, `POST /wines/identify-label` (a label photo) and `POST /wines/:id/refresh` start a job and answer `202` with `{ id, status, stage }`.
- `GET /wines/research/:jobId` returns the job's `status` (`queued` → `running` → `done` or `failed`), a human-readable `stage` ("Checking stores for Catena Malbec") and, once done, the `results`. A failed job carries `error.code = "llm_unavailable"` when Ollama can't be reached.
- Jobs run one at a time (the model can't do two faster in parallel), live in memory and are forgotten an hour after finishing — the app just polls every 2 seconds.

A research runs as a pipeline in which the code does the browsing and the model only reads ([`wine-research.ts`](src/modules/wines/wine-research.ts)):

1. **Identify** — SearXNG searches the query; the model turns the typed text plus results into specific wines (producer, name, vintage), fixing typos ([`prompts/wine-identify.md`](prompts/wine-identify.md)). Up to 4 wines per query.
2. **Stores** — for each wine, SearXNG searches Brazilian stores; product pages are fetched and their structured data (JSON-LD `Product`/`Offer`, product meta tags) read for name, price, currency and photo. Any shop counts — well-known stores ([`wine-stores.ts`](src/modules/wines/wine-stores.ts)) are tried first and marketplaces/aggregators (Mercado Livre, Amazon, Vivino...) never. A store's display name comes from the known list, else from the page itself: `og:site_name`, the offer's `seller` or the site's organization in JSON-LD, the app-name meta tags, the logo's alt text or the title's last segment — the bare domain only as a last resort. Only if no Brazilian page has a BRL price are stores abroad searched.
3. **Sources** — producer and tech-sheet pages are fetched as reading material.
4. **Write-up** — the model gets the wine plus excerpts of those pages and returns the catalog record (JSON-schema constrained) and which store pages sell exactly this wine ([`prompts/wine-extract.md`](prompts/wine-extract.md)). Store pages it doesn't confirm are dropped.
5. **Photo check** — store titles can hide which cuvée a page sells (a "Catena Malbec Malbec" listing turned out to be a D.V. Catena), but the bottle in its photo can't. For up to 2 confirmed store pages, best stores first, the product photo is downloaded and the vision model reads its label ([`wine-photos.ts`](src/modules/wines/wine-photos.ts)): a photo of a different wine removes that store from the listings; the first clean catalog shot of the right wine (else the first correct one) becomes the wine's photo. If the label text the model reads names the wine, that wins over its yes/no verdict, so medal badges around a bottle can't get a correct store dropped.
6. **Price** — computed in code from the confirmed store listings (next section). Results are upserted into the catalog, deduplicated by a normalized `producer+name+vintage` key.

Label photos go through the same model first (it is multimodal) to read producer, name and vintage, then through steps 2–5.

**Speed.** Measured on an Apple M4 with 16 GB running `qwen3.5:9b`: 15–25 s to identify the wines, 50–65 s to write up each one and ~20 s to check its photos (so ~2.5 min for a query that finds two wines), and 11–15 s to read a label. Almost all of it is the model; machines with more GPU memory bandwidth are faster, and a smaller model (`LLM_MODEL`) trades accuracy for speed.

### Prices: store offers

The model never produces the displayed price. Each wine keeps the store listings research confirmed (`offers`: store, country, product URL, currency and the amount exactly as the page's structured data states it), and `src/modules/wines/wine-pricing.ts` computes the price deterministically:

1. **Brazilian stores first.** If any listing is in BRL, only BRL listings are used.
2. **Stores abroad as a fallback.** Only when no Brazilian store sells the wine are foreign listings converted to BRL with the current exchange rate (`src/lib/exchange-rates.ts` — Frankfurter, cached for 12h; the last good rates are reused if it is unreachable). The prompt limits stores abroad to currencies Frankfurter can convert (USD, EUR, GBP and a few others — no ARS/CLP/UYU). The two groups are never mixed.
3. **Aggregation:** one price is used as-is, two are averaged, three or more use the median after discarding anything above double or below half of it.
4. **Rounding:** to the nearest R$ 5 below R$ 100, R$ 10 up to R$ 999, R$ 50 above — formatted as `~R$ 1.350`.

Wine responses include `price`, `offers` (each with its original `amount`/`currency` plus `amountBrl`) and `priceMarket` (`BR`, `INTERNATIONAL`, or `null` when there are no offers). The app lists the offers under "Where to buy" with links to each store.

There is no external wine score (Vivino, critics, etc.): the only score in the app is the user's own tasting rating.

### Images

A wine's photo, in order of preference — a newer source never replaces an existing photo:
1. **Store photo** — research gives a new wine the store product photo the vision model verified (step 5 above), `imageSource = WEB`.
2. **Label scan** — when a scanned wine still has no photo after research, the photo you took becomes its picture (`imageSource = LABEL_SCAN`).
3. **Illustration** — with no photo at all, the app shows a static illustration per wine `type` (see the closed 13-value type enum in `src/modules/wines/wine-prompts.ts`).

Photos from stores are downloaded and stored on this server (never hotlinked), so they keep working if the store changes its page. Store catalog shots usually float a small bottle in a large white canvas, so their white (or transparent) border is cropped with [sharp](https://sharp.pixelplumbing.com/) down to the bottle plus a 4% margin and capped at 1200px ([`catalog-photo.ts`](src/lib/catalog-photo.ts)); scanned labels are kept as taken. Photos can't be set by hand: a wine without one gets it the next time it is researched or refreshed.

Photos (store photos, scanned labels and `POST /ratings/:wineId/photo` tasting photos) are written to `UPLOADS_DIR` (created automatically on boot; `/data/uploads` in Docker) and served back through `GET /uploads/:key`. The database stores them as relative paths (`/uploads/<uuid>.jpg`) and the API returns absolute URLs built from the address each client called — the phone over Tailscale and the web app on localhost both get working links, and moving the server to a new address never breaks stored photos. Back up that directory (or the `uploads` volume) together with Postgres.

## Tests

```bash
pnpm --filter server test:unit          # pure logic, no DB required
pnpm --filter server test:integration   # needs DATABASE_URL pointing at a running, migrated Postgres
pnpm --filter server test               # both
pnpm --filter server test:coverage
```

Integration tests mock Resend and the research pipeline at the module boundary, the pipeline's unit tests mock SearXNG, page fetching and Ollama, and the exchange-rate tests stub `fetch` — no real network calls and no model needed.

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
  lib/                     prisma client, jwt, crypto, logger, HttpError; storage (local disk) and upload-urls
                           (relative photo paths made absolute per request); ollama (local model client),
                           web-search (SearXNG), web-page (fetch + JSON-LD/meta extraction), remote-image,
                           catalog-photo (border trimming), exchange-rates (Frankfurter)
  middleware/              auth, request validation, error handler
  modules/<name>/          routes + service + zod schemas per domain (auth, users, wines, cellar, wishlist, ratings, recent-views, tuya, account)
  modules/wines/           + research pipeline (wine-research), background jobs (research-jobs), stores
                           (wine-stores), photo checks (wine-photos), pricing (wine-pricing)
  openapi/                 shared Zod-to-OpenAPI registry, document builder
prompts/                  model prompts as plain Markdown (wine-identify.md, wine-extract.md), read at startup by modules/wines/wine-prompts.ts
prisma/                   schema.prisma + migrations
test/unit/                pure-logic tests
test/integration/         Supertest tests against a real Postgres
```

## Deploying on a homelab (Tailscale)

`docker-compose.yml` has no TLS termination — it's meant to sit behind Tailscale (Tailscale Serve, or your own reverse proxy) rather than being exposed directly. Point the mobile app's `EXPO_PUBLIC_API_URL` at your Tailscale MagicDNS name (e.g. `http://homelab:3000`) so it's reachable from outside your LAN without opening any ports.

The server needs outbound internet access to Resend, Tuya Cloud, `api.frankfurter.dev` and the web (SearXNG and store pages), plus Ollama on the host. Ollama runs natively rather than in the compose stack because containers on macOS can't use the GPU; on a Linux box with an NVIDIA GPU you could run the `ollama/ollama` image instead and point `OLLAMA_URL` at it.

### Backups

All state lives in two Docker volumes: `pgdata` (Postgres) and `uploads` (photos). Back up both together — photo URLs in the database point at files in `uploads`. The app's own export (`GET /account/export`) is a per-user JSON archive of the collection; it references photos by URL but does not include the image files.

## Upgrading

Migrations run automatically on container start, so upgrading is `git pull` + `docker compose up --build --remove-orphans` (`--remove-orphans` removes containers of services that were dropped from the compose file). Notes for specific changes:

### Local AI instead of OpenAI

Research and label reading moved from OpenAI to a local model on Ollama plus a SearXNG container. Before upgrading, install Ollama on the host and `ollama pull qwen3.5:9b` (see the root README), and set `SEARXNG_SECRET` in the root `.env`. Migration `20260926120000_local_llm_drop_openai` deletes every stored OpenAI API key and renames the photo source `GPT` to `WEB`. Later, `20260926160000_drop_manual_wine_photos` removed setting photos by hand (`PUT/POST /wines/:id/image`, `POST /wines/:id/image/search`); photos uploaded that way are kept as `LABEL_SCAN`, and older archives that say `GPT` or `MANUAL` still import. The search, label-scan and refresh endpoints now start research jobs (see above), so update the app together with the server.

### Photo URLs are relative, `PUBLIC_URL` is gone

Photos used to be saved as absolute URLs built from `PUBLIC_URL` — usually `http://localhost:3000`, which the phone can't reach, so they fell back to the illustration there. Migration `20260926140000_relative_upload_urls` rewrites stored URLs to `/uploads/<key>` paths and the API now builds absolute URLs from the address each client called. `PUBLIC_URL` can be deleted from `server/.env`. Store photos saved from now on also get their white border trimmed; photos saved earlier keep theirs.

### External scores removed, prices from store offers

Migration `20260925120000_store_offers_drop_guide_score` drops the `guideScore` column (the Vivino rating) and adds `offers`. Existing wines keep their previous `price` with no store list until they are refreshed (the refresh button on the wine screen, or `POST /wines/:id/refresh`). Archives exported before this change still import; their `guideScore` is ignored.
