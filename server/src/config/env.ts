import { z } from "zod";

const envSchema = z.object({
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    ),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  EMAIL_FROM: z.string().min(1, "EMAIL_FROM is required"),
  ENCRYPTION_KEY: z
    .string()
    .refine(
      (value) => Buffer.from(value, "base64").length === 32,
      "ENCRYPTION_KEY must be 32 bytes, base64 encoded"
    ),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  // Context window per request; research prompts carry several page excerpts.
  LLM_CONTEXT_TOKENS: z.coerce.number().int().positive().default(8192),
  // One multimodal model handles both research and label reading.
  LLM_MODEL: z.string().default("qwen3.5:9b"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  OLLAMA_URL: z.string().url().default("http://localhost:11434"),
  PORT: z.coerce.number().int().positive().default(3000),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  SEARXNG_URL: z.string().url().default("http://localhost:8888"),
  // Label and tasting photos live here; relative paths resolve from the cwd.
  UPLOADS_DIR: z.string().default("uploads"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
