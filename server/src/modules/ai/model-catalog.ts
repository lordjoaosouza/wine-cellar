export type ModelSpeed = "fast" | "balanced" | "accurate";

export interface CatalogModel {
  description: string;
  downloadBytes: number;
  label: string;
  memoryGb: number;
  name: string;
  speed: ModelSpeed;
}

const GB = 1024 ** 3;

export const DEFAULT_MODEL = "qwen3.5:9b";

export const MODEL_CATALOG: readonly CatalogModel[] = [
  {
    description:
      "Small and quick. Reads clear labels well; research write-ups are shorter and less precise.",
    downloadBytes: Math.round(3.3 * GB),
    label: "Gemma 3 4B",
    memoryGb: 6,
    name: "gemma3:4b",
    speed: "fast",
  },
  {
    description:
      "Compact vision model tuned for reading text in photos. A good pick for label scanning on modest hardware.",
    downloadBytes: Math.round(3.2 * GB),
    label: "Qwen 2.5 VL 3B",
    memoryGb: 6,
    name: "qwen2.5vl:3b",
    speed: "fast",
  },
  {
    description:
      "The default: strong label reading and solid research write-ups on a 16 GB machine.",
    downloadBytes: Math.round(6.6 * GB),
    label: "Qwen 3.5 9B",
    memoryGb: 12,
    name: DEFAULT_MODEL,
    speed: "balanced",
  },
  {
    description:
      "Strong at reading angled or glared labels, with research quality close to the default.",
    downloadBytes: Math.round(6 * GB),
    label: "Qwen 2.5 VL 7B",
    memoryGb: 10,
    name: "qwen2.5vl:7b",
    speed: "balanced",
  },
  {
    description:
      "Larger multilingual model with better wine knowledge for producer and region write-ups.",
    downloadBytes: Math.round(8.1 * GB),
    label: "Gemma 3 12B",
    memoryGb: 16,
    name: "gemma3:12b",
    speed: "balanced",
  },
  {
    description:
      "Meta's vision model. Accurate label reading; slower research on laptops.",
    downloadBytes: Math.round(7.8 * GB),
    label: "Llama 3.2 Vision 11B",
    memoryGb: 16,
    name: "llama3.2-vision:11b",
    speed: "accurate",
  },
  {
    description:
      "The most accurate option here. Needs a machine with 32 GB or a dedicated GPU.",
    downloadBytes: Math.round(17 * GB),
    label: "Gemma 3 27B",
    memoryGb: 32,
    name: "gemma3:27b",
    speed: "accurate",
  },
];

const MODEL_NAME_PATTERN =
  /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)?(?::[a-z0-9][a-z0-9._-]*)?$/i;

export function isValidModelName(name: string): boolean {
  return MODEL_NAME_PATTERN.test(name);
}

export function catalogModel(name: string): CatalogModel | null {
  return MODEL_CATALOG.find((model) => model.name === name) ?? null;
}

export function labelForModel(name: string): string {
  return catalogModel(name)?.label ?? name;
}
