import type { Prisma, Wine } from "../../generated/prisma/client.js";
import { getSetting } from "../../lib/app-settings.js";
import { trimCatalogPhoto } from "../../lib/catalog-photo.js";
import { getBrlRates } from "../../lib/exchange-rates.js";
import { HttpError } from "../../lib/http-error.js";
import type { DecodedImage } from "../../lib/image-payload.js";
import { prisma } from "../../lib/prisma.js";
import type { DownloadedImage } from "../../lib/remote-image.js";
import { publicUrlForImage, uploadImage } from "../../lib/storage.js";
import { idleContext, type ResearchContext } from "./research-jobs.js";
import { researchProfile } from "./research-profiles.js";
import { recallSearch, rememberSearch } from "./search-memo.js";
import { toWineOffers } from "./wine-pricing.js";
import {
  type ResearchedWine,
  type ResearchOptions,
  researchWine,
  researchWineFromPhoto,
  researchWinesByQuery,
} from "./wine-research.js";
import { searchTokens } from "./wine-search-text.js";
import { researchedWineToData, wineToDto } from "./wines.mapper.js";
import type { WineDto, WineSearchResponseDto } from "./wines.schemas.js";

const DB_SEARCH_LIMIT = 20;

function searchLocalWines(query: string): Promise<Wine[]> {
  const tokens = searchTokens(query);
  if (tokens.length === 0) {
    return Promise.resolve([]);
  }
  return prisma.wine.findMany({
    orderBy: { updatedAt: "desc" },
    take: DB_SEARCH_LIMIT,
    where: {
      AND: tokens.map((token) => ({ searchText: { contains: token } })),
    },
  });
}

async function rememberedWines(query: string): Promise<Wine[]> {
  const ids = await recallSearch(query);
  if (!ids || ids.length === 0) {
    return [];
  }
  const wines = await prisma.wine.findMany({ where: { id: { in: ids } } });
  return ids.flatMap((id) => wines.filter((wine) => wine.id === id));
}

async function researchOptions(
  context: ResearchContext = idleContext()
): Promise<ResearchOptions> {
  return {
    context,
    profile: researchProfile(await getSetting("ai.researchProfile")),
  };
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

async function savePhoto(
  wine: Wine,
  photo: DownloadedImage,
  imageSource: "WEB" | "LABEL_SCAN"
): Promise<Wine> {
  const prepared =
    imageSource === "WEB" ? await trimCatalogPhoto(photo) : photo;
  const imageUrl = publicUrlForImage(await uploadImage(prepared));
  return prisma.wine.update({
    data: { imageSource, imageUrl },
    where: { id: wine.id },
  });
}

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

export async function searchWines(
  query: string
): Promise<WineSearchResponseDto> {
  const local = await searchLocalWines(query);
  if (local.length > 0) {
    const results = local.map(wineToDto);
    return { results, source: "catalog", total: results.length };
  }
  const remembered = (await rememberedWines(query)).map(wineToDto);
  return {
    results: remembered,
    source: remembered.length > 0 ? "memo" : "none",
    total: remembered.length,
  };
}

export async function researchWines(
  query: string,
  context: ResearchContext
): Promise<WineDto[]> {
  const wines = await upsertWines(
    await researchWinesByQuery(query, await researchOptions(context))
  );
  await rememberSearch(
    query,
    wines.map((wine) => wine.id)
  );
  return wines.map(wineToDto);
}

export async function identifyWineFromLabel(
  photo: DecodedImage,
  context: ResearchContext
): Promise<WineDto[]> {
  const researched = await researchWineFromPhoto(
    photo.buffer,
    await researchOptions(context)
  );
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
  context: ResearchContext
): Promise<WineDto> {
  const existing = await findWineOrThrow(id);
  const refined = await researchWine(
    {
      name: existing.name,
      producer: existing.winery,
      vintage: existing.vintage,
    },
    await researchOptions(context)
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
