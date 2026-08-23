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

export class MissingApiKeyError extends Error {
  constructor(options?: ErrorOptions) {
    super(
      "No OpenAI API key is set. Add one in Profile to use search.",
      options
    );
    this.name = "MissingApiKeyError";
  }
}

const MAX_CACHED_WINES = 300;
const MAX_RECENT_VIEWS = 8;

const wineCache = createLocalCollection<Wine>({
  getId: (wine) => wine.id,
  key: "@wine-cellar:wine-cache:v2",
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
    guideScore: wine.guideScore,
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

async function mapMissingApiKey<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.code === "missing_openai_api_key") {
      // biome-ignore lint/style/useErrorCause: MissingApiKeyError forwards `cause` to Error via super()
      throw new MissingApiKeyError({ cause: error });
    }
    throw error;
  }
}

export function searchWines(
  query: string,
  options?: { refresh?: boolean }
): Promise<WineSearchResponse> {
  return mapMissingApiKey(async () => {
    const params = new URLSearchParams({ q: query.trim() });
    if (options?.refresh) {
      params.set("refresh", "true");
    }
    const response = await apiClient.get<{ results: Wine[]; total: number }>(
      `/wines/search?${params.toString()}`
    );
    await wineCache.saveMany(response.results);
    return {
      results: response.results.map(toSearchResult),
      total: response.total,
    };
  });
}

export function identifyWineFromLabel(
  imageUri: string
): Promise<WineSearchResponse> {
  return mapMissingApiKey(async () => {
    const results = await apiClient.post<Wine[]>("/wines/identify-label", {
      image: await toImageDataUri(imageUri),
    });
    await wineCache.saveMany(results);
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

export function refreshWine(wine: { id: string }): Promise<WineDetail | null> {
  return mapMissingApiKey(async () => {
    const updated = await apiClient.post<Wine>(`/wines/${wine.id}/refresh`);
    await wineCache.save(updated);
    return updated;
  });
}

export async function setWineImageUrl(
  id: string,
  imageUrl: string
): Promise<WineDetail> {
  const updated = await apiClient.put<Wine>(`/wines/${id}/image`, { imageUrl });
  await wineCache.save(updated);
  return updated;
}

export async function uploadWineImage(
  id: string,
  fileUri: string
): Promise<WineDetail> {
  const updated = await apiClient.post<Wine>(`/wines/${id}/image`, {
    image: await toImageDataUri(fileUri),
  });
  await wineCache.save(updated);
  return updated;
}

export function searchWineImageWithGpt(id: string): Promise<WineDetail> {
  return mapMissingApiKey(async () => {
    const updated = await apiClient.post<Wine>(`/wines/${id}/image/search`);
    await wineCache.save(updated);
    return updated;
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
