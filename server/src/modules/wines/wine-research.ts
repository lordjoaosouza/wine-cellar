import { FOREIGN_CURRENCIES } from "../../lib/exchange-rates.js";
import { logger } from "../../lib/logger.js";
import { chatJson } from "../../lib/ollama.js";
import type { DownloadedImage } from "../../lib/remote-image.js";
import {
  fetchWebPage,
  type PageProduct,
  type WebPage,
} from "../../lib/web-page.js";
import { searchWeb, type WebSearchResult } from "../../lib/web-search.js";
import type { ReportStage } from "./research-jobs.js";
import { wineNormalizedKey } from "./wine-normalize.js";
import { chooseStorePhoto } from "./wine-photos.js";
import type { StoreListing } from "./wine-pricing.js";
import {
  LABEL_READING_PROMPT,
  LABEL_READING_SCHEMA,
  WINE_EXTRACT_PROMPT,
  WINE_IDENTIFY_PROMPT,
  WINE_IDENTITIES_SCHEMA,
  WINE_RECORD_SCHEMA,
} from "./wine-prompts.js";
import {
  BRAZILIAN_STORES,
  cleanStoreName,
  hostnameOf,
  INTERNATIONAL_STORES,
  isExcludedUrl,
  knownStoreFor,
  storeCountry,
  storeNameFromUrl,
} from "./wine-stores.js";

/** A specific wine, before anything else is known about it. */
export interface WineIdentity {
  name: string;
  producer: string | null;
  vintage: string | null;
}

/** Everything research found about one wine, ready to be stored. */
export interface ResearchedWine extends WineIdentity {
  country: string | null;
  grapes: string[];
  listings: StoreListing[];
  pairings: string[];
  /** A store product photo the vision model confirmed shows this wine. */
  photo: DownloadedImage | null;
  producerProfile: string | null;
  region: string | null;
  regionProfile: string | null;
  tastingNotes: string | null;
  type: string | null;
}

interface WineRecord extends Omit<ResearchedWine, "listings" | "photo"> {
  found: boolean;
  matchingStorePages: number[];
}

type Market = "BR" | "INTERNATIONAL";

interface StorePage {
  country: string;
  page: WebPage;
  product: PageProduct & { price: number };
  storeName: string;
}

// A laptop-class model takes ~30s per wine, so broad queries stay small.
const MAX_WINES_PER_SEARCH = 4;
const MAX_STORE_PAGES = 4;
// Some candidate pages fail to load or carry no price, so fetch a few extra.
const STORE_PAGES_FETCHED = 8;
const MAX_INFO_PAGES = 2;
const IDENTIFY_RESULTS_SHOWN = 12;
const STORE_TEXT_CHARS = 700;
const INFO_TEXT_CHARS = 1800;
const SNIPPET_CHARS = 160;

const WORD_PATTERN = /[\p{L}\p{N}]{4,}/gu;

/** "Catena Malbec" by "Bodega Catena Zapata" → "Catena Malbec": the producer is only added when the name doesn't already carry it. */
export function wineLabel(identity: WineIdentity): string {
  const { name, producer } = identity;
  const producerWords = new Set(
    (producer?.toLowerCase() ?? "").match(WORD_PATTERN)
  );
  const nameMentionsProducer = (
    name.toLowerCase().match(WORD_PATTERN) ?? []
  ).some((word) => producerWords.has(word));
  return [nameMentionsProducer ? null : producer, name, identity.vintage]
    .filter(Boolean)
    .join(" ");
}

function uniqueByUrl(results: WebSearchResult[]): WebSearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    if (seen.has(result.url)) {
      return false;
    }
    seen.add(result.url);
    return true;
  });
}

async function searchAll(
  queries: { language: string; query: string }[]
): Promise<WebSearchResult[]> {
  const batches = await Promise.all(
    queries.map(({ query, language }) => searchWeb(query, { language }))
  );
  return uniqueByUrl(batches.flat());
}

/** Search results → the specific wines the user most likely means. */
export async function identifyWines(query: string): Promise<WineIdentity[]> {
  const results = await searchAll([
    { language: "pt-BR", query: `${query} vinho` },
    { language: "en", query: `${query} wine` },
  ]);
  const listing = results
    .slice(0, IDENTIFY_RESULTS_SHOWN)
    .map(
      (result, index) =>
        `${index + 1}. ${result.title} (${result.url})\n${result.content.slice(0, SNIPPET_CHARS)}`
    )
    .join("\n");

  const { wines } = await chatJson<{ wines: WineIdentity[] }>({
    schema: WINE_IDENTITIES_SCHEMA,
    system: WINE_IDENTIFY_PROMPT,
    user: `QUERY: "${query.trim()}"\n\nSEARCH RESULTS:\n${listing || "(none)"}`,
  });
  return wines
    .filter((wine) => wine.name.trim())
    .slice(0, MAX_WINES_PER_SEARCH);
}

