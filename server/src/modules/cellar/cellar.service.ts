import { HttpError } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { wineToDto } from "../wines/wines.mapper.js";
import { findWineOrThrow } from "../wines/wines.service.js";
import type { CellarItemDto } from "./cellar.schemas.js";

export async function listCellar(userId: string): Promise<CellarItemDto[]> {
  const items = await prisma.cellarItem.findMany({
    include: { wine: true },
    orderBy: { savedAt: "desc" },
    where: { userId },
  });
  return items.map((item) => ({
    ...wineToDto(item.wine),
    quantity: item.quantity,
    savedAt: item.savedAt.toISOString(),
  }));
}

export async function addToCellar(
  userId: string,
  wineId: string,
  quantity: number
): Promise<CellarItemDto[]> {
  await findWineOrThrow(wineId);

  await prisma.cellarItem.upsert({
    create: { quantity, userId, wineId },
    update: { quantity },
    where: { userId_wineId: { userId, wineId } },
  });

  return listCellar(userId);
}

export async function updateCellarQuantity(
  userId: string,
  wineId: string,
  quantity: number
): Promise<CellarItemDto[]> {
  const existing = await prisma.cellarItem.findUnique({
    where: { userId_wineId: { userId, wineId } },
  });
  if (!existing) {
    throw HttpError.notFound("Wine is not in your cellar");
  }
  await prisma.cellarItem.update({
    data: { quantity },
    where: { id: existing.id },
  });
  return listCellar(userId);
}

export async function removeFromCellar(
  userId: string,
  wineId: string
): Promise<CellarItemDto[]> {
  await prisma.cellarItem.deleteMany({ where: { userId, wineId } });
  return listCellar(userId);
}
