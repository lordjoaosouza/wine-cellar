import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "./prisma.js";

export const RESEARCH_PROFILES = ["fast", "thorough"] as const;
export type ResearchProfileName = (typeof RESEARCH_PROFILES)[number];

const definitions = {
  "ai.activeModel": {
    defaultValue: env.LLM_MODEL,
    schema: z.string().min(1),
  },
  "ai.researchProfile": {
    defaultValue: "thorough" as ResearchProfileName,
    schema: z.enum(RESEARCH_PROFILES),
  },
} as const;

export type SettingKey = keyof typeof definitions;
export type SettingValue<K extends SettingKey> = z.infer<
  (typeof definitions)[K]["schema"]
>;

const cache = new Map<SettingKey, unknown>();

export async function getSetting<K extends SettingKey>(
  key: K
): Promise<SettingValue<K>> {
  if (cache.has(key)) {
    return cache.get(key) as SettingValue<K>;
  }
  const definition = definitions[key];
  const stored = await prisma.appSetting.findUnique({ where: { key } });
  const parsed = stored ? definition.schema.safeParse(stored.value) : null;
  const value = parsed?.success ? parsed.data : definition.defaultValue;
  cache.set(key, value);
  return value as SettingValue<K>;
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: SettingValue<K>
): Promise<SettingValue<K>> {
  const parsed = definitions[key].schema.parse(value) as SettingValue<K>;
  await prisma.appSetting.upsert({
    create: { key, value: parsed },
    update: { value: parsed },
    where: { key },
  });
  cache.set(key, parsed);
  return parsed;
}

export function resetSettingsCache(): void {
  cache.clear();
}
