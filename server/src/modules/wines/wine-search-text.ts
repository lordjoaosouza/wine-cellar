import { normalizedTextKey } from "./wine-normalize.js";

const TOKEN_PATTERN = /[a-z0-9]+/g;
const MIN_TOKEN_LENGTH = 2;

export function searchTokens(query: string): string[] {
  const tokens = normalizedTextKey(query).match(TOKEN_PATTERN) ?? [];
  return [
    ...new Set(tokens.filter((token) => token.length >= MIN_TOKEN_LENGTH)),
  ];
}

export function wineSearchText(wine: {
  country: string | null;
  grapes: string[];
  name: string;
  region: string | null;
  vintage: string | null;
  winery: string | null;
}): string {
  return normalizedTextKey(
    [
      wine.name,
      wine.winery ?? "",
      wine.region ?? "",
      wine.country ?? "",
      wine.vintage ?? "",
      ...wine.grapes,
    ].join(" ")
  )
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizedQuery(query: string): string {
  return searchTokens(query).join(" ");
}
