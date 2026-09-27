import { z } from "zod";
import { RESEARCH_PROFILES } from "../../lib/app-settings.js";
import { isValidModelName } from "./model-catalog.js";

export const modelNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine(isValidModelName, "Not a valid Ollama model name");

export const selectModelBodySchema = z.object({ model: modelNameSchema });

export const updateAiSettingsSchema = z.object({
  researchProfile: z.enum(RESEARCH_PROFILES).optional(),
});

export const pullJobParamsSchema = z.object({ jobId: z.string().min(1) });

export const pullJobSchema = z.object({
  completedBytes: z.number(),
  error: z
    .object({ code: z.string().nullable(), message: z.string() })
    .nullable(),
  id: z.string(),
  model: z.string(),
  progress: z.number(),
  stage: z.string(),
  status: z.enum(["queued", "running", "done", "failed", "cancelled"]),
  totalBytes: z.number(),
});

export const aiModelSchema = z.object({
  active: z.boolean(),
  curated: z.boolean(),
  description: z.string().nullable(),
  downloadBytes: z.number().nullable(),
  installed: z.boolean(),
  installedBytes: z.number().nullable(),
  label: z.string(),
  memoryGb: z.number().nullable(),
  name: z.string(),
  pull: pullJobSchema.nullable(),
  speed: z.enum(["fast", "balanced", "accurate"]).nullable(),
  vision: z.boolean().nullable(),
});

export const aiStatusSchema = z.object({
  activeModel: z.string(),
  activeModelInstalled: z.boolean(),
  models: z.array(aiModelSchema),
  ollama: z.object({
    reachable: z.boolean(),
    url: z.string(),
    version: z.string().nullable(),
  }),
  researchProfile: z.enum(RESEARCH_PROFILES),
});

export const selectModelResponseSchema = z.object({
  activated: z.boolean(),
  pull: pullJobSchema.nullable(),
});

export type PullJobDto = z.infer<typeof pullJobSchema>;
export type AiModelDto = z.infer<typeof aiModelSchema>;
export type AiStatusDto = z.infer<typeof aiStatusSchema>;
