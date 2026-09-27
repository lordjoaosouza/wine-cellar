import { ApiError, apiClient } from "@/services/api-client";
import {
  type FollowJobOptions,
  followJob,
  isUnavailableCode,
  type JobSnapshot,
} from "@/services/jobs";
import { createLocalCollection } from "@/services/local-store";
import type {
  Wine,
  WineDetail,
  WineRecentView,
  WineSearchResponse,
  WineSearchResult,
} from "@/types/wine";
import { toImageDataUri } from "@/utils/image-data-uri";

export class ResearchUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ResearchUnavailableError";
  }
}

export type ResearchOptions = FollowJobOptions;

interface ResearchJob extends JobSnapshot {
  results: Wine[] | null;
}

interface CatalogSearchResponse {
  results: Wine[];
  source: "catalog" | "memo" | "none";
  total: number;
}

const MAX_CACHED_WINES = 300;
const MAX_RECENT_VIEWS = 8;

const wineCache = createLocalCollection<Wine>({
  getId: (wine) => wine.id,
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

function researchPath(id: string): string {
  return `/wines/research/${id}`;
}

async function runResearch(
  start: () => Promise<ResearchJob>,
  options: ResearchOptions
): Promise<Wine[]> {
  try {
    const job = await followJob(await start(), researchPath, options);
    const results = job.results ?? [];
    await wineCache.saveMany(results);
    return results;
  } catch (error) {
    if (isUnavailableCode(error)) {
      throw new ResearchUnavailableError(
        error instanceof Error ? error.message : "The AI model is unavailable",
        { cause: error }
      );
    }
    throw error;
  }
}

export interface CatalogSearch extends WineSearchResponse {
  source: CatalogSearchResponse["source"];
}

export async function searchCatalog(query: string): Promise<CatalogSearch> {
  const params = new URLSearchParams({ q: query.trim() });
  const response = await apiClient.get<CatalogSearchResponse>(
    `/wines/search?${params.toString()}`
  );
  if (response.results.length > 0) {
    await wineCache.saveMany(response.results);
  }
  return {
    results: response.results.map(toSearchResult),
    source: response.source,
    total: response.total,
  };
}

export async function researchWinesOnWeb(
  query: string,
  options: ResearchOptions = {}
): Promise<WineSearchResponse> {
  const wines = await runResearch(
    () => apiClient.post<ResearchJob>("/wines/research", { q: query.trim() }),
    options
  );
  return { results: wines.map(toSearchResult), total: wines.length };
}

export async function searchWines(
  query: string,
  options: ResearchOptions = {}
): Promise<WineSearchResponse> {
  const local = await searchCatalog(query);
  if (local.results.length > 0) {
    return { results: local.results, total: local.total };
  }
  return researchWinesOnWeb(query, options);
}

export async function identifyWineFromLabel(
  imageUri: string,
  options: ResearchOptions = {}
): Promise<WineSearchResponse> {
  const image = await toImageDataUri(imageUri);
  const wines = await runResearch(
    () => apiClient.post<ResearchJob>("/wines/identify-label", { image }),
    options
  );
  return { results: wines.map(toSearchResult), total: wines.length };
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

export async function refreshWine(
  wine: { id: string },
  options: ResearchOptions = {}
): Promise<WineDetail | null> {
  const [updated] = await runResearch(
    () => apiClient.post<ResearchJob>(`/wines/${wine.id}/refresh`),
    options
  );
  return updated ?? null;
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
