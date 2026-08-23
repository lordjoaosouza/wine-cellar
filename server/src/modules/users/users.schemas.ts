import { z } from "zod";

export const tuyaRegionSchema = z.enum(["US", "EU", "CN", "IN"]);

export const updateProfileSchema = z.object({
  avatarUrl: z.string().url().nullable().optional(),
  name: z.string().trim().min(1).max(120).nullable().optional(),
  openaiApiKey: z.string().trim().min(1).nullable().optional(),
  targetHumidityPct: z.number().min(50).max(80).optional(),
  targetTemperatureC: z.number().min(4).max(20).optional(),
});

export const profileResponseSchema = z.object({
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
  email: z.string().email(),
  hasOpenaiApiKey: z.boolean(),
  id: z.string(),
  name: z.string().nullable(),
  targetHumidityPct: z.number(),
  targetTemperatureC: z.number(),
});

export const tuyaCredentialsInputSchema = z.object({
  clientId: z.string().trim().min(1),
  clientSecret: z.string().trim().min(1),
  deviceId: z.string().trim().min(1),
  region: tuyaRegionSchema,
});

export const tuyaCredentialsResponseSchema = z.object({
  clientId: z.string().nullable(),
  deviceId: z.string().nullable(),
  hasClientSecret: z.boolean(),
  region: tuyaRegionSchema.nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type TuyaCredentialsInput = z.infer<typeof tuyaCredentialsInputSchema>;
