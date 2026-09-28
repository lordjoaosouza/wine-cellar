import { apiClient } from "@/services/api-client";
import { createLocalCollection } from "@/services/local-store";
import type { WineSearchResult, WineWishlistItem } from "@/types/wine";

const MAX_WISHLIST = 80;

const wishlistCache = createLocalCollection<WineWishlistItem>({
  getId: (item) => item.id,
  key: "@wine-cellar:wishlist-cache:v2",
  maxItems: MAX_WISHLIST,
});

export async function getWishlist(): Promise<WineWishlistItem[]> {
  try {
    const items = await apiClient.get<WineWishlistItem[]>("/wishlist");
    await wishlistCache.saveMany(items);
    return items;
  } catch {
    return wishlistCache.list();
  }
}

export async function isOnWishlist(id: string): Promise<boolean> {
  return (await getWishlist()).some((item) => item.id === id);
}

export async function addToWishlist(
  wine: WineSearchResult
): Promise<WineWishlistItem[]> {
  const items = await apiClient.post<WineWishlistItem[]>("/wishlist", {
    wineId: wine.id,
  });
  await wishlistCache.saveMany(items);
  return items;
}

export async function removeFromWishlist(
  id: string
): Promise<WineWishlistItem[]> {
  const items = await apiClient.delete<WineWishlistItem[]>(`/wishlist/${id}`);
  await wishlistCache.saveMany(items);
  return items;
}

export async function toggleWishlist(
  wine: WineSearchResult
): Promise<{ saved: boolean; items: WineWishlistItem[] }> {
  if (await isOnWishlist(wine.id)) {
    return { items: await removeFromWishlist(wine.id), saved: false };
  }
  return { items: await addToWishlist(wine), saved: true };
}
