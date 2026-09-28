# API

Base URL: the API's address (`http://localhost:3000` in the compose stack). Swagger UI at `/docs` is generated from the same Zod schemas the routes validate with, so it cannot drift from the code. Every route except `/auth/*`, `/health` and `/uploads/*` requires `Authorization: Bearer <accessToken>`.

## Errors

Every error is JSON: `{ "error": "message", "code"?: string, "details"?: unknown }`.

| Status | `code` | Meaning |
| --- | --- | --- |
| 400 | | Validation failed (`details` holds Zod issues) or a bad request |
| 400 | `model_without_vision` | The chosen model cannot read images |
| 401 | | Missing, invalid or expired token |
| 404 | | Not found, including another user's job |
| 409 | | Conflict, for example removing the active model |
| 429 | | Rate limited (`/auth/request-code`: 10 per 15 min per address; `/auth/verify-code`: 30) |
| 503 | `llm_unavailable` | Ollama did not answer |
| 503 | `llm_model_missing` | The active model is not installed on Ollama |

## Background jobs

Research and model downloads take longer than a phone keeps a request open, so they run as jobs. A job is started with a `202` and polled:

```json
{
  "id": "…",
  "status": "queued | running | done | failed | cancelled",
  "stage": "Checking stores for Catena Malbec",
  "progress": 0.46,
  "results": null,
  "error": null
}
```

`progress` runs from 0 to 1. Jobs run one at a time (the model cannot do two faster in parallel), live in memory and are forgotten an hour after finishing. `DELETE` cancels a queued or running job; the pipeline stops at its next checkpoint.

## Routes

### Auth

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/auth/request-code` | `{ email }` | Emails a 6-digit code; one per minute per email |
| POST | `/auth/verify-code` | `{ email, code }` | Returns `{ accessToken, refreshToken }` |
| POST | `/auth/refresh` | `{ refreshToken }` | Rotates the pair; the old refresh token is revoked |
| POST | `/auth/logout` | `{ refreshToken }` | Revokes |

### Health

`GET /health` → `{ status: "ok" | "degraded", checks: { database, ollama, searxng } }`. Answers 503 only when the database is down.

### Wines

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/wines/search?q=` | Catalog only. Tokens in any order, accents ignored, over name, producer, region, country, vintage and grapes. Falls back to the memo of an earlier research of the same query. Returns `{ results, total, source: "catalog" \| "memo" \| "none" }` |
| POST | `/wines/research` | `{ q }` → research job. Results are upserted into the catalog and the query is remembered |
| GET | `/wines/research/{jobId}` | Poll |
| DELETE | `/wines/research/{jobId}` | Cancel |
| POST | `/wines/identify-label` | `{ image }` (JPEG/PNG/WebP data URI up to 8 MB) → research job |
| GET | `/wines/{id}` | Full record with `offers`, `price`, `priceMarket` |
| POST | `/wines/{id}/refresh` | Re-researches the exact wine as a job; keeps its photo |

### Collections

| Area | Routes |
| --- | --- |
| Cellar | `GET /cellar`, `POST /cellar { wineId, quantity }`, `PATCH /cellar/{wineId} { quantity }`, `DELETE /cellar/{wineId}` |
| Wishlist | `GET /wishlist`, `POST /wishlist { wineId }`, `DELETE /wishlist/{wineId}` |
| Ratings | `GET /ratings`, `GET /ratings/{wineId}`, `PUT /ratings/{wineId}`, `POST /ratings/{wineId}/photo { image }`, `DELETE /ratings/{wineId}` |
| Recent views | `GET /recent-views`, `POST /recent-views/{wineId}`, `DELETE /recent-views` |

List routes return the full list after every change, so the app can replace its cache in one step.

### AI

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/ai/status` | | Ollama reachability and version, active model, research depth, and every model: curated ones, installed ones and the active one, each with `installed`, `active`, `vision`, sizes and a running `pull` if any |
| POST | `/ai/models/select` | `{ model }` | Activates an installed model at once (`{ activated: true }`) or starts a download that activates it when done (`{ activated: false, pull }`). Refuses models without image support |
| POST | `/ai/models/pull` | `{ model }` | Download without activating; `202` with the pull job |
| GET | `/ai/pulls/{jobId}` | | Pull job with `completedBytes`, `totalBytes`, `progress`, `stage` |
| DELETE | `/ai/pulls/{jobId}` | | Cancel a download |
| POST | `/ai/models/remove` | `{ model }` | Deletes the model from Ollama; the active one is protected |
| PATCH | `/ai/settings` | `{ researchProfile: "fast" \| "thorough" }` | Research depth |

Model names are validated against Ollama's `name[:tag]` shape (an optional `namespace/` prefix is allowed).

### Users, Tuya, account

| Area | Routes |
| --- | --- |
| Profile | `GET /users/me`, `PATCH /users/me { name?, avatarUrl?, targetTemperatureC?, targetHumidityPct? }` |
| Tuya credentials | `GET/PUT/DELETE /users/me/tuya` (the secret is encrypted and never returned) |
| Tuya | `GET /tuya/reading`, `POST /tuya/test { clientId, clientSecret, deviceId, region }` |
| Account | `GET /account/export`, `POST /account/import` (archive from export; older archives still import) |
| Uploads | `GET /uploads/{key}` (photos, immutable cache headers) |
