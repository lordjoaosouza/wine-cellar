import { env } from "../config/env.js";
import { withTimeout } from "./abort.js";
import { logger } from "./logger.js";

export interface WebSearchResult {
  content: string;
  title: string;
  url: string;
}

const SEARCH_TIMEOUT_MS = 15_000;

interface SearxngResponse {
  results?: { content?: string; title?: string; url?: string }[];
}

export async function searchWeb(
  query: string,
  options: { language?: string; signal?: AbortSignal } = {}
): Promise<WebSearchResult[]> {
  const url = new URL("/search", env.SEARXNG_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", options.language ?? "all");
  url.searchParams.set("safesearch", "0");

  try {
    const response = await fetch(url, {
      signal: withTimeout(options.signal, SEARCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn({ query, status: response.status }, "web search failed");
      return [];
    }
    const body = (await response.json()) as SearxngResponse;
    return (body.results ?? []).flatMap((result) =>
      result.url
        ? [
            {
              content: result.content ?? "",
              title: result.title ?? "",
              url: result.url,
            },
          ]
        : []
    );
  } catch (error) {
    if (options.signal?.aborted) {
      throw error;
    }
    logger.warn({ err: error, query }, "web search failed");
    return [];
  }
}
