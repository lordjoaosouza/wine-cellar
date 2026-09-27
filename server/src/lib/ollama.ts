import { env } from "../config/env.js";
import { getSetting } from "./app-settings.js";
import { HttpError } from "./http-error.js";
import { logger } from "./logger.js";
import {
  OllamaClient,
  OllamaRequestError,
  OllamaUnavailableError,
} from "./ollama-client.js";

export const LLM_UNAVAILABLE_CODE = "llm_unavailable";
export const LLM_MODEL_MISSING_CODE = "llm_model_missing";

export const ollama = new OllamaClient(env.OLLAMA_URL);

export interface ChatJsonOptions {
  images?: string[] | undefined;
  model?: string | undefined;
  schema: object;
  signal?: AbortSignal | undefined;
  system: string;
  user: string;
}

export function llmUnavailableError(cause?: unknown): HttpError {
  return HttpError.serviceUnavailableWithCode(
    LLM_UNAVAILABLE_CODE,
    "The local AI model is not reachable. Check that Ollama is running.",
    cause
  );
}

export function llmModelMissingError(model: string): HttpError {
  return HttpError.serviceUnavailableWithCode(
    LLM_MODEL_MISSING_CODE,
    `The model "${model}" is not installed. Download it from the AI settings.`
  );
}

export function toLlmHttpError(error: unknown, model: string): unknown {
  if (error instanceof OllamaUnavailableError) {
    return llmUnavailableError(error);
  }
  if (error instanceof OllamaRequestError && error.notFound) {
    return llmModelMissingError(model);
  }
  if (error instanceof OllamaRequestError) {
    return llmUnavailableError(error);
  }
  return error;
}

export function getActiveModel(): Promise<string> {
  return getSetting("ai.activeModel");
}

export async function chatJson<T>(options: ChatJsonOptions): Promise<T> {
  const model = options.model ?? (await getActiveModel());
  let content: string;
  try {
    content = await ollama.chat(
      {
        format: options.schema,
        images: options.images,
        model,
        numCtx: env.LLM_CONTEXT_TOKENS,
        system: options.system,
        user: options.user,
      },
      options.signal
    );
  } catch (error) {
    throw toLlmHttpError(error, model);
  }
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    logger.warn({ content, err: error }, "local model returned invalid JSON");
    throw HttpError.badGateway("The local AI model returned an invalid reply");
  }
}

export async function warmUpModel(model?: string): Promise<boolean> {
  const target = model ?? (await getActiveModel());
  try {
    await ollama.load(target);
    logger.info({ model: target }, "model loaded");
    return true;
  } catch (error) {
    logger.warn({ err: error, model: target }, "model warm-up skipped");
    return false;
  }
}
