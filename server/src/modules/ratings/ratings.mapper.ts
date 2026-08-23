import type { Rating, Wine } from "../../generated/prisma/client.js";
import { wineToDto } from "../wines/wines.mapper.js";
import type { RatingDto } from "./ratings.schemas.js";

export function ratingToDto(rating: Rating & { wine: Wine }): RatingDto {
  return {
    ...wineToDto(rating.wine),
    balance: rating.balance as RatingDto["balance"],
    complexity: rating.complexity as RatingDto["complexity"],
    conclusion: rating.conclusion,
    emotion: rating.emotion as RatingDto["emotion"],
    intensity: rating.intensity as RatingDto["intensity"],
    nose: rating.nose,
    palate: rating.palate,
    persistence: rating.persistence as RatingDto["persistence"],
    photoUrl: rating.photoUrl,
    savedAt: rating.savedAt.toISOString(),
    score: rating.score,
    visual: rating.visual,
    wineId: rating.wineId,
  };
}

export function ratingFieldsFromDto(rating: RatingDto) {
  const {
    wineId,
    savedAt,
    score,
    balance,
    complexity,
    intensity,
    persistence,
    emotion,
    visual,
    nose,
    palate,
    conclusion,
    photoUrl,
  } = rating;
  return {
    balance,
    complexity,
    conclusion,
    emotion,
    intensity,
    nose,
    palate,
    persistence,
    photoUrl,
    savedAt,
    score,
    visual,
    wineId,
  };
}
