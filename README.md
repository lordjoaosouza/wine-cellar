<p align="center">
  <img src="assets/images/icon.png" width="112" alt="Wine Cellar app icon">
</p>

<h1 align="center">Wine Cellar</h1>

<p align="center">
  A self-hosted, personal wine cellar for iOS, Android, and web.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-7A2B54" alt="MIT License">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript strict mode">
  <img src="https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white" alt="Expo SDK 57">
  <img src="https://img.shields.io/badge/Node-22%2B-339933?logo=node.js&logoColor=white" alt="Node 22+">
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 17">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker Compose">
</p>

Search wines — your own catalog first, web research by a local AI model as a fallback — track what's in your cellar and wishlist, rate what you've tasted, and watch your cellar's temperature and humidity via a Tuya sensor. The whole thing runs on hardware you own, AI included: a homelab box (or your Mac) behind [Tailscale](https://tailscale.com/), reachable from your phone with no public ports, no AI subscription and no third-party backend in between.

<p align="center">
  <img src="assets/demo.gif" width="280" alt="Wine Cellar app demo">
</p>

## Features

- **Wine search** — your own catalog first; anything new is researched on the web (wine stores and producer pages, via a self-hosted SearXNG) by a local model running on [Ollama](https://ollama.com/), deduplicated automatically. Research runs in the background and takes a minute or two per wine on a laptop; the app shows what it is doing.
- **Store prices** — prices come from real store listings (Brazilian stores first, stores abroad converted to BRL when no Brazilian store sells it), listed under "Where to buy" with each store's name and a link to its page.
- **Label scanner** — point the camera at a bottle and the local vision model reads the label to identify the wine.
- **Bottle photos** — new wines get a store's catalog photo, checked by the vision model to really show that wine and cropped so the bottle fills the frame; a scanned label is the fallback, an illustration of the wine's style the last resort. Photos are stored on your server.
- **Cellar & wishlist** — track what you own (with quantity) and what you want, synced across devices.
- **Tasting ratings** — a structured tasting form (score, intensity, balance, complexity, persistence, emotion and sensory notes) with an optional photo, validated field by field before saving. Your rating is the only score in the app — no Vivino or critic scores.
- **Cellar climate** — live temperature/humidity from a Tuya-connected sensor, checked against your target range.
- **Passwordless login** — a one-time code by email (via Resend), no passwords to manage.
- **Own your data** — no cloud AI: research and label reading run on your own machine. Tuya credentials are encrypted at rest; export/import your whole collection as a single archive.

## Architecture

```
 Expo app (iOS / Android / web)
        │  HTTPS (Tailscale)
        ▼
 Express API ──► Postgres
        ├──► Local disk (Docker volume) — label & tasting photos, served by the API
        ├──► Ollama (on the host, local model) — wine research, label reading
        ├──► SearXNG (container) — web search for stores and producer pages
        ├──► Tuya Cloud (per-user credentials) — cellar temp/humidity
        ├──► Frankfurter (ECB rates, no key) — converting store prices abroad to BRL
        └──► Resend — one-time login codes by email
```

Tuya credentials are stored per account, encrypted at rest. The server is the only thing that talks to Ollama, SearXNG, Tuya, Resend and Frankfurter — the app only ever talks to the server (plus store pages, when you tap a "Where to buy" link).

## Tech stack

| | |
| --- | --- |
| App | Expo (React Native + expo-router), TypeScript |
| API | Express 5, TypeScript (ESM) |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Photo storage | Local disk (a Docker volume), for label & tasting photos |
| Auth | Passwordless email one-time codes (Resend) + JWT access/refresh |
| AI | Local model on [Ollama](https://ollama.com/) (default `qwen3.5:9b`, text + vision) + [SearXNG](https://docs.searxng.org/) web search |
| IoT | Tuya Cloud OpenAPI — cellar sensor readings |
| Lint/format | [Biome](https://biomejs.dev/) via [Ultracite](https://www.ultracite.ai/) |
| Tests | Vitest + Supertest |

## Project structure

```
├── src/             Expo (React Native + expo-router) app
├── server/          Express + Prisma + Postgres API — see server/README.md
└── searxng/         SearXNG settings for the compose stack (JSON output on, limiter off)
```

## Quickstart

Install [Ollama](https://ollama.com/) on the machine that will run the stack and pull the model (6.6 GB) — it runs natively, outside Docker, so it can use the GPU:

```bash
brew install ollama && brew services start ollama   # or see ollama.com/download
ollama pull qwen3.5:9b
```

Then:

```bash
cp server/.env.example server/.env
# fill in JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY, RESEND_API_KEY, EMAIL_FROM
echo "SEARXNG_SECRET=$(openssl rand -hex 32)" > .env
docker compose up --build
```

This starts Postgres + SearXNG + the API on `http://localhost:3000` (Swagger docs at `/docs`, health check at `/health`), running migrations automatically; the API reaches Ollama on the host at `host.docker.internal:11434`. Photos are stored in the `uploads` volume. See [`server/README.md`](server/README.md) for details, environment variables, and running it without Docker.

Then run the app:

```bash
pnpm install
EXPO_PUBLIC_API_URL=http://localhost:3000 pnpm start
```

## Deploying on a homelab

`docker-compose.yml` doesn't terminate TLS itself — put it behind [Tailscale Serve](https://tailscale.com/kb/1312/serve) (or your own reverse proxy) so it's reachable from outside your LAN without exposing any ports publicly. Point the app at your Tailscale MagicDNS name (`EXPO_PUBLIC_API_URL=http://your-machine:3000`) instead of `localhost` — or skip the rebuild and just change it from the app itself (gear icon on the login screen, or Preferences → Server), since the API URL is also stored on-device and can be updated at runtime.

Back up the `pgdata` and `uploads` Docker volumes together — together they hold everything. Upgrading is `git pull` + `docker compose up --build --remove-orphans`; migrations run on start. See [`server/README.md`](server/README.md#upgrading) for notes on specific upgrades.

## Development

- **Package manager**: pnpm workspaces (`server` is a workspace package; the app lives at the repo root). Don't mix in npm/yarn — `pnpm-lock.yaml` is the only lockfile.
- **Lint/format**: `pnpm lint` / `pnpm format` at the root, or `pnpm --filter server lint` for the server only.
- **Tests**: `pnpm --filter server test` — see [`server/README.md`](server/README.md#tests) for unit vs. integration tests and the throwaway-database setup they need.

## License

MIT — see [LICENSE](LICENSE).
