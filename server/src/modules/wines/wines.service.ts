import type { Prisma, Wine } from "../../generated/prisma/client.js";
import { getBrlRates } from "../../lib/exchange-rates.js";
import { HttpError } from "../../lib/http-error.js";
import type { DecodedImage } from "../../lib/image-payload.js";
import { prisma } from "../../lib/prisma.js";
import { publicUrlForImage, uploadImage } from "../../lib/storage.js";
import { getUserOpenAiClient } from "./openai-client.js";
import { findWineImageUrl } from "./wine-image-search.js";
import { toWineOffers } from "./wine-pricing.js";
import {
  type GptWineResult,
  researchWineFromPhoto,
  researchWineRefine,
  researchWinesByQuery,
} from "./wine-research.js";
import { gptResultToWineData, wineToDto } from "./wines.mapper.js";
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
  result: GptWineResult
): Promise<Prisma.WineCreateInput> {
  const hasForeignOffers = result.offers.some(
    (offer) => offer.currency !== "BRL"
  );
  const rates = hasForeignOffers ? await getBrlRates() : null;
  return gptResultToWineData(result, toWineOffers(result.offers, rates));
}

function upsertWines(results: GptWineResult[]): Promise<Wine[]> {
  return Promise.all(
    results.map(async (result) => {
      const data = await toWineData(result);
      return prisma.wine.upsert({
        create: data,
        update: data,
        where: { normalizedKey: data.normalizedKey },
      });
    })
  );
}

export async function searchWines(
  userId: string,
  query: string,
  forceRefresh: boolean
): Promise<{ results: WineDto[]; total: number; source: "database" | "gpt" }> {
  if (!forceRefresh) {
    const local = await searchLocalWines(query);
    if (local.length > 0) {
      const results = local.map(wineToDto);
      return { results, source: "database", total: results.length };
    }
  }

  const client = await getUserOpenAiClient(userId);
  const gptResults = await researchWinesByQuery(client, query);
  const wines = await upsertWines(gptResults);
  const results = wines.map(wineToDto);
  return { results, source: "gpt", total: results.length };
}

export async function identifyWineFromLabel(
  userId: string,
  imageDataUri: string
): Promise<WineDto[]> {
  const client = await getUserOpenAiClient(userId);
  const gptResults = await researchWineFromPhoto(client, imageDataUri);
  if (gptResults.length === 0) {
    return [];
  }
  const wines = await upsertWines(gptResults);
  return wines.map(wineToDto);
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

export async function refreshWineFromGpt(
  userId: string,
  id: string
): Promise<WineDto> {
  const existing = await findWineOrThrow(id);
  const client = await getUserOpenAiClient(userId);
  const [refined] = await researchWineRefine(client, {
    name: existing.name,
    producer: existing.winery,
    vintage: existing.vintage,
  });

  if (!refined) {
    throw HttpError.badRequest("GPT could not re-verify this wine");
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
  return wineToDto(updated);
}

export async function setWineImageUrl(
  id: string,
  imageUrl: string
): Promise<WineDto> {
  await findWineOrThrow(id);
  const updated = await prisma.wine.update({
    data: { imageSource: "MANUAL", imageUrl },
    where: { id },
  });
  return wineToDto(updated);
}

export async function setWineImageFile(
  id: string,
  file: DecodedImage
): Promise<WineDto> {
  await findWineOrThrow(id);
  const key = await uploadImage(file);
  return setWineImageUrl(id, publicUrlForImage(key));
}

export async function searchWineImageWithGpt(
  userId: string,
  id: string
): Promise<WineDto> {
  const existing = await findWineOrThrow(id);
  const client = await getUserOpenAiClient(userId);
  const imageUrl = await findWineImageUrl(client, {
    name: existing.name,
    producer: existing.winery,
    vintage: existing.vintage,
  });

  if (!imageUrl) {
    return wineToDto(existing);
  }

  const updated = await prisma.wine.update({
    data: { imageSource: "GPT", imageUrl },
    where: { id },
  });
  return wineToDto(updated);
}
