import { prisma } from "../../lib/prisma.js";
import { wineToDto } from "../wines/wines.mapper.js";
import { findWineOrThrow } from "../wines/wines.service.js";
import type { WishlistItemDto } from "./wishlist.schemas.js";

export async function listWishlist(userId: string): Promise<WishlistItemDto[]> {
  const items = await prisma.wishlistItem.findMany({
    include: { wine: true },
    orderBy: { savedAt: "desc" },
    where: { userId },
  });
  return items.map((item) => ({
    ...wineToDto(item.wine),
    savedAt: item.savedAt.toISOString(),
  }));
}

export async function addToWishlist(
  userId: string,
  wineId: string
): Promise<WishlistItemDto[]> {
  await findWineOrThrow(wineId);

  await prisma.wishlistItem.upsert({
    create: { userId, wineId },
    update: {},
    where: { userId_wineId: { userId, wineId } },
  });

  return listWishlist(userId);
}

export async function removeFromWishlist(
  userId: string,
  wineId: string
): Promise<WishlistItemDto[]> {
  await prisma.wishlistItem.deleteMany({ where: { userId, wineId } });
  return listWishlist(userId);
}
