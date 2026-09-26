import { env } from "../config/env.js";
import { HttpError } from "./http-error.js";
import { logger } from "./logger.js";

export const LLM_UNAVAILABLE_CODE = "llm_unavailable";

// Generous: a 9B model on a laptop can take a minute on a long prompt.
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
// Keep the model loaded between searches instead of reloading it each time.
const KEEP_ALIVE = "30m";

export interface ChatJsonOptions {
  /** Base64 images (no data: prefix) attached to the user message. */
  images?: string[];
  /** JSON schema the reply is constrained to. */
  schema: object;
  system: string;
  user: string;
}

interface OllamaChatResponse {
  message?: { content?: string };
}

function unavailable(cause: unknown): HttpError {
  logger.warn({ err: cause }, "local model request failed");
  return HttpError.serviceUnavailableWithCode(
    LLM_UNAVAILABLE_CODE,
    "The local AI model is not reachable. Check that Ollama is running and the model is pulled."
  );
}

async function chat(body: object): Promise<string> {
  let response: Response;
  try {
    response = await fetch(new URL("/api/chat", env.OLLAMA_URL), {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw unavailable(error);
  }
  if (!response.ok) {
    throw unavailable(
      new Error(`Ollama ${response.status}: ${await response.text()}`)
    );
  }
  const payload = (await response.json()) as OllamaChatResponse;
  return payload.message?.content ?? "";
}

/**
 * One-shot chat whose reply is constrained to `schema` (Ollama structured
 * outputs), with thinking disabled and temperature 0 so repeated runs agree.
 */
export async function chatJson<T>(options: ChatJsonOptions): Promise<T> {
  const content = await chat({
    format: options.schema,
    keep_alive: KEEP_ALIVE,
    messages: [
      { content: options.system, role: "system" },
      {
        content: options.user,
        role: "user",
        ...(options.images ? { images: options.images } : {}),
      },
    ],
    model: env.LLM_MODEL,
    options: { num_ctx: env.LLM_CONTEXT_TOKENS, temperature: 0 },
    stream: false,
    think: false,
  });
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    logger.warn({ content, err: error }, "local model returned invalid JSON");
    throw HttpError.badGateway("The local AI model returned an invalid reply");
  }
}
