import { HttpError } from "../../lib/http-error.js";
import type { DecodedImage } from "../../lib/image-payload.js";
import { prisma } from "../../lib/prisma.js";
import { publicUrlForImage, uploadImage } from "../../lib/storage.js";
import { findWineOrThrow } from "../wines/wines.service.js";
import { ratingToDto } from "./ratings.mapper.js";
import type { RatingDto, UpsertRatingInput } from "./ratings.schemas.js";

export async function listRatings(userId: string): Promise<RatingDto[]> {
  const ratings = await prisma.rating.findMany({
    include: { wine: true },
    orderBy: { savedAt: "desc" },
    where: { userId },
  });
  return ratings.map(ratingToDto);
}

export async function getRating(
  userId: string,
  wineId: string
): Promise<RatingDto | null> {
  const rating = await prisma.rating.findUnique({
    include: { wine: true },
    where: { userId_wineId: { userId, wineId } },
  });
  return rating ? ratingToDto(rating) : null;
}

export async function upsertRating(
  userId: string,
  wineId: string,
  input: UpsertRatingInput
): Promise<RatingDto> {
  await findWineOrThrow(wineId);

  const rating = await prisma.rating.upsert({
    create: { userId, wineId, ...input },
    include: { wine: true },
    update: input,
    where: { userId_wineId: { userId, wineId } },
  });
  return ratingToDto(rating);
}

export async function setRatingPhoto(
  userId: string,
  wineId: string,
  file: DecodedImage
): Promise<RatingDto> {
  const existing = await prisma.rating.findUnique({
    where: { userId_wineId: { userId, wineId } },
  });
  if (!existing) {
    throw HttpError.notFound("Rate this wine before attaching a photo");
  }
  const key = await uploadImage(file);
  const rating = await prisma.rating.update({
    data: { photoUrl: publicUrlForImage(key) },
    include: { wine: true },
    where: { id: existing.id },
  });
  return ratingToDto(rating);
}

export async function removeRating(
  userId: string,
  wineId: string
): Promise<void> {
  await prisma.rating.deleteMany({ where: { userId, wineId } });
}
