# Deployment

## Compose stack

`docker-compose.yml` starts Postgres, SearXNG and the API. Ollama runs on the host.

```bash
cp server/.env.example server/.env
# fill in JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY, RESEND_API_KEY, EMAIL_FROM
echo "SEARXNG_SECRET=$(openssl rand -hex 32)" > .env
docker compose up --build
```

The API container reaches Ollama at `host.docker.internal:11434` (mapped to the host gateway on Linux too) and SearXNG at `searxng:8080`. Photos live in the `uploads` volume at `/data/uploads`; the database in `pgdata`.

## Environment variables

Root `.env` (read by compose):

| Variable | Purpose |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Database credentials (defaults: `wine_cellar`) |
| `SEARXNG_SECRET` | Secret for the SearXNG container |
| `OLLAMA_URL` | Override where the API reaches Ollama |

`server/.env`:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | set by compose | Postgres connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | yes | | At least 32 characters each (`openssl rand -base64 48`) |
| `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` | no | `15m`, `30d` | Token lifetimes |
| `ENCRYPTION_KEY` | yes | | 32 bytes base64 (`openssl rand -base64 32`); encrypts Tuya secrets with AES-256-GCM |
| `RESEND_API_KEY`, `EMAIL_FROM` | yes | | Login codes by email |
| `OLLAMA_URL` | no | `http://localhost:11434` | Ollama address |
| `LLM_MODEL` | no | `qwen3.5:9b` | Model used until one is picked in the app |
| `LLM_CONTEXT_TOKENS` | no | `8192` | Context window |
| `SEARXNG_URL` | no | `http://localhost:8888` | SearXNG with JSON output enabled |
| `UPLOADS_DIR` | no | `uploads` | Photo directory (`/data/uploads` in Docker) |
| `CORS_ORIGINS` | no | any | Comma-separated browser origins for the web app |
| `PORT` | no | `3000` | HTTP port |

## Reaching it from your phone

The stack does not terminate TLS. Put it behind [Tailscale Serve](https://tailscale.com/kb/1312/serve) or your own reverse proxy and point the app at the MagicDNS name, either at build time (`EXPO_PUBLIC_API_URL`) or from the app (gear icon on the login screen, or Preferences → API server). The API trusts loopback and private proxies for the scheme and host it uses in photo URLs.

Outbound access needed by the server: Resend, Tuya Cloud, `api.frankfurter.dev`, the web (through SearXNG and store pages) and Ollama on the host.

## Health

`GET /health` reports the database, Ollama and SearXNG separately and returns `degraded` when one is down. Point an uptime monitor at it; the app's AI screen shows the same Ollama state.

## Backups

Everything lives in two volumes: `pgdata` and `uploads`. Back them up together, since photo paths in the database point at files in `uploads`. `GET /account/export` is a per-user JSON archive of the collection that references photos by URL without the files. Model files belong to Ollama on the host and are re-downloadable from the app.

## Upgrading

```bash
git pull
docker compose up --build --remove-orphans
```

Migrations run on container start. Notes for specific versions:

- **AI settings, search memo, token search** (`20260927120000_ai_settings_search_memo`): adds `wines.searchText` (backfilled for existing rows), `search_queries` and `app_settings`. The model chosen in the app is stored in `app_settings`; `LLM_MODEL` becomes the default only. Update the app together with the server: search responses gained `source`, jobs gained `progress` and a `cancelled` status, and the web build is now a single-page export.
- **Local AI instead of OpenAI** (`20260926120000_local_llm_drop_openai`): install Ollama and set `SEARXNG_SECRET`. Stored OpenAI keys are deleted and the photo source `GPT` becomes `WEB`.
- **Relative photo URLs** (`20260926140000_relative_upload_urls`): `PUBLIC_URL` is gone; stored URLs became `/uploads/<key>` paths.
- **Store offers** (`20260925120000_store_offers_drop_guide_score`): the Vivino score column was dropped; wines keep their price until refreshed.
