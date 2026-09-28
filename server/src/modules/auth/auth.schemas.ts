import { z } from "zod";

export const requestCodeSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export const verifyCodeSchema = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, "Code must be 6 digits"),
  email: z.string().email().toLowerCase().trim(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export type RequestCodeInput = z.infer<typeof requestCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
