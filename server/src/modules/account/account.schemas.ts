import { z } from "zod";
import { ratingSchema } from "../ratings/ratings.schemas.js";
import { wineSchema } from "../wines/wines.schemas.js";

export const accountArchiveSchema = z.object({
  cellar: z.array(
    z.object({
      quantity: z.number().int(),
      savedAt: z.string(),
      wineId: z.string(),
    })
  ),
  exportedAt: z.string(),
  profile: z.object({
    avatarUrl: z.string().nullable(),
    name: z.string().nullable(),
    targetHumidityPct: z.number(),
    targetTemperatureC: z.number(),
  }),
  ratings: z.array(ratingSchema),
  recentViews: z.array(z.object({ viewedAt: z.string(), wineId: z.string() })),
  version: z.literal(1),
  wines: z.array(wineSchema),
  wishlist: z.array(z.object({ savedAt: z.string(), wineId: z.string() })),
});

export type AccountArchive = z.infer<typeof accountArchiveSchema>;
