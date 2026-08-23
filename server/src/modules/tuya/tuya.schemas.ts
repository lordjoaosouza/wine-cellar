import { z } from "zod";

export const tuyaReadingSchema = z.object({
  humidityPct: z.number().nullable(),
  temperatureC: z.number().nullable(),
  updatedAt: z.string(),
});
