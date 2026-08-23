import type { Prisma, Wine } from "../../generated/prisma/client.js";
import { stripLinks, wineNormalizedKey } from "./wine-normalize.js";
import {
  agingNotesFor,
  normalizeGuideScore,
  servingNotesFor,
} from "./wine-notes.js";
import type { GptWineResult } from "./wine-research.js";
import type { WineDto } from "./wines.schemas.js";

export function gptResultToWineData(
  result: GptWineResult
): Prisma.WineCreateInput {
  return {
    agingNotes: agingNotesFor(result.type, result.grapes),
    country: result.country,
    grapes: result.grapes,
    guideScore: normalizeGuideScore(result.guideScore),
    name: result.name,
    normalizedKey: wineNormalizedKey(
      result.producer,
      result.name,
      result.vintage
    ),
    pairings: result.pairings,
    price: result.price,
    producerProfile: result.producerProfile,
    region: result.region,
    regionProfile: result.regionProfile,
    servingNotes: servingNotesFor(result.type),
    tastingNotes: result.tastingNotes,
    type: result.type,
    vintage: result.vintage,
    winery: result.producer,
  };
}

export function wineToDto(wine: Wine): WineDto {
  return {
    agingNotes: wine.agingNotes,
    country: wine.country,
    grapes: wine.grapes,
    guideScore: wine.guideScore,
    id: wine.id,
    imageSource: wine.imageSource,
    imageUrl: wine.imageUrl,
    name: wine.name,
    pairings: wine.pairings,
    price: wine.price,
    producerProfile: stripLinks(wine.producerProfile),
    region: wine.region,
    regionProfile: stripLinks(wine.regionProfile),
    servingNotes: wine.servingNotes,
    tastingNotes: stripLinks(wine.tastingNotes),
    type: wine.type,
    vintage: wine.vintage,
    winery: wine.winery,
  };
}
