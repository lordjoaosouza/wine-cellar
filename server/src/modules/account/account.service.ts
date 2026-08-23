import { prisma } from "../../lib/prisma.js";
import { ratingFieldsFromDto, ratingToDto } from "../ratings/ratings.mapper.js";
import { wineNormalizedKey } from "../wines/wine-normalize.js";
import { wineToDto } from "../wines/wines.mapper.js";
import type { WineDto } from "../wines/wines.schemas.js";
import type { AccountArchive } from "./account.schemas.js";

function wineDtoToPrismaData(wine: WineDto) {
  const { id: _id, ...rest } = wine;
  return {
    ...rest,
    normalizedKey: wineNormalizedKey(wine.winery, wine.name, wine.vintage),
  };
}

export async function exportAccount(userId: string): Promise<AccountArchive> {
  const [user, cellar, wishlist, ratings, recentViews] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.cellarItem.findMany({ include: { wine: true }, where: { userId } }),
    prisma.wishlistItem.findMany({
      include: { wine: true },
      where: { userId },
    }),
    prisma.rating.findMany({ include: { wine: true }, where: { userId } }),
    prisma.recentView.findMany({ include: { wine: true }, where: { userId } }),
  ]);

  const wineById = new Map<string, ReturnType<typeof wineToDto>>();
  for (const item of [...cellar, ...wishlist, ...ratings, ...recentViews]) {
    wineById.set(item.wine.id, wineToDto(item.wine));
  }

  return {
    cellar: cellar.map((item) => ({
      quantity: item.quantity,
      savedAt: item.savedAt.toISOString(),
      wineId: item.wineId,
    })),
    exportedAt: new Date().toISOString(),
    profile: {
      avatarUrl: user.avatarUrl,
      name: user.name,
      targetHumidityPct: user.targetHumidityPct,
      targetTemperatureC: user.targetTemperatureC,
    },
    ratings: ratings.map(ratingToDto),
    recentViews: recentViews.map((view) => ({
      viewedAt: view.viewedAt.toISOString(),
      wineId: view.wineId,
    })),
    version: 1,
    wines: [...wineById.values()],
    wishlist: wishlist.map((item) => ({
      savedAt: item.savedAt.toISOString(),
      wineId: item.wineId,
    })),
  };
}

export async function importAccount(
  userId: string,
  archive: AccountArchive
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const wine of archive.wines) {
      const data = wineDtoToPrismaData(wine);
      // biome-ignore lint/performance/noAwaitInLoops: writes share one interactive transaction connection and must run sequentially
      await tx.wine.upsert({
        create: { id: wine.id, ...data },
        update: data,
        where: { id: wine.id },
      });
    }

    await tx.user.update({
      data: {
        avatarUrl: archive.profile.avatarUrl,
        name: archive.profile.name,
        targetHumidityPct: archive.profile.targetHumidityPct,
        targetTemperatureC: archive.profile.targetTemperatureC,
      },
      where: { id: userId },
    });

    for (const item of archive.cellar) {
      // biome-ignore lint/performance/noAwaitInLoops: writes share one interactive transaction connection and must run sequentially
      await tx.cellarItem.upsert({
        create: {
          quantity: item.quantity,
          savedAt: new Date(item.savedAt),
          userId,
          wineId: item.wineId,
        },
        update: { quantity: item.quantity, savedAt: new Date(item.savedAt) },
        where: { userId_wineId: { userId, wineId: item.wineId } },
      });
    }

    for (const item of archive.wishlist) {
      // biome-ignore lint/performance/noAwaitInLoops: writes share one interactive transaction connection and must run sequentially
      await tx.wishlistItem.upsert({
        create: {
          savedAt: new Date(item.savedAt),
          userId,
          wineId: item.wineId,
        },
        update: { savedAt: new Date(item.savedAt) },
        where: { userId_wineId: { userId, wineId: item.wineId } },
      });
    }

    for (const rating of archive.ratings) {
      const { wineId, savedAt, ...fields } = ratingFieldsFromDto(rating);
      // biome-ignore lint/performance/noAwaitInLoops: writes share one interactive transaction connection and must run sequentially
      await tx.rating.upsert({
        create: { savedAt: new Date(savedAt), userId, wineId, ...fields },
        update: { savedAt: new Date(savedAt), ...fields },
        where: { userId_wineId: { userId, wineId } },
      });
    }

    for (const view of archive.recentViews) {
      // biome-ignore lint/performance/noAwaitInLoops: writes share one interactive transaction connection and must run sequentially
      await tx.recentView.upsert({
        create: {
          userId,
          viewedAt: new Date(view.viewedAt),
          wineId: view.wineId,
        },
        update: { viewedAt: new Date(view.viewedAt) },
        where: { userId_wineId: { userId, wineId: view.wineId } },
      });
    }
  });
}
