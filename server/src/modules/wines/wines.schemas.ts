import { z } from "zod";
import { wineOfferSchema } from "./wine-pricing.js";
import { WINE_TYPES } from "./wine-prompts.js";

export const wineTypeSchema = z.enum(WINE_TYPES);

const LEGACY_IMAGE_SOURCES: Record<string, string> = {
  GPT: "WEB",
  MANUAL: "LABEL_SCAN",
};

export const wineSchema = z.object({
  agingNotes: z.string().nullable(),
  country: z.string().nullable(),
  grapes: z.array(z.string()),
  id: z.string(),
  imageSource: z
    // Archives exported by older versions still say "GPT" (found by GPT) or
    // "MANUAL" (uploaded by hand, since removed).
    .preprocess(
      (value) => LEGACY_IMAGE_SOURCES[value as string] ?? value,
      z.enum(["WEB", "LABEL_SCAN"])
    )
    .nullable(),
  imageUrl: z.string().nullable(),
  name: z.string(),
  // Defaulted so archives exported before offers existed still import.
  offers: z.array(wineOfferSchema).default([]),
  pairings: z.array(z.string()),
  price: z.string().nullable(),
  priceMarket: z.enum(["BR", "INTERNATIONAL"]).nullable().default(null),
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
});

export const wineResearchBodySchema = z.object({
  q: z.string().trim().min(1),
});

export const researchJobParamsSchema = z.object({
  jobId: z.string().min(1),
});

export const researchJobSchema = z.object({
  error: z
    .object({ code: z.string().nullable(), message: z.string() })
    .nullable(),
  id: z.string(),
  results: z.array(wineSchema).nullable(),
  stage: z
    .string()
    .describe(
      'Human-readable progress, e.g. "Checking stores for Catena Malbec"'
    ),
  status: z.enum(["queued", "running", "done", "failed"]),
});

export const wineSearchResponseSchema = z.object({
  results: z.array(wineSchema),
  total: z.number(),
});

export const wineIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type WineDto = z.infer<typeof wineSchema>;
