# AI models

All model work runs on [Ollama](https://ollama.com/) on the machine that hosts the API. One multimodal model does everything: it turns search results into specific wines, writes the catalog record from fetched pages, reads label photos and checks that a store's product photo shows the right bottle. The API is the only client of Ollama; the app never talks to it.

## Picking a model in the app

Preferences → **AI model** shows:

- whether Ollama answered, its version and address;
- the model in use and a warning if it is not installed;
- **Research depth**: *Fast* or *Thorough* (below);
- a card per model with its size, speed class and memory needs. *Use this model* switches at once when it is installed; *Download and use* starts a download on the server, shows bytes and a percentage, can be cancelled, and activates the model when the download finishes. Installed models that are not in use can be removed to free disk;
- a field for any other Ollama model name.

A model without image support is refused with a clear message, because it could not scan labels or verify photos.

Switching warms the new model up (Ollama loads it into memory) so the next search does not pay the cold start. The API also warms the active model up when it boots.

## Curated list

| Model | Download | RAM | Speed | Notes |
| --- | --- | --- | --- | --- |
| `gemma3:4b` | 3.3 GB | 6 GB | fastest | Reads clear labels well; shorter write-ups |
| `qwen2.5vl:3b` | 3.2 GB | 6 GB | fastest | Vision model tuned for text in photos |
| `qwen3.5:9b` | 6.6 GB | 12 GB | balanced | Default; the best all-rounder on a 16 GB machine |
| `qwen2.5vl:7b` | 6 GB | 10 GB | balanced | Strong on angled or glared labels |
| `gemma3:12b` | 8.1 GB | 16 GB | balanced | Better producer and region write-ups |
| `llama3.2-vision:11b` | 7.8 GB | 16 GB | accurate | Accurate reading; slower research |
| `gemma3:27b` | 17 GB | 32 GB | accurate | Needs a large machine or a GPU |

Sizes are the Ollama defaults (4-bit quantizations) and can shift with new tags. The list lives in `server/src/modules/ai/model-catalog.ts`.

## Research depth

| | Fast | Thorough |
| --- | --- | --- |
| Wines identified per query | 2 | 4 |
| Store pages fetched / kept | 5 / 3 | 8 / 4 |
| Producer or tech-sheet pages | 1 | 2 |
| Photo checks per wine | 1 | 2 |
| Page excerpt in the prompt | 450 / 1200 chars | 700 / 1800 chars |

Fast roughly halves the time of a search on the same model. Presets are in `server/src/modules/wines/research-profiles.ts`.

## What makes a search faster

Beyond the model choice and depth, the pipeline itself was tuned so the model does less work per wine:

- Images are downscaled before they reach the vision model (768 px for store photos, 1024 px for label scans, EXIF-rotated). Image tokens dominate vision prompts, so this is the single largest saving on label reads and photo checks.
- The catalog search matches tokens in any order over more fields, and remembered queries answer without a model call, so far fewer searches fall through to research.
- Requests carry an abort signal end to end: cancelling a search frees the model at the next checkpoint instead of after the whole pipeline.
- The model stays loaded between requests (`keep_alive: 30m`) and is warmed up on boot and on switch.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `OLLAMA_URL` | `http://localhost:11434` (`http://host.docker.internal:11434` in Docker) | Where the API reaches Ollama |
| `LLM_MODEL` | `qwen3.5:9b` | The model used until one is chosen in the app; the choice is stored in the database |
| `LLM_CONTEXT_TOKENS` | `8192` | Context window per request |

## Running Ollama

Ollama runs natively rather than in the compose stack because containers on macOS cannot use the GPU. On Linux with an NVIDIA GPU the `ollama/ollama` image works too; point `OLLAMA_URL` at it. Model files live in Ollama's own directory (`~/.ollama` by default), not in the app's volumes.