function pricedProduct(
  page: WebPage,
  market: Market
): (PageProduct & { price: number }) | null {
  const isBrazilian = hostnameOf(page.url)?.endsWith(".br") ?? false;
  for (const product of page.products) {
    const { currency, price } = product;
    if (price === null) {
      continue;
    }
    const matchesMarket =
      market === "BR"
        ? currency === "BRL" || (currency === null && isBrazilian)
        : currency !== null &&
          (FOREIGN_CURRENCIES as readonly string[]).includes(currency);
    if (matchesMarket) {
      return { ...product, currency: currency ?? "BRL", price };
    }
  }
  return null;
}

/**
 * Product pages with a price in the market's currency, one per site. Any
 * shop counts (smaller stores often have the best coverage); well-known
 * stores are tried first and marketplaces never.
 */
async function findStorePages(
  results: WebSearchResult[],
  market: Market
): Promise<StorePage[]> {
  const known = market === "BR" ? BRAZILIAN_STORES : INTERNATIONAL_STORES;
  const seenHosts = new Set<string>();
  const candidates = results.filter((result) => {
    const host = hostnameOf(result.url);
    if (!host || isExcludedUrl(result.url) || seenHosts.has(host)) {
      return false;
    }
    seenHosts.add(host);
    return true;
  });
  candidates.sort(
    (a, b) =>
      Number(knownStoreFor(b.url, known) !== null) -
      Number(knownStoreFor(a.url, known) !== null)
  );

  const pages = await Promise.all(
    candidates
      .slice(0, STORE_PAGES_FETCHED)
      .map((result) => fetchWebPage(result.url))
  );
  const storePages: StorePage[] = [];
  for (const page of pages) {
    const product = page && pricedProduct(page, market);
    if (!(page && product)) {
      continue;
    }
    const knownStore = knownStoreFor(page.url, known);
    storePages.push({
      country: knownStore?.country ?? storeCountry(page.url, product.currency),
      page,
      product,
      storeName:
        knownStore?.name ??
        (page.siteName ? cleanStoreName(page.siteName) : null) ??
        storeNameFromUrl(page.url),
    });
  }
  return storePages.slice(0, MAX_STORE_PAGES);
}

async function findBrazilianStorePages(label: string): Promise<StorePage[]> {
  const results = await searchAll([
    { language: "pt-BR", query: `${label} vinho preço` },
    { language: "pt-BR", query: `${label} comprar` },
  ]);
  return findStorePages(results, "BR");
}

async function findInternationalStorePages(
  label: string
): Promise<StorePage[]> {
  const results = await searchAll([
    { language: "en", query: `${label} wine price` },
    { language: "en", query: `${label} wine buy` },
  ]);
  return findStorePages(results, "INTERNATIONAL");
}

async function findInfoPages(
  label: string,
  skipUrls: Set<string>
): Promise<WebPage[]> {
  const results = await searchAll([
    { language: "all", query: `${label} ficha técnica` },
    { language: "en", query: `${label} winery tech sheet` },
  ]);
  const pages = await Promise.all(
    results
      .filter(
        (result) => !(isExcludedUrl(result.url) || skipUrls.has(result.url))
      )
      .slice(0, MAX_INFO_PAGES + 2)
      .map((result) => fetchWebPage(result.url))
  );
  return pages
    .filter((page): page is WebPage => page !== null && page.text.length > 200)
    .slice(0, MAX_INFO_PAGES);
}

function describeSources(infoPages: WebPage[], storePages: StorePage[]) {
  const info = infoPages.map(
    (page, index) =>
      `[INFO ${index + 1}] ${page.title} (${page.url})\n${page.text.slice(0, INFO_TEXT_CHARS)}`
  );
  const stores = storePages.map(
    ({ page, product, storeName, country }, index) =>
      `[STORE ${index + 1}] ${storeName}, ${country} (${page.url})\nProduct on page: ${product.name ?? page.title}, ${product.currency} ${product.price}\n${page.text.slice(0, STORE_TEXT_CHARS)}`
  );
  return [...info, ...stores].join("\n\n") || "(no pages found)";
}

function toListings(
  storePages: StorePage[],
  matching: number[]
): StoreListing[] {
  return [...new Set(matching)].flatMap((pageNumber) => {
    const entry = storePages[pageNumber - 1];
    if (!entry) {
      return [];
    }
    return [
      {
        amount: entry.product.price,
        country: entry.country,
        currency: entry.product.currency ?? "BRL",
        store: entry.storeName,
        url: entry.page.url,
      },
    ];
  });
}

