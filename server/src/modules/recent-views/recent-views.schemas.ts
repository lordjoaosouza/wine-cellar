import { z } from "zod";
import { wineSchema } from "../wines/wines.schemas.js";

export const wineIdParamsSchema = z.object({ wineId: z.string().min(1) });

export const recentViewSchema = wineSchema.extend({
  viewedAt: z.string(),
});

export type RecentViewDto = z.infer<typeof recentViewSchema>;
