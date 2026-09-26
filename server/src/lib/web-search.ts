import { env } from "../config/env.js";
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

/**
 * Runs one query against the self-hosted SearXNG instance. Failures are
 * logged and return no results — a search that finds nothing is handled the
 * same way upstream.
 */
export async function searchWeb(
  query: string,
  options: { language?: string } = {}
): Promise<WebSearchResult[]> {
  const url = new URL("/search", env.SEARXNG_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", options.language ?? "all");
  url.searchParams.set("safesearch", "0");

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
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
    logger.warn({ err: error, query }, "web search failed");
    return [];
  }
}
