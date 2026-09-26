import { logger } from "./logger.js";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_TEXT_CHARS = 6000;

/** A product as a page describes it in structured data (JSON-LD or meta tags). */
export interface PageProduct {
  availability: string | null;
  currency: string | null;
  image: string | null;
  name: string | null;
  price: number | null;
}

export interface WebPage {
  images: string[];
  products: PageProduct[];
  /** The site's own name ("Vinhos e Vinhos"), when the page reveals it. */
  siteName: string | null;
  text: string;
  title: string;
  url: string;
}

const HTTP_URL_PATTERN = /^https?:\/\//i;
const CHARSET_PATTERN = /charset=["']?([\w-]+)/i;
const JSON_LD_PATTERN =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const TITLE_PATTERN = /<title[^>]*>([\s\S]*?)<\/title>/i;
const META_TAG_PATTERN = /<meta\s[^>]*>/gi;
const ATTRIBUTE_PATTERN = /([\w:-]+)\s*=\s*["']([^"']*)["']/g;
const NOISE_BLOCK_PATTERN =
  /<(script|style|noscript|svg|template|iframe|head|nav|footer|header)\b[\s\S]*?<\/\1>/gi;
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const BLOCK_TAG_PATTERN =
  /<\/?(?:p|div|br|li|ul|ol|tr|td|th|h[1-6]|section|article|dt|dd|table)\b[^>]*>/gi;
const TAG_PATTERN = /<[^>]+>/g;
const NUMERIC_ENTITY_PATTERN = /&#(x?)([0-9a-f]+);/gi;
const NAMED_ENTITY_PATTERN = /&(amp|lt|gt|quot|apos|nbsp|#39);/g;
const SPACES_PATTERN = /[ \t ]+/g;
const BLANK_LINES_PATTERN = /\s*\n\s*/g;
const PRICE_TEXT_PATTERN = /[^\d.,]/g;
const IMG_TAG_PATTERN = /<img\b[^>]*>/gi;
const TITLE_SEPARATOR_PATTERN = /\s+[|–—-]\s+/;
const NAME_WORD_PATTERN = /[\p{L}\p{N}]+/gu;
const MAX_JSON_LD_DEPTH = 6;
const GENERIC_SITE_NAMES = new Set([
  "home",
  "homepage",
  "inicio",
  "início",
  "logo",
  "loja",
  "loja virtual",
  "página inicial",
]);
/** JSON-LD types whose `name` is the site or business itself. */
const SITE_TYPES = [
  "organization",
  "store",
  "onlinestore",
  "onlinebusiness",
  "localbusiness",
  "liquorstore",
  "website",
];

const NAMED_ENTITIES: Record<string, string> = {
  "#39": "'",
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function firstGroup(pattern: RegExp, text: string): string | null {
  // First match only (Biome mis-types exec() as never null, hence matchAll).
  for (const match of text.matchAll(new RegExp(pattern, "g"))) {
    return match[1] ?? null;
  }
  return null;
}

export function decodeEntities(text: string): string {
  return text
    .replace(NUMERIC_ENTITY_PATTERN, (_, hex: string, digits: string) =>
      String.fromCodePoint(Number.parseInt(digits, hex ? 16 : 10))
    )
    .replace(
      NAMED_ENTITY_PATTERN,
      (_, name: string) => NAMED_ENTITIES[name] ?? ""
    );
}

/** Readable text of an HTML page: no scripts, navigation or markup. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(COMMENT_PATTERN, " ")
      .replace(NOISE_BLOCK_PATTERN, " ")
      .replace(BLOCK_TAG_PATTERN, "\n")
      .replace(TAG_PATTERN, " ")
  )
    .replace(SPACES_PATTERN, " ")
    .replace(BLANK_LINES_PATTERN, "\n")
    .trim();
}

/** "189.90", "189,90", "1.250,00", 189.9 → 189.9 */
export function parsePrice(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  let digits = value.replace(PRICE_TEXT_PATTERN, "");
  const lastComma = digits.lastIndexOf(",");
  const lastDot = digits.lastIndexOf(".");
  if (lastComma > lastDot) {
    // Brazilian/European style: dots group thousands, the comma is decimal.
    digits = digits.replaceAll(".", "").replace(",", ".");
  } else {
    digits = digits.replaceAll(",", "");
  }
  const parsed = Number.parseFloat(digits);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  return value === undefined || value === null ? [] : [value];
}

function isType(node: Record<string, unknown>, type: string): boolean {
  return asArray(node["@type"]).some(
    (entry) => typeof entry === "string" && entry.toLowerCase() === type
  );
}

function firstString(value: unknown): string | null {
  for (const entry of asArray(value)) {
    if (typeof entry === "string" && entry.trim()) {
      return entry.trim();
    }
    if (entry && typeof entry === "object") {
      const { url } = entry as { url?: unknown };
      if (typeof url === "string") {
        return url;
      }
    }
  }
  return null;
}

function productFromJsonLd(node: Record<string, unknown>): PageProduct {
  let price: number | null = null;
  let currency: string | null = null;
  let availability: string | null = null;

  for (const offer of asArray(node.offers)) {
    if (!offer || typeof offer !== "object") {
      continue;
    }
    const record = offer as Record<string, unknown>;
    const offerPrice =
      parsePrice(record.price) ??
      parsePrice(record.lowPrice) ??
      parsePrice(
        (record.priceSpecification as Record<string, unknown> | undefined)
          ?.price
      );
    if (offerPrice !== null) {
      price = offerPrice;
      currency =
        typeof record.priceCurrency === "string"
          ? record.priceCurrency.toUpperCase()
          : null;
      availability =
        typeof record.availability === "string" ? record.availability : null;
      break;
    }
  }

  return {
    availability,
    currency,
    image: firstString(node.image),
    name: typeof node.name === "string" ? decodeEntities(node.name) : null,
    price,
  };
}

function collectJsonLdProducts(value: unknown, into: PageProduct[]): void {
  for (const node of asArray(value)) {
    if (!node || typeof node !== "object") {
      continue;
    }
    const record = node as Record<string, unknown>;
    if (isType(record, "product")) {
      into.push(productFromJsonLd(record));
    }
    if (record["@graph"]) {
      collectJsonLdProducts(record["@graph"], into);
    }
  }
}

/** Names of the seller and of the site/business, from anywhere in JSON-LD. */
function collectJsonLdSiteNames(
  value: unknown,
  into: { organizations: string[]; sellers: string[] },
  depth = 0
): void {
  if (depth > MAX_JSON_LD_DEPTH) {
    return;
  }
  for (const node of asArray(value)) {
    if (!node || typeof node !== "object") {
      continue;
    }
    const record = node as Record<string, unknown>;
    const { name, seller } = record;
    if (
      typeof name === "string" &&
      SITE_TYPES.some((type) => isType(record, type))
    ) {
      into.organizations.push(name);
    }
    const sellerName = (seller as { name?: unknown } | undefined)?.name;
    if (typeof sellerName === "string") {
      into.sellers.push(sellerName);
    }
    for (const child of Object.values(record)) {
      if (child && typeof child === "object") {
        collectJsonLdSiteNames(child, into, depth + 1);
      }
    }
  }
}

/** The alt text of the site's logo: <img class="logo" alt="Vinhos e Vinhos">. */
function logoAltText(html: string): string | null {
  for (const [tag] of html.matchAll(IMG_TAG_PATTERN)) {
    if (!tag.toLowerCase().includes("logo")) {
      continue;
    }
    for (const [, name, value] of tag.matchAll(ATTRIBUTE_PATTERN)) {
      if (name?.toLowerCase() === "alt" && value?.trim()) {
        return decodeEntities(value.trim());
      }
    }
  }
  return null;
}

function nameWords(text: string): string[] {
  return text.toLowerCase().match(NAME_WORD_PATTERN) ?? [];
}

/**
 * "Vinho Tinto Catena Malbec - Cia do Vinho" → "Cia do Vinho": the title's
 * last segment, unless it is really part of the product name ("... - Malbec").
 */
function titleSuffix(title: string): string | null {
  const segments = title.split(TITLE_SEPARATOR_PATTERN);
  const last = segments.at(-1)?.trim();
  if (segments.length < 2 || !last) {
    return null;
  }
  const productWords = new Set(nameWords(segments.slice(0, -1).join(" ")));
  const suffixWords = nameWords(last);
  return suffixWords.some((word) => !productWords.has(word)) ? last : null;
}

function isPlausibleSiteName(name: string | null | undefined): name is string {
  const trimmed = name?.trim() ?? "";
  return (
    trimmed.length >= 2 &&
    trimmed.length <= 60 &&
    !HTTP_URL_PATTERN.test(trimmed) &&
    !GENERIC_SITE_NAMES.has(trimmed.toLowerCase())
  );
}

function readMetaTags(html: string): Map<string, string> {
  const meta = new Map<string, string>();
  for (const [tag] of html.matchAll(META_TAG_PATTERN)) {
    const attributes = new Map<string, string>();
    for (const [, name, value] of tag.matchAll(ATTRIBUTE_PATTERN)) {
      attributes.set((name as string).toLowerCase(), value as string);
    }
    const key =
      attributes.get("property") ??
      attributes.get("name") ??
      attributes.get("itemprop");
    const content = attributes.get("content");
    if (key && content && !meta.has(key.toLowerCase())) {
      meta.set(key.toLowerCase(), decodeEntities(content));
    }
  }
  return meta;
}

function resolveUrl(candidate: string | null, base: string): string | null {
  if (!candidate) {
    return null;
  }
  try {
    return new URL(candidate, base).toString();
  } catch {
    return null;
  }
}

/** Structured product data, page images and readable text from raw HTML. */
export function parseWebPage(url: string, html: string): WebPage {
  const products: PageProduct[] = [];
  const jsonLdNames = {
    organizations: [] as string[],
    sellers: [] as string[],
  };
  for (const [, json] of html.matchAll(JSON_LD_PATTERN)) {
    try {
      const parsed: unknown = JSON.parse(json ?? "");
      collectJsonLdProducts(parsed, products);
      collectJsonLdSiteNames(parsed, jsonLdNames);
    } catch {
      // Malformed JSON-LD is common; the meta tags below are the fallback.
    }
  }

  const meta = readMetaTags(html);
  const metaPrice = parsePrice(
    meta.get("product:price:amount") ??
      meta.get("og:price:amount") ??
      meta.get("price")
  );
  if (products.every((product) => product.price === null) && metaPrice) {
    products.push({
      availability: meta.get("product:availability") ?? null,
      currency:
        (
          meta.get("product:price:currency") ??
          meta.get("og:price:currency") ??
          meta.get("pricecurrency") ??
          ""
        ).toUpperCase() || null,
      image: meta.get("og:image") ?? null,
      name: meta.get("og:title") ?? null,
      price: metaPrice,
    });
  }

  for (const product of products) {
    product.image = resolveUrl(product.image, url);
  }
  const pageTitle = decodeEntities(
    firstGroup(TITLE_PATTERN, html)?.trim() ?? ""
  );

  const images = [
    ...products.map((product) => product.image),
    resolveUrl(meta.get("og:image") ?? null, url),
  ].filter((image): image is string => Boolean(image));

  return {
    images: [...new Set(images)],
    products,
    // Most reliable first: what the site calls itself, who sells the
    // product, then weaker hints like the logo's alt text or the page title.
    siteName:
      [
        meta.get("og:site_name"),
        ...jsonLdNames.sellers,
        ...jsonLdNames.organizations,
        meta.get("application-name"),
        meta.get("apple-mobile-web-app-title"),
        logoAltText(html),
        titleSuffix(pageTitle),
      ]
        .find(isPlausibleSiteName)
        ?.trim() ?? null,
    text: htmlToText(html).slice(0, MAX_TEXT_CHARS),
    title: decodeEntities(meta.get("og:title") ?? pageTitle),
    url,
  };
}

function decodeBody(bytes: ArrayBuffer, contentType: string): string {
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 4096));
  const charset =
    firstGroup(CHARSET_PATTERN, contentType) ??
    firstGroup(CHARSET_PATTERN, head);
  try {
    return new TextDecoder(charset ?? "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** Fetches and parses a web page, or returns null if it can't be loaded. */
export async function fetchWebPage(url: string): Promise<WebPage | null> {
  if (!HTTP_URL_PATTERN.test(url)) {
    return null;
  }
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "User-Agent": BROWSER_USER_AGENT,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!(response.ok && contentType.includes("html"))) {
      return null;
    }
    const bytes = (await response.arrayBuffer()).slice(0, MAX_HTML_BYTES);
    return parseWebPage(response.url || url, decodeBody(bytes, contentType));
  } catch (error) {
    logger.debug({ err: error, url }, "fetchWebPage failed");
    return null;
  }
}
