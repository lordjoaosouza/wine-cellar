# Architecture

Wine Cellar is a pnpm workspace with two packages: the Expo app at the repository root and the Express API in `server/`. Both are strict TypeScript, linted by Biome through Ultracite, and free of code comments by convention: names, types and tests carry the meaning.

## Layers on the server

```
src/
  app.ts, server.ts        composition root: middleware, routers, health, shutdown
  config/env.ts            environment parsed once with Zod
  lib/                     infrastructure and shared kernel
    ollama-client.ts         Ollama HTTP adapter (tags, show, pull stream, delete, chat, load)
    ollama.ts                language-model facade: active model + JSON-constrained chat
    app-settings.ts          typed key/value settings on Postgres with an in-memory cache
    job-queue.ts             generic background job queue (progress, cancellation, retention)
    web-search.ts, web-page.ts, remote-image.ts   SearXNG, page parsing, image download
    image-prep.ts, catalog-photo.ts                sharp pipelines
    storage.ts, upload-urls.ts                     photo files and relative URLs
    health.ts, http-error.ts, jwt.ts, crypto.ts, logger.ts, prisma.ts
  middleware/              auth, validation, rate limit, error handler
  modules/<feature>/       routes (HTTP + OpenAPI) → service (use cases) → mapper/schemas
  openapi/                 shared registry, security scheme, response helpers
prompts/                   model prompts as Markdown
prisma/                    schema and migrations
```

Dependencies point inwards: `modules` depend on `lib`, never the other way round. `lib` never imports a module. A feature module owns its routes, schemas, service and any domain helpers (`modules/wines/` also owns the research pipeline, pricing, stores and photo checks). Routes stay thin: they validate, call a service and shape the response.

### The wines module

| File | Responsibility |
| --- | --- |
| `wines.routes.ts` | HTTP surface for search, research jobs, label scan, details and refresh |
| `wines.service.ts` | Use cases: catalog search with memo, research → upsert → photo attachment |
| `wine-research.ts` | The research pipeline (identify → stores → sources → write-up → photo check) |
| `research-profiles.ts` | Strategy objects: `fast` and `thorough` presets that size every stage |
| `research-jobs.ts` | Research-specific view over the generic job queue |
| `search-memo.ts` | Remembers which wines a query produced |
| `wine-search-text.ts` | Tokenization and the precomputed `searchText` column |
| `wine-pricing.ts`, `wine-stores.ts`, `wine-photos.ts`, `wine-notes.ts`, `wine-normalize.ts` | Deterministic domain logic, all unit-tested |

### The AI module

| File | Responsibility |
| --- | --- |
| `model-catalog.ts` | Curated multimodal models with size, speed and memory needs |
| `model-pulls.ts` | Model downloads as jobs on the generic queue, with byte counts |
| `ai.service.ts` | Status (catalog ∪ installed ∪ active), selection with download-then-activate, removal, research depth |
| `ai.routes.ts`, `ai.schemas.ts` | HTTP surface and DTOs |

## Patterns in use

- **Ports and adapters.** `OllamaClient` is the only code that knows Ollama's HTTP shape; tests inject a fake `fetch`. Services depend on the `ollama` facade and on `chatJson`, which resolves the active model from settings so callers never carry a model name.
- **Strategy.** Research depth is a `ResearchProfile` object chosen per run; the pipeline reads counts and excerpt sizes from it instead of constants.
- **Job queue with observer-style progress.** `JobQueue<T>` runs one job at a time, exposes `report(stage, progress)` and an `AbortSignal` to the runner, and keeps finished jobs for an hour. Research jobs and model downloads are two thin projections over the same class.
- **Repository-style settings.** `getSetting`/`setSetting` validate every value with Zod on both read and write, so a bad row degrades to the default instead of crashing.
- **Mappers.** Prisma rows never leave a module: `wines.mapper.ts` and `ratings.mapper.ts` turn them into DTOs validated by the same Zod schemas that generate the OpenAPI document.
- **Errors as values at the edge.** `HttpError` carries a status and an optional machine-readable `code` (`llm_unavailable`, `llm_model_missing`, `model_without_vision`) that the app switches on.

## Layers in the app

```
src/
  app/            expo-router screens (thin: state + composition)
  components/     presentational and interaction components
  services/       API access, local caches, job following
  hooks/          screen-level hooks
  utils/          pure helpers (formatting, validation), unit-tested with Vitest
  types/          DTOs mirrored from the server
```

Screens talk to `services/`, which wrap `api-client.ts` (token refresh, error mapping) and keep AsyncStorage caches so lists still open offline. `services/jobs.ts` follows any server job with progress callbacks and an `AbortSignal`; cancelling deletes the job on the server. Search, label scanning, refresh and model downloads all reuse it.

## Data

- `wines.searchText`: a normalized concatenation of name, producer, region, country, vintage and grapes, filled by the mapper and by account imports, indexed for token search.
- `search_queries`: normalized query → wine ids from the last research of that query.
- `app_settings`: `ai.activeModel` and `ai.researchProfile` today; new keys are added in `lib/app-settings.ts` with a schema and a default.
- Photos are stored as relative `/uploads/<uuid>.<ext>` paths and made absolute per request, so the same record works from the phone over Tailscale and from a browser on localhost.

## Web build

The web target exports as a single-page app (`web.output: "single"` in `app.json`). Static pre-rendering produced server-side layouts with zero widths that survived hydration; the app is fully client-side behind login, so a SPA is the right shape. The header and tab bar are `position: fixed` on web so they stay on screen when the document scrolls.
