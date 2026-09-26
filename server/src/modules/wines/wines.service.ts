import type { Prisma, Wine } from "../../generated/prisma/client.js";
import { trimCatalogPhoto } from "../../lib/catalog-photo.js";
import { getBrlRates } from "../../lib/exchange-rates.js";
import { HttpError } from "../../lib/http-error.js";
import type { DecodedImage } from "../../lib/image-payload.js";
import { prisma } from "../../lib/prisma.js";
import type { DownloadedImage } from "../../lib/remote-image.js";
import { publicUrlForImage, uploadImage } from "../../lib/storage.js";
import type { ReportStage } from "./research-jobs.js";
import { toWineOffers } from "./wine-pricing.js";
import {
  type ResearchedWine,
  researchWine,
  researchWineFromPhoto,
  researchWinesByQuery,
} from "./wine-research.js";
import { researchedWineToData, wineToDto } from "./wines.mapper.js";
import type { WineDto } from "./wines.schemas.js";

const DB_SEARCH_LIMIT = 20;

function searchLocalWines(query: string): Promise<Wine[]> {
  return prisma.wine.findMany({
    orderBy: { updatedAt: "desc" },
    take: DB_SEARCH_LIMIT,
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { winery: { contains: query, mode: "insensitive" } },
        { region: { contains: query, mode: "insensitive" } },
      ],
    },
  });
}

async function toWineData(
  wine: ResearchedWine
): Promise<Prisma.WineCreateInput> {
  const hasForeignListings = wine.listings.some(
    (listing) => listing.currency !== "BRL"
  );
  const rates = hasForeignListings ? await getBrlRates() : null;
  return researchedWineToData(wine, toWineOffers(wine.listings, rates));
}

/**
 * Stores a photo on this server (never hotlinked, so it survives the store
 * changing its page) and makes it the wine's picture.
 */
async function savePhoto(
  wine: Wine,
  photo: DownloadedImage,
  imageSource: "WEB" | "LABEL_SCAN"
): Promise<Wine> {
  // Store catalog shots get their white border cropped so the bottle fills
  // the frame; a scanned label is a real photo and is kept as taken.
  const prepared =
    imageSource === "WEB" ? await trimCatalogPhoto(photo) : photo;
  const imageUrl = publicUrlForImage(await uploadImage(prepared));
  return prisma.wine.update({
    data: { imageSource, imageUrl },
    where: { id: wine.id },
  });
}

/**
 * Gives a wine without a picture the store photo research verified. Wines
 * that already have one (from the web, a label scan or picked by hand) keep it.
 */
function attachStorePhoto(
  wine: Wine,
  photo: DownloadedImage | null
): Promise<Wine> {
  return wine.imageUrl || !photo
    ? Promise.resolve(wine)
    : savePhoto(wine, photo, "WEB");
}

function upsertWines(results: ResearchedWine[]): Promise<Wine[]> {
  return Promise.all(
    results.map(async (result) => {
      const data = await toWineData(result);
      const wine = await prisma.wine.upsert({
        create: data,
        update: data,
        where: { normalizedKey: data.normalizedKey },
      });
      return attachStorePhoto(wine, result.photo);
    })
  );
}

/** The local catalog only — web research is a separate, slow job. */
export async function searchWines(
  query: string
): Promise<{ results: WineDto[]; total: number }> {
  const results = (await searchLocalWines(query)).map(wineToDto);
  return { results, total: results.length };
}

export async function researchWines(
  query: string,
  report: ReportStage
): Promise<WineDto[]> {
  const wines = await upsertWines(await researchWinesByQuery(query, report));
  return wines.map(wineToDto);
}

/**
 * Identifies and researches the photographed wine. The label photo becomes
 * the wine's picture only when it still has none after research — a store's
 * catalog shot or a photo picked by hand wins.
 */
export async function identifyWineFromLabel(
  photo: DecodedImage,
  report: ReportStage
): Promise<WineDto[]> {
  const researched = await researchWineFromPhoto(photo.dataUri, report);
  if (researched.length === 0) {
    return [];
  }
  const wines = await upsertWines(researched);
  const withPhotos = await Promise.all(
    wines.map((wine) =>
      wine.imageUrl ? wine : savePhoto(wine, photo, "LABEL_SCAN")
    )
  );
  return withPhotos.map(wineToDto);
}

export async function findWineOrThrow(id: string): Promise<Wine> {
  const wine = await prisma.wine.findUnique({ where: { id } });
  if (!wine) {
    throw HttpError.notFound("Wine not found");
  }
  return wine;
}

export async function getWineDetails(id: string): Promise<WineDto> {
  return wineToDto(await findWineOrThrow(id));
}

export async function refreshWine(
  id: string,
  report: ReportStage
): Promise<WineDto> {
  const existing = await findWineOrThrow(id);
  const refined = await researchWine(
    {
      name: existing.name,
      producer: existing.winery,
      vintage: existing.vintage,
    },
    report
  );

  if (!refined) {
    throw HttpError.badRequest("Could not re-verify this wine on the web");
  }

  const data = await toWineData(refined);
  const updated = await prisma.wine.update({
    data: {
      ...data,
      imageSource: existing.imageSource,
      imageUrl: existing.imageUrl,
    },
    where: { id },
  });
  return wineToDto(await attachStorePhoto(updated, refined.photo));
}
