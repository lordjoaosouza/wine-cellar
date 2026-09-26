import { ApiError, apiClient } from "@/services/api-client";
import { createLocalCollection } from "@/services/local-store";
import type {
  Wine,
  WineDetail,
  WineRecentView,
  WineSearchResponse,
  WineSearchResult,
} from "@/types/wine";
import { toImageDataUri } from "@/utils/image-data-uri";

/** The server's local AI model (Ollama) is down or its model isn't pulled. */
export class ResearchUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ResearchUnavailableError";
  }
}

/** Human-readable research progress, e.g. "Checking stores for Catena Malbec". */
export type ResearchProgress = (stage: string) => void;

interface ResearchJob {
  error: { code: string | null; message: string } | null;
  id: string;
  results: Wine[] | null;
  stage: string;
  status: "queued" | "running" | "done" | "failed";
}

const POLL_INTERVAL_MS = 2000;
// A research job runs on a local model and can queue behind others.
const MAX_WAIT_MS = 15 * 60 * 1000;

const MAX_CACHED_WINES = 300;
const MAX_RECENT_VIEWS = 8;

const wineCache = createLocalCollection<Wine>({
  getId: (wine) => wine.id,
  // v3: wines gained `offers`; older cached entries lack it.
  key: "@wine-cellar:wine-cache:v3",
  maxItems: MAX_CACHED_WINES,
});

const recentViewsCache = createLocalCollection<WineRecentView>({
  getId: (view) => view.id,
  key: "@wine-cellar:recent-views-cache:v2",
  maxItems: MAX_RECENT_VIEWS,
});

function toSearchResult(wine: Wine): WineSearchResult {
  return {
    country: wine.country,
    id: wine.id,
    imageSource: wine.imageSource,
    imageUrl: wine.imageUrl,
    name: wine.name,
    region: wine.region,
    type: wine.type,
    vintage: wine.vintage,
    winery: wine.winery,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Follows a research job the server started until it finishes, reporting its
 * stage along the way. Research runs on the server's local AI model and
 * takes a minute or more per wine.
 */
async function followResearchJob(
  started: ResearchJob,
  onProgress?: ResearchProgress
): Promise<Wine[]> {
  const deadline = Date.now() + MAX_WAIT_MS;
  let job = started;
  while (job.status === "queued" || job.status === "running") {
    onProgress?.(job.stage);
    if (Date.now() > deadline) {
      throw new Error("The search took too long. Try again in a moment.");
    }
    // biome-ignore lint/performance/noAwaitInLoops: polling is sequential by nature
    await wait(POLL_INTERVAL_MS);
    job = await apiClient.get<ResearchJob>(`/wines/research/${job.id}`);
  }
  if (job.status === "failed") {
    const message = job.error?.message ?? "The search failed.";
    throw job.error?.code === "llm_unavailable"
      ? new ResearchUnavailableError(message)
      : new Error(message);
  }
  const results = job.results ?? [];
  await wineCache.saveMany(results);
  return results;
}

async function asResearchError<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.code === "llm_unavailable") {
      throw new ResearchUnavailableError(error.message, { cause: error });
    }
    throw error;
  }
}

/** Your catalog first; when nothing there matches, research on the web. */
export async function searchWines(
  query: string,
  onProgress?: ResearchProgress
): Promise<WineSearchResponse> {
  const params = new URLSearchParams({ q: query.trim() });
  const local = await apiClient.get<{ results: Wine[]; total: number }>(
    `/wines/search?${params.toString()}`
  );
  let wines = local.results;
  if (wines.length > 0) {
    await wineCache.saveMany(wines);
  } else {
    wines = await asResearchError(async () =>
      followResearchJob(
        await apiClient.post<ResearchJob>("/wines/research", {
          q: query.trim(),
        }),
        onProgress
      )
    );
  }
  return { results: wines.map(toSearchResult), total: wines.length };
}

export function identifyWineFromLabel(
  imageUri: string,
  onProgress?: ResearchProgress
): Promise<WineSearchResponse> {
  return asResearchError(async () => {
    const results = await followResearchJob(
      await apiClient.post<ResearchJob>("/wines/identify-label", {
        image: await toImageDataUri(imageUri),
      }),
      onProgress
    );
    return { results: results.map(toSearchResult), total: results.length };
  });
}

export async function getWineDetails(id: string): Promise<WineDetail | null> {
  try {
    const wine = await apiClient.get<Wine>(`/wines/${id}`);
    await wineCache.save(wine);
    return wine;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    return wineCache.get(id);
  }
}

export function refreshWine(
  wine: { id: string },
  onProgress?: ResearchProgress
): Promise<WineDetail | null> {
  return asResearchError(async () => {
    const [updated] = await followResearchJob(
      await apiClient.post<ResearchJob>(`/wines/${wine.id}/refresh`),
      onProgress
    );
    return updated ?? null;
  });
}

export async function getRecentViews(): Promise<WineRecentView[]> {
  try {
    const views = await apiClient.get<WineRecentView[]>("/recent-views");
    await recentViewsCache.saveMany(views);
    return views;
  } catch {
    return recentViewsCache.list();
  }
}

export async function saveRecentView(wine: {
  id: string;
}): Promise<WineRecentView[]> {
  const views = await apiClient.post<WineRecentView[]>(
    `/recent-views/${wine.id}`
  );
  await recentViewsCache.saveMany(views);
  return views;
}

export async function clearRecentViews(): Promise<void> {
  await apiClient.delete("/recent-views");
  await recentViewsCache.clear();
}
