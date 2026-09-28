import { normalizedTextKey } from "@/utils/wine-format";

const FALLBACK_SLUG = "dry-red";

const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/g;
const LEADING_TRAILING_DASHES_PATTERN = /^-+|-+$/g;

export function wineTypeSlug(type: string | null): string {
  if (!type) {
    return FALLBACK_SLUG;
  }
  const slug = normalizedTextKey(type)
    .replace(NON_ALPHANUMERIC_PATTERN, "-")
    .replace(LEADING_TRAILING_DASHES_PATTERN, "");
  return slug || FALLBACK_SLUG;
}
