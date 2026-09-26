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

function readPrompt(file: string): string {
  return readFileSync(new URL(file, PROMPTS_DIR), "utf8").trimEnd();
}

export const WINE_IDENTIFY_PROMPT = readPrompt("wine-identify.md");
export const WINE_EXTRACT_PROMPT = readPrompt("wine-extract.md");

const NULLABLE_STRING = { type: ["string", "null"] } as const;

/** Wines the user most likely means, from the query and search results. */
export const WINE_IDENTITIES_SCHEMA = {
  additionalProperties: false,
  properties: {
    wines: {
      items: {
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          producer: NULLABLE_STRING,
          vintage: NULLABLE_STRING,
        },
        required: ["producer", "name", "vintage"],
        type: "object",
      },
      maxItems: 6,
      type: "array",
    },
  },
  required: ["wines"],
  type: "object",
} as const;

/** One wine's catalog record, written from the fetched pages. */
export const WINE_RECORD_SCHEMA = {
  additionalProperties: false,
  properties: {
    country: NULLABLE_STRING,
    found: { type: "boolean" },
    grapes: { items: { type: "string" }, maxItems: 5, type: "array" },
    matchingStorePages: { items: { type: "integer" }, type: "array" },
    name: { type: "string" },
    pairings: { items: { type: "string" }, maxItems: 5, type: "array" },
    producer: NULLABLE_STRING,
    producerProfile: NULLABLE_STRING,
    region: { maxLength: 25, type: ["string", "null"] },
    regionProfile: NULLABLE_STRING,
    tastingNotes: NULLABLE_STRING,
    type: { enum: [...WINE_TYPES, null], type: ["string", "null"] },
    vintage: NULLABLE_STRING,
  },
  required: [
    "found",
    "name",
    "producer",
    "vintage",
    "type",
    "country",
    "region",
    "grapes",
    "tastingNotes",
    "pairings",
    "producerProfile",
    "regionProfile",
    "matchingStorePages",
  ],
  type: "object",
} as const;

/** What a label photo shows. */
export const LABEL_READING_SCHEMA = {
  additionalProperties: false,
  properties: {
    name: NULLABLE_STRING,
    producer: NULLABLE_STRING,
    readable: { type: "boolean" },
    vintage: NULLABLE_STRING,
  },
  required: ["readable", "producer", "name", "vintage"],
  type: "object",
} as const;

export const LABEL_READING_PROMPT = `You read wine labels from photos taken on a phone, even when the label is angled, partially visible, glared, low quality or not in English (a back label or import sticker counts too).

- name: the wine as branded on the front label, built from the LARGEST text: the brand plus the grape, style or cuvée printed with it, e.g. "CATENA" over "MALBEC" -> "Catena Malbec"; "CASILLERO DEL DIABLO" + "RESERVA" + "CABERNET SAUVIGNON" -> "Casillero del Diablo Reserva Cabernet Sauvignon". Keep tier words (Reserva, Gran Reserva, Brut). Never use a tagline or small descriptive text (e.g. "High Mountain Vines", "Estate Bottled"), and never the year.
- producer: the winery, usually in smaller print ("Bodega Catena Zapata", "Concha y Toro"); null if not shown.
- vintage: the 4-digit year printed on the label, "NV" for a non-vintage wine, or null if none is visible.
- Ignore medals, score badges, stickers and anything that is not part of the label.
- readable: false (and the other fields null) only when the photo does not show a wine label clearly enough to identify anything.`;

/** Whether a store's product photo really shows the wine, and how clean it is. */
export const PHOTO_CHECK_SCHEMA = {
  additionalProperties: false,
  properties: {
    cleanShot: { type: "boolean" },
    labelReads: { type: "string" },
    showsWine: { type: "boolean" },
  },
  required: ["labelReads", "showsWine", "cleanShot"],
  type: "object",
} as const;

export const PHOTO_CHECK_PROMPT = `You check product photos for a wine catalog. You get the WINE the photo is supposed to show and one photo.
- labelReads: what the bottle's front label says (brand and wine name), or "" if no label is readable.
- showsWine: true only if the label shows this exact wine: same producer AND same line/cuvée and tier. A different wine from the same producer (e.g. "D.V. Catena" or "Catena Alta" when the wine is "Catena Malbec"), a different tier (Reserva vs Gran Reserva) or a different grape or color is false. Judge only the bottle's label: ignore the vintage, and ignore medals, badges or stickers around the bottle (those only affect cleanShot).
- cleanShot: true when it is a catalog-style photo of one whole bottle on a plain background, without medals, score badges, text overlays, glasses or other bottles around it.`;
