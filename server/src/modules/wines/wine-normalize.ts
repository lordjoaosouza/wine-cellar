export function normalizedTextKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLocaleLowerCase("en-US");
}

export function wineNormalizedKey(
  producer: string | null,
  name: string,
  vintage: string | null
): string {
  const slug = normalizedTextKey(
    [producer ?? "", name, vintage ?? "nv"].join(" ")
  )
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || normalizedTextKey(name).replace(/[^a-z0-9]+/g, "-");
}

const PARENTHESIZED_LINK_PATTERN =
  /\s+\((?:\[[^\]]*\]\([^)]*\)|https?:\/\/[^\s)]+)\)/g;
const MARKDOWN_LINK_PATTERN = /\[([^\]]*)\]\([^)]*\)/g;
const BARE_URL_PATTERN = /\s*https?:\/\/\S+/g;
const SPACE_BEFORE_PUNCTUATION_PATTERN = /\s+([.,;])/g;

export function stripLinks(text: string | null): string | null {
  if (text === null) {
    return null;
  }
  return text
    .replace(PARENTHESIZED_LINK_PATTERN, "")
    .replace(MARKDOWN_LINK_PATTERN, "$1")
    .replace(BARE_URL_PATTERN, "")
    .replace(SPACE_BEFORE_PUNCTUATION_PATTERN, "$1")
    .trim();
}
