import { z } from "zod";

export const wineIdParamsSchema = z.object({ wineId: z.string().min(1) });
