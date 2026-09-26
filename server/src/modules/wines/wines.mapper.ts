import type { Prisma, Wine } from "../../generated/prisma/client.js";
import { stripLinks, wineNormalizedKey } from "./wine-normalize.js";
import { agingNotesFor, servingNotesFor } from "./wine-notes.js";
import {
  priceFromOffers,
  type WineOffer,
  wineOffersFromJson,
} from "./wine-pricing.js";
import type { ResearchedWine } from "./wine-research.js";
import type { WineDto } from "./wines.schemas.js";

export function researchedWineToData(
  result: ResearchedWine,
  offers: WineOffer[]
): Prisma.WineCreateInput {
  return {
    agingNotes: agingNotesFor(result.type, result.grapes),
    country: result.country,
    grapes: result.grapes,
    name: result.name,
    normalizedKey: wineNormalizedKey(
      result.producer,
      result.name,
      result.vintage
    ),
    offers,
    pairings: result.pairings,
    price: priceFromOffers(offers).price,
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
  const offers = wineOffersFromJson(wine.offers);
  return {
    agingNotes: wine.agingNotes,
    country: wine.country,
    grapes: wine.grapes,
    id: wine.id,
    imageSource: wine.imageSource,
    imageUrl: wine.imageUrl,
    name: wine.name,
    offers,
    pairings: wine.pairings,
    price: wine.price,
    priceMarket: priceFromOffers(offers).market,
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
