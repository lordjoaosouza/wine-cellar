import { prisma } from "../../lib/prisma.js";
import { wineToDto } from "../wines/wines.mapper.js";
import { findWineOrThrow } from "../wines/wines.service.js";
import type { RecentViewDto } from "./recent-views.schemas.js";

const MAX_RECENT_VIEWS = 8;

export async function listRecentViews(
  userId: string
): Promise<RecentViewDto[]> {
  const views = await prisma.recentView.findMany({
    include: { wine: true },
    orderBy: { viewedAt: "desc" },
    take: MAX_RECENT_VIEWS,
    where: { userId },
  });
  return views.map((view) => ({
    ...wineToDto(view.wine),
    viewedAt: view.viewedAt.toISOString(),
  }));
}

export async function recordRecentView(
  userId: string,
  wineId: string
): Promise<RecentViewDto[]> {
  await findWineOrThrow(wineId);

  await prisma.recentView.upsert({
    create: { userId, wineId },
    update: { viewedAt: new Date() },
    where: { userId_wineId: { userId, wineId } },
  });

  const stale = await prisma.recentView.findMany({
    orderBy: { viewedAt: "desc" },
    select: { id: true },
    skip: MAX_RECENT_VIEWS,
    where: { userId },
  });
  if (stale.length > 0) {
    await prisma.recentView.deleteMany({
      where: { id: { in: stale.map((entry) => entry.id) } },
    });
  }

  return listRecentViews(userId);
}

export async function clearRecentViews(userId: string): Promise<void> {
  await prisma.recentView.deleteMany({ where: { userId } });
}
