# Research pipeline

`server/src/modules/wines/wine-research.ts` turns a typed query or a label photo into catalog records. The code does the browsing; the model only reads and writes. Each step reports a stage and a progress share to the job the app polls.

## From a query

1. **Identify** (progress → 12%). Two SearXNG queries (`<q> vinho`, `<q> wine`), deduplicated. The model gets the typed text plus the top results and returns the specific wines the user most likely means, fixing typos (`prompts/wine-identify.md`). The depth preset caps how many.
2. **Per wine, in parallel** (the remaining 88% split evenly):
   1. **Stores** (→ 25% of the wine's share). Brazilian store searches (`<label> vinho preço`, `<label> comprar`); candidate pages are fetched and their JSON-LD `Product`/`Offer` or product meta tags read for name, price, currency and photo. Any shop counts; known stores (`wine-stores.ts`) are tried first and marketplaces never. Only when no Brazilian page has a BRL price are stores abroad searched. Producer and tech-sheet pages are fetched alongside as reading material.
   2. **Write-up** (→ 55%). The model receives the wine plus excerpts of those pages and returns the record (JSON-schema constrained: type from a closed 13-value enum, region, grapes, notes, pairings, producer and region profiles) and which store pages sell exactly this wine (`prompts/wine-extract.md`). Unconfirmed pages are dropped.
   3. **Photo check** (→ 95%). For the first confirmed pages the product photo is downloaded, downscaled and shown to the vision model, which reads the label and says whether it is this exact wine and a clean catalog shot. A photo of a different wine removes that store from the listings; a label that names the wine wins over the model's yes/no, so medal badges cannot get a correct store dropped. The first clean shot, else the first correct photo, becomes the wine's picture.
   4. **Price**. Computed in code from the confirmed listings (below).
3. **Save**. Wines are upserted by a normalized `producer + name + vintage` key, duplicates from the identify step are merged with their store listings pooled, the photo is stored on disk with its white border trimmed, and the query is remembered in `search_queries`.

## From a label photo

1. **Read** the label. The photo is EXIF-rotated and resized to 1024 px, and the model returns producer, name, vintage, whether the label was readable and a confidence.
2. **Double-check** a low-confidence reading: the read text goes through the identify step so the web can correct spelling. A high-confidence reading skips this and saves a model call.
3. Continue with the per-wine steps above. If the wine still has no store photo afterwards, the scanned label becomes its picture.

## Cancellation

The job's `AbortSignal` is threaded through every fetch (SearXNG, pages, images, Ollama). Between steps the pipeline checks the signal and stops; a cancelled job never writes to the catalog.

## Prices

The model never produces the displayed price. `wine-pricing.ts` computes it from the listings:

1. Brazilian (BRL) listings win whenever there is at least one.
2. Otherwise foreign listings are converted with the current rate from Frankfurter (ECB reference rates, cached 12 h, last good rates reused when offline). Only currencies Frankfurter converts are accepted.
3. One price is used as is; two are averaged; three or more use the median after discarding anything above double or below half of it.
4. Rounded to the nearest R$ 5 below R$ 100, R$ 10 up to R$ 999 and R$ 50 above, shown as `~R$ 1.350`.

Responses carry `price`, `offers` (store, country, URL, amount in the store's currency and in BRL) and `priceMarket` (`BR`, `INTERNATIONAL` or `null`).

## Photos

Order of preference, and a newer source never replaces an existing photo:

1. a store photo the vision model verified (`imageSource = WEB`), trimmed with sharp so the bottle fills the frame;
2. the scanned label (`LABEL_SCAN`);
3. an illustration of the wine's type, chosen by the app.

Photos are written to `UPLOADS_DIR`, stored as relative paths and served through `GET /uploads/:key` with immutable cache headers.

## Timings

Measured on an Apple M4 with 16 GB and `qwen3.5:9b` before the image downscaling: 15–25 s to identify, 50–65 s per write-up, about 20 s for two photo checks, 11–15 s per label read. Downscaling cuts the vision calls substantially; *Fast* depth halves the page work and checks one photo. Machines with more GPU memory bandwidth are faster, and a smaller model trades accuracy for speed.
