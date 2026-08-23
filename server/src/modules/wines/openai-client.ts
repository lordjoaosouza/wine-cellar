import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { HttpError } from "../../lib/http-error.js";
import { getDecryptedOpenaiApiKey } from "../users/users.service.js";

export const MISSING_OPENAI_API_KEY_CODE = "missing_openai_api_key";
export const WINE_RESEARCH_MODEL = "gpt-4.1";

export async function getUserOpenAiClient(userId: string): Promise<OpenAI> {
  const apiKey = await getDecryptedOpenaiApiKey(userId);
  if (!apiKey) {
    throw HttpError.badRequestWithCode(
      MISSING_OPENAI_API_KEY_CODE,
      "No OpenAI API key is set. Add one in your profile to use search."
    );
  }
  return new OpenAI({ apiKey });
}

export function createResponse(
  client: OpenAI,
  params: ResponseCreateParamsNonStreaming
) {
  return client.responses.create(params);
}

const FENCED_JSON_PATTERN = /```(?:json)?\s*([\s\S]*?)```/i;

function extractJson(text: string): unknown {
  const fenced = text.match(FENCED_JSON_PATTERN);
  const candidate = fenced?.[1] ?? text;
  return JSON.parse(candidate.trim());
}

export function parseJsonResponse<T>(outputText: string): T {
  return extractJson(outputText) as T;
}
