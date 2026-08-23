import { z } from "zod";
import { WINE_TYPES } from "./wine-prompts.js";

export const wineTypeSchema = z.enum(WINE_TYPES);

export const wineSchema = z.object({
  agingNotes: z.string().nullable(),
  country: z.string().nullable(),
  grapes: z.array(z.string()),
  guideScore: z.number().nullable(),
  id: z.string(),
  imageSource: z.enum(["GPT", "LABEL_SCAN", "MANUAL"]).nullable(),
  imageUrl: z.string().nullable(),
  name: z.string(),
  pairings: z.array(z.string()),
  price: z.string().nullable(),
  producerProfile: z.string().nullable(),
  region: z.string().nullable(),
  regionProfile: z.string().nullable(),
  servingNotes: z.string().nullable(),
  tastingNotes: z.string().nullable(),
  type: z.string().nullable(),
  vintage: z.string().nullable(),
  winery: z.string().nullable(),
});

export const wineSearchQuerySchema = z.object({
  q: z.string().trim().min(1),
  refresh: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

export const wineSearchResponseSchema = z.object({
  results: z.array(wineSchema),
  total: z.number(),
});

export const wineIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const setWineImageUrlSchema = z.object({
  imageUrl: z.string().url(),
});

export type WineDto = z.infer<typeof wineSchema>;