/**
 * Researches one specific wine: Brazilian store pages first (stores abroad
 * only when none sells it), plus producer/guide pages, then asks the local
 * model to write the record and pick the store pages that sell this exact
 * wine. Returns null when the sources don't confirm the wine exists.
 */
export async function researchWine(
  identity: WineIdentity,
  report: ReportStage = () => undefined
): Promise<ResearchedWine | null> {
  const label = wineLabel(identity);
  report(`Checking stores for ${label}`);
  const brazilianPages = await findBrazilianStorePages(label);
  const [storePages, infoPages] = await Promise.all([
    brazilianPages.length > 0
      ? brazilianPages
      : findInternationalStorePages(label),
    findInfoPages(label, new Set(brazilianPages.map(({ page }) => page.url))),
  ]);

  report(`Writing up ${label}`);
  const record = await chatJson<WineRecord>({
    schema: WINE_RECORD_SCHEMA,
    system: WINE_EXTRACT_PROMPT,
    user: `WINE: ${identity.name}; producer: ${identity.producer ?? "unknown"}; vintage: ${identity.vintage ?? "none requested"}\n\nSOURCES:\n\n${describeSources(infoPages, storePages)}`,
  });

  logger.info(
    {
      found: record.found,
      infoPages: infoPages.length,
      matching: record.matchingStorePages,
      storePages: storePages.map(({ page }) => page.url),
      wine: label,
    },
    "researched wine"
  );

  if (!(record.found && record.name.trim())) {
    return null;
  }
  const { found: _found, matchingStorePages, ...fields } = record;
  const matchingPages = [...new Set(matchingStorePages)]
    .sort((a, b) => a - b)
    .flatMap((pageNumber) => storePages[pageNumber - 1] ?? []);

  // Store titles can hide which cuvée a page sells ("Catena Malbec Malbec" was
  // a D.V. Catena); the bottle in its photo can't. Known stores come first,
  // and their catalog shots tend to be the cleanest.
  report(`Checking photos for ${label}`);
  const { photo, wrongPages } = await chooseStorePhoto(
    fields,
    matchingPages.flatMap(({ page }) =>
      page.images[0] ? [{ imageUrl: page.images[0], pageUrl: page.url }] : []
    )
  );
  return {
    ...fields,
    listings: toListings(storePages, matchingStorePages).filter(
      (listing) => !wrongPages.includes(listing.url)
    ),
    photo,
    vintage: identity.vintage ?? fields.vintage ?? null,
  };
}

/**
 * Two identities can turn out to be the same wine once researched (e.g.
 * "Casillero del Diablo Cabernet" and "... Reserva Cabernet" both come back
 * under the label's canonical name). Keep the first and pool their stores.
 */
export function mergeDuplicateWines(wines: ResearchedWine[]): ResearchedWine[] {
  const byKey = new Map<string, ResearchedWine>();
  for (const wine of wines) {
    const key = wineNormalizedKey(wine.producer, wine.name, wine.vintage);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, wine);
      continue;
    }
    const urls = new Set(existing.listings.map((listing) => listing.url));
    existing.listings.push(
      ...wine.listings.filter((listing) => !urls.has(listing.url))
    );
    existing.photo ??= wine.photo;
  }
  return [...byKey.values()];
}

/** Researches each wine the query most likely means, in parallel. */
export async function researchWinesByQuery(
  query: string,
  report: ReportStage = () => undefined
): Promise<ResearchedWine[]> {
  report("Searching the web");
  const identities = await identifyWines(query);
  const researched = await Promise.all(
    identities.map((identity) => researchWine(identity, report))
  );
  return mergeDuplicateWines(
    researched.filter((wine): wine is ResearchedWine => wine !== null)
  );
}

/** Reads a label photo, then researches exactly the wine it shows. */
export async function researchWineFromPhoto(
  imageDataUri: string,
  report: ReportStage = () => undefined
): Promise<ResearchedWine[]> {
  report("Reading the label");
  const base64 = imageDataUri.slice(imageDataUri.indexOf(",") + 1);
  const reading = await chatJson<WineIdentity & { readable: boolean }>({
    images: [base64],
    schema: LABEL_READING_SCHEMA,
    system: LABEL_READING_PROMPT,
    user: "Identify this wine from its label photo.",
  });
  if (!(reading.readable && reading.name)) {
    return [];
  }
  const wine = await researchWine(
    {
      name: reading.name,
      producer: reading.producer,
      vintage: reading.vintage === "NV" ? null : reading.vintage,
    },
    report
  );
  return wine ? [wine] : [];
}
