import { z } from "zod";
import { wineSchema } from "../wines/wines.schemas.js";

const intensityScoreSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const upsertRatingSchema = z.object({
  balance: intensityScoreSchema,
  complexity: intensityScoreSchema,
  conclusion: z.string().trim().min(1),
  emotion: intensityScoreSchema,
  intensity: intensityScoreSchema,
  nose: z.string().trim().min(1),
  palate: z.string().trim().min(1),
  persistence: intensityScoreSchema,
  score: z.number().min(0).max(10),
  visual: z.string().trim().min(1),
});

export const wineIdParamsSchema = z.object({ wineId: z.string().min(1) });

export const ratingSchema = wineSchema.extend({
  balance: intensityScoreSchema,
  complexity: intensityScoreSchema,
  conclusion: z.string(),
  emotion: intensityScoreSchema,
  intensity: intensityScoreSchema,
  nose: z.string(),
  palate: z.string(),
  persistence: intensityScoreSchema,
  photoUrl: z.string().nullable(),
  savedAt: z.string(),
  score: z.number(),
  visual: z.string(),
  wineId: z.string(),
});

export type UpsertRatingInput = z.infer<typeof upsertRatingSchema>;
export type RatingDto = z.infer<typeof ratingSchema>;
