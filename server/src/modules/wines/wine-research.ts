import type OpenAI from "openai";
import {
  createResponse,
  parseJsonResponse,
  WINE_RESEARCH_MODEL,
} from "./openai-client.js";
import type { GptWineOffer } from "./wine-pricing.js";
import {
  LABEL_PHOTO_INSTRUCTIONS,
  WINE_RESULT_JSON_SCHEMA,
  WINE_SEARCH_SYSTEM_PROMPT,
} from "./wine-prompts.js";

const UNREADABLE_PATTERN = /^unreadable$/i;

export interface GptWineResult {
  country: string | null;
  grapes: string[];
  imageUrl: string | null;
  name: string;
  offers: GptWineOffer[];
  pairings: string[];
  producer: string | null;
  producerProfile: string | null;
  region: string | null;
  regionProfile: string | null;
  tastingNotes: string | null;
  type: string | null;
  vintage: string | null;
}

async function runResearch(
  client: OpenAI,
  input: string
): Promise<GptWineResult[]> {
  const response = await createResponse(client, {
    input,
    instructions: WINE_SEARCH_SYSTEM_PROMPT,
    model: WINE_RESEARCH_MODEL,
    text: {
      format: {
        name: "wine_search_results",
        schema: WINE_RESULT_JSON_SCHEMA,
        type: "json_schema",
      },
    },
    tools: [{ type: "web_search" }],
  });

  const parsed = parseJsonResponse<{ results?: GptWineResult[] }>(
    response.output_text
  );
  return Array.isArray(parsed.results) ? parsed.results : [];
}

export function researchWinesByQuery(
  client: OpenAI,
  query: string
): Promise<GptWineResult[]> {
  return runResearch(client, `User query: "${query.trim()}"`);
}

export function researchWineRefine(
  client: OpenAI,
  wine: { name: string; producer: string | null; vintage: string | null }
): Promise<GptWineResult[]> {
  const input = `Re-verify and refresh every detail for exactly this wine: "${wine.name}"${wine.producer ? ` by ${wine.producer}` : ""}${wine.vintage ? `, vintage ${wine.vintage}` : ""}. Return exactly one result for this same wine — do not suggest alternatives.`;
  return runResearch(client, input);
}

async function identifyFromLabelPhoto(
  client: OpenAI,
  imageDataUri: string
): Promise<string | null> {
  const response = await createResponse(client, {
    input: [
      {
        content: [
          {
            text: "Identify this wine from its label photo.",
            type: "input_text",
          },
          { detail: "auto", image_url: imageDataUri, type: "input_image" },
        ],
        role: "user",
      },
    ],
    instructions: LABEL_PHOTO_INSTRUCTIONS,
    model: WINE_RESEARCH_MODEL,
  });

  const text = response.output_text.trim();
  if (!text || UNREADABLE_PATTERN.test(text)) {
    return null;
  }
  return text;
}

export async function researchWineFromPhoto(
  client: OpenAI,
  imageDataUri: string
): Promise<GptWineResult[]> {
  const identified = await identifyFromLabelPhoto(client, imageDataUri);
  if (!identified) {
    return [];
  }

  const input = `The user photographed a wine label and it reads: ${identified}. Treat this as the search query — find this exact wine (the specific vintage if one was read off the label, otherwise treat vintage as unspecified per the VINTAGE rule), verifying every field via web search as usual. Only return close alternatives instead if you cannot verify this exact wine exists.`;
  return runResearch(client, input);
}
