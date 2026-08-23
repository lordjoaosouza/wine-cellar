import { readFileSync } from "node:fs";

export const WINE_TYPES = [
  "Dry red",
  "Medium-bodied red",
  "Sweet red",
  "Dry white",
  "Off-dry white",
  "Sweet white",
  "Rosé",
  "Sparkling wine",
  "Sparkling rosé",
  "Champagne",
  "Fortified wine",
  "Dessert wine",
  "Orange wine",
] as const;

export type WineType = (typeof WINE_TYPES)[number];

const PROMPTS_DIR = new URL("../../../prompts/", import.meta.url);

export const WINE_SEARCH_SYSTEM_PROMPT = readFileSync(
  new URL("wine-search.md", PROMPTS_DIR),
  "utf8"
).trimEnd();

export const WINE_RESULT_JSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    results: {
      items: {
        additionalProperties: false,
        properties: {
          country: { type: ["string", "null"] },
          grapes: { items: { type: "string" }, type: "array" },
          guideScore: { maximum: 5, minimum: 0, type: ["number", "null"] },
          imageUrl: { type: ["string", "null"] },
          name: { type: "string" },
          pairings: { items: { type: "string" }, type: "array" },
          price: { pattern: "^~R\\$ [0-9.]+$", type: ["string", "null"] },
          producer: { type: ["string", "null"] },
          producerProfile: { type: ["string", "null"] },
          region: { maxLength: 25, type: ["string", "null"] },
          regionProfile: { type: ["string", "null"] },
          tastingNotes: { type: ["string", "null"] },
          type: { enum: [...WINE_TYPES, null], type: ["string", "null"] },
          vintage: { type: ["string", "null"] },
        },
        required: [
          "name",
          "producer",
          "vintage",
          "type",
          "country",
          "region",
          "grapes",
          "price",
          "guideScore",
          "tastingNotes",
          "pairings",
          "producerProfile",
          "regionProfile",
          "imageUrl",
        ],
        type: "object",
      },
      type: "array",
    },
  },
  required: ["results"],
  type: "object",
} as const;

export const LABEL_PHOTO_INSTRUCTIONS =
  'You read wine labels from photos taken on a phone. Identify the producer, wine name, and vintage as precisely as you can, even if the label is angled, partially visible, glared, low quality, or in a language other than English — read a back label or import sticker too if that is what is shown. Respond in plain text as exactly one line: "<wine name> by <producer>, vintage <year, or NV, or unknown>". If the photo does not show a wine label clearly enough to identify anything meaningful, respond with exactly: UNREADABLE.';
