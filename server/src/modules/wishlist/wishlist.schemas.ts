import { z } from "zod";
import { wineSchema } from "../wines/wines.schemas.js";

export const addToWishlistSchema = z.object({
  wineId: z.string().min(1),
});

export const wineIdParamsSchema = z.object({ wineId: z.string().min(1) });

export const wishlistItemSchema = wineSchema.extend({
  savedAt: z.string(),
});

export type WishlistItemDto = z.infer<typeof wishlistItemSchema>;
