import { apiClient } from "@/services/api-client";
import { createLocalCollection } from "@/services/local-store";
import type { WineCellarItem, WineSearchResult } from "@/types/wine";

const MAX_CELLAR = 80;
const MAX_QUANTITY = 99;

const cellarCache = createLocalCollection<WineCellarItem>({
  getId: (item) => item.id,
  key: "@wine-cellar:cellar-cache:v2",
  maxItems: MAX_CELLAR,
});

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(MAX_QUANTITY, Math.max(1, Math.round(value)));
}

export async function getCellar(): Promise<WineCellarItem[]> {
  try {
    const items = await apiClient.get<WineCellarItem[]>("/cellar");
    await cellarCache.saveMany(items);
    return items;
  } catch {
    return cellarCache.list();
  }
}

export async function getCellarItem(
  id: string
): Promise<WineCellarItem | null> {
  return (await getCellar()).find((item) => item.id === id) ?? null;
}

export function cellarBottleCount(items: WineCellarItem[]): number {
  return items.reduce((total, item) => total + clampQuantity(item.quantity), 0);
}

export async function addToCellar(
  wine: WineSearchResult,
  quantity = 1
): Promise<WineCellarItem[]> {
  const items = await apiClient.post<WineCellarItem[]>("/cellar", {
    quantity: clampQuantity(quantity),
    wineId: wine.id,
  });
  await cellarCache.saveMany(items);
  return items;
}

export async function updateCellarQuantity(
  wineId: string,
  quantity: number
): Promise<WineCellarItem[]> {
  const items = await apiClient.patch<WineCellarItem[]>(`/cellar/${wineId}`, {
    quantity: clampQuantity(quantity),
  });
  await cellarCache.saveMany(items);
  return items;
}

export async function removeFromCellar(id: string): Promise<WineCellarItem[]> {
  const items = await apiClient.delete<WineCellarItem[]>(`/cellar/${id}`);
  await cellarCache.saveMany(items);
  return items;
}
