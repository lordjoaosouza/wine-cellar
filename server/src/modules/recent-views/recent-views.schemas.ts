import { z } from "zod";

import { wineSchema } from "../wines/wines.schemas.js";

export const recentViewSchema = wineSchema.extend({
  viewedAt: z.string(),
});

export type RecentViewDto = z.infer<typeof recentViewSchema>;
