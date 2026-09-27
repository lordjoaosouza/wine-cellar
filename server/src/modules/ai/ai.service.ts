import { env } from "../../config/env.js";
import {
  getSetting,
  type ResearchProfileName,
  setSetting,
} from "../../lib/app-settings.js";
import { HttpError } from "../../lib/http-error.js";
import { logger } from "../../lib/logger.js";
import {
  getActiveModel,
  ollama,
  toLlmHttpError,
  warmUpModel,
} from "../../lib/ollama.js";
import {
  type OllamaModelInfo,
  OllamaRequestError,
  OllamaUnavailableError,
} from "../../lib/ollama-client.js";
import type { AiModelDto, AiStatusDto, PullJobDto } from "./ai.schemas.js";
import { catalogModel, MODEL_CATALOG } from "./model-catalog.js";
import { activePullFor, startModelPull } from "./model-pulls.js";

const STATUS_TIMEOUT_MS = 4000;
const visionCache = new Map<string, boolean>();

export function resetAiCaches(): void {
  visionCache.clear();
}

async function installedModels(): Promise<OllamaModelInfo[] | null> {
  try {
    return await ollama.listModels(AbortSignal.timeout(STATUS_TIMEOUT_MS));
  } catch (error) {
    if (error instanceof OllamaUnavailableError) {
      return null;
    }
    throw toLlmHttpError(error, "");
  }
}

async function supportsVision(model: string): Promise<boolean | null> {
  const cached = visionCache.get(model);
  if (cached !== undefined) {
    return cached;
  }
  try {
    const capabilities = await ollama.capabilities(
      model,
      AbortSignal.timeout(STATUS_TIMEOUT_MS)
    );
    const vision = capabilities.includes("vision");
    visionCache.set(model, vision);
    return vision;
  } catch (error) {
    if (error instanceof OllamaRequestError && error.notFound) {
      return false;
    }
    return null;
  }
}

async function describeModel(
  name: string,
  installed: OllamaModelInfo | null,
  activeModel: string
): Promise<AiModelDto> {
  const curated = catalogModel(name);
  return {
    active: name === activeModel,
    curated: curated !== null,
    description: curated?.description ?? null,
    downloadBytes: curated?.downloadBytes ?? null,
    installed: installed !== null,
    installedBytes: installed?.sizeBytes ?? null,
    label: curated?.label ?? name,
    memoryGb: curated?.memoryGb ?? null,
    name,
    pull: activePullFor(name),
    speed: curated?.speed ?? null,
    vision: installed ? await supportsVision(name) : null,
  };
}

export async function getAiStatus(): Promise<AiStatusDto> {
  const [activeModel, researchProfile, installed] = await Promise.all([
    getActiveModel(),
    getSetting("ai.researchProfile"),
    installedModels(),
  ]);
  const installedByName = new Map(
    (installed ?? []).map((model) => [model.name, model])
  );
  const names = [
    ...new Set([
      ...MODEL_CATALOG.map((model) => model.name),
      ...installedByName.keys(),
      activeModel,
    ]),
  ];
  const models = await Promise.all(
    names.map((name) =>
      describeModel(name, installedByName.get(name) ?? null, activeModel)
    )
  );
  let version: string | null = null;
  if (installed !== null) {
    version = await ollama
      .version(AbortSignal.timeout(STATUS_TIMEOUT_MS))
      .catch(() => null);
  }
  return {
    activeModel,
    activeModelInstalled: installedByName.has(activeModel),
    models,
    ollama: { reachable: installed !== null, url: env.OLLAMA_URL, version },
    researchProfile,
  };
}

async function activateModel(model: string): Promise<void> {
  const vision = await supportsVision(model);
  if (vision === false) {
    throw HttpError.badRequestWithCode(
      "model_without_vision",
      `"${model}" cannot read images, so it cannot scan labels or check photos. Pick a multimodal model.`
    );
  }
  await setSetting("ai.activeModel", model);
  logger.info({ model }, "active model changed");
  void warmUpModel(model);
}

export async function selectModel(
  model: string
): Promise<{ activated: boolean; pull: PullJobDto | null }> {
  const installed = await installedModels();
  if (installed === null) {
    throw toLlmHttpError(new OllamaUnavailableError(), model);
  }
  if (installed.some((entry) => entry.name === model)) {
    await activateModel(model);
    return { activated: true, pull: null };
  }
  return { activated: false, pull: startModelPull(model, activateModel) };
}

export function downloadModel(model: string): PullJobDto {
  return startModelPull(model, (pulled) => {
    visionCache.delete(pulled);
    return Promise.resolve();
  });
}

export async function removeModel(model: string): Promise<void> {
  const activeModel = await getActiveModel();
  if (model === activeModel) {
    throw HttpError.conflict(
      "Pick another model before removing the active one"
    );
  }
  try {
    await ollama.remove(model);
  } catch (error) {
    throw toLlmHttpError(error, model);
  }
  visionCache.delete(model);
}

export async function updateAiSettings(input: {
  researchProfile?: ResearchProfileName | undefined;
}): Promise<AiStatusDto> {
  if (input.researchProfile) {
    await setSetting("ai.researchProfile", input.researchProfile);
  }
  return getAiStatus();
}
