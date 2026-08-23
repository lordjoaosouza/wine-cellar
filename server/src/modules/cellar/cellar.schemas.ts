import { z } from "zod";
import { wineSchema } from "../wines/wines.schemas.js";

export const addToCellarSchema = z.object({
  quantity: z.number().int().min(1).max(99).default(1),
  wineId: z.string().min(1),
});

export const updateCellarQuantitySchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

export const wineIdParamsSchema = z.object({ wineId: z.string().min(1) });

export const cellarItemSchema = wineSchema.extend({
  quantity: z.number().int(),
  savedAt: z.string(),
});

export type CellarItemDto = z.infer<typeof cellarItemSchema>;
