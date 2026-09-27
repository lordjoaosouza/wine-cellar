import { FOREIGN_CURRENCIES } from "../../lib/exchange-rates.js";
import { prepareLabelScanForVision } from "../../lib/image-prep.js";
import { throwIfAborted } from "../../lib/job-queue.js";
import { logger } from "../../lib/logger.js";
import { chatJson } from "../../lib/ollama.js";
import type { DownloadedImage } from "../../lib/remote-image.js";
import {
  fetchWebPage,
  type PageProduct,
  type WebPage,
} from "../../lib/web-page.js";
import { searchWeb, type WebSearchResult } from "../../lib/web-search.js";
import { idleContext, type ResearchContext } from "./research-jobs.js";
import {
  RESEARCH_PROFILE_PRESETS,
  type ResearchProfile,
} from "./research-profiles.js";
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

export interface WineIdentity {
  name: string;
  producer: string | null;
  vintage: string | null;
}

export interface ResearchedWine extends WineIdentity {
  country: string | null;
  grapes: string[];
  listings: StoreListing[];
  pairings: string[];
  photo: DownloadedImage | null;
  producerProfile: string | null;
  region: string | null;
  regionProfile: string | null;
  tastingNotes: string | null;
  type: string | null;
}

export interface ResearchOptions {
  context?: ResearchContext;
  profile?: ResearchProfile;
}

interface WineRecord extends Omit<ResearchedWine, "listings" | "photo"> {
  found: boolean;
  matchingStorePages: number[];
}

interface LabelReading {
  confidence: "high" | "low";
  name: string | null;
  producer: string | null;
  readable: boolean;
  vintage: string | null;
}

type Market = "BR" | "INTERNATIONAL";

interface StorePage {
  country: string;
  page: WebPage;
  product: PageProduct & { price: number };
  storeName: string;
}

interface ResearchRun {
  context: ResearchContext;
  profile: ResearchProfile;
}

const SNIPPET_CHARS = 160;
const WORD_PATTERN = /[\p{L}\p{N}]{4,}/gu;

const PROGRESS = {
  identified: 0.12,
  labelRead: 0.1,
  wine: { photos: 0.95, stores: 0.25, writeUp: 0.55 },
} as const;

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

function resolveRun(options: ResearchOptions): ResearchRun {
  return {
    context: options.context ?? idleContext(),
    profile: options.profile ?? RESEARCH_PROFILE_PRESETS.thorough,
  };
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
  queries: { language: string; query: string }[],
  signal: AbortSignal
): Promise<WebSearchResult[]> {
  const batches = await Promise.all(
    queries.map(({ query, language }) => searchWeb(query, { language, signal }))
  );
  throwIfAborted(signal);
  return uniqueByUrl(batches.flat());
}

export async function identifyWines(
  query: string,
  options: ResearchOptions = {}
): Promise<WineIdentity[]> {
  const { context, profile } = resolveRun(options);
  const results = await searchAll(
    [
      { language: "pt-BR", query: `${query} vinho` },
      { language: "en", query: `${query} wine` },
    ],
    context.signal
  );
  const listing = results
    .slice(0, profile.identifyResultsShown)
    .map(
      (result, index) =>
        `${index + 1}. ${result.title} (${result.url})\n${result.content.slice(0, SNIPPET_CHARS)}`
    )
    .join("\n");

  const { wines } = await chatJson<{ wines: WineIdentity[] }>({
    schema: WINE_IDENTITIES_SCHEMA,
    signal: context.signal,
    system: WINE_IDENTIFY_PROMPT,
    user: `QUERY: "${query.trim()}"\n\nSEARCH RESULTS:\n${listing || "(none)"}`,
  });
  return wines
    .filter((wine) => wine.name.trim())
    .slice(0, profile.winesPerSearch);
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

async function findStorePages(
  results: WebSearchResult[],
  market: Market,
  run: ResearchRun
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
      .slice(0, run.profile.storePagesFetched)
      .map((result) => fetchWebPage(result.url, run.context.signal))
  );
  throwIfAborted(run.context.signal);
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
  return storePages.slice(0, run.profile.maxStorePages);
}

async function findBrazilianStorePages(
  label: string,
  run: ResearchRun
): Promise<StorePage[]> {
  const results = await searchAll(
    [
      { language: "pt-BR", query: `${label} vinho preço` },
      { language: "pt-BR", query: `${label} comprar` },
    ],
    run.context.signal
  );
  return findStorePages(results, "BR", run);
}

async function findInternationalStorePages(
  label: string,
  run: ResearchRun
): Promise<StorePage[]> {
  const results = await searchAll(
    [
      { language: "en", query: `${label} wine price` },
      { language: "en", query: `${label} wine buy` },
    ],
    run.context.signal
  );
  return findStorePages(results, "INTERNATIONAL", run);
}

async function findInfoPages(
  label: string,
  skipUrls: Set<string>,
  run: ResearchRun
): Promise<WebPage[]> {
  const results = await searchAll(
    [
      { language: "all", query: `${label} ficha técnica` },
      { language: "en", query: `${label} winery tech sheet` },
    ],
    run.context.signal
  );
  const pages = await Promise.all(
    results
      .filter(
        (result) => !(isExcludedUrl(result.url) || skipUrls.has(result.url))
      )
      .slice(0, run.profile.infoPages + 2)
      .map((result) => fetchWebPage(result.url, run.context.signal))
  );
  throwIfAborted(run.context.signal);
  return pages
    .filter((page): page is WebPage => page !== null && page.text.length > 200)
    .slice(0, run.profile.infoPages);
}

function describeSources(
  infoPages: WebPage[],
  storePages: StorePage[],
  profile: ResearchProfile
) {
  const info = infoPages.map(
    (page, index) =>
      `[INFO ${index + 1}] ${page.title} (${page.url})\n${page.text.slice(0, profile.infoTextChars)}`
  );
  const stores = storePages.map(
    ({ page, product, storeName, country }, index) =>
      `[STORE ${index + 1}] ${storeName}, ${country} (${page.url})\nProduct on page: ${product.name ?? page.title}, ${product.currency} ${product.price}\n${page.text.slice(0, profile.storeTextChars)}`
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

interface WineProgress {
  report: (stage: string, share: number) => void;
}

function wineProgress(
  run: ResearchRun,
  index: number,
  total: number,
  from: number
): WineProgress {
  const span = (1 - from) / Math.max(total, 1);
  return {
    report: (stage, share) =>
      run.context.report(stage, from + span * index + span * share),
  };
}

export async function researchWine(
  identity: WineIdentity,
  options: ResearchOptions = {},
  progress?: WineProgress
): Promise<ResearchedWine | null> {
  const run = resolveRun(options);
  const step = progress ?? wineProgress(run, 0, 1, 0);
  const label = wineLabel(identity);
  step.report(`Checking stores for ${label}`, 0);
  const brazilianPages = await findBrazilianStorePages(label, run);
  const [storePages, infoPages] = await Promise.all([
    brazilianPages.length > 0
      ? brazilianPages
      : findInternationalStorePages(label, run),
    findInfoPages(
      label,
      new Set(brazilianPages.map(({ page }) => page.url)),
      run
    ),
  ]);

  step.report(`Writing up ${label}`, PROGRESS.wine.stores);
  const record = await chatJson<WineRecord>({
    schema: WINE_RECORD_SCHEMA,
    signal: run.context.signal,
    system: WINE_EXTRACT_PROMPT,
    user: `WINE: ${identity.name}; producer: ${identity.producer ?? "unknown"}; vintage: ${identity.vintage ?? "none requested"}\n\nSOURCES:\n\n${describeSources(infoPages, storePages, run.profile)}`,
  });

  logger.info(
    {
      found: record.found,
      infoPages: infoPages.length,
      matching: record.matchingStorePages,
      profile: run.profile.name,
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

  step.report(`Checking photos for ${label}`, PROGRESS.wine.writeUp);
  const { photo, wrongPages } = await chooseStorePhoto(
    fields,
    matchingPages.flatMap(({ page }) =>
      page.images[0] ? [{ imageUrl: page.images[0], pageUrl: page.url }] : []
    ),
    { maxChecks: run.profile.photoChecks, signal: run.context.signal }
  );
  step.report(`Saving ${label}`, PROGRESS.wine.photos);
  return {
    ...fields,
    listings: toListings(storePages, matchingStorePages).filter(
      (listing) => !wrongPages.includes(listing.url)
    ),
    photo,
    vintage: identity.vintage ?? fields.vintage ?? null,
  };
}

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

async function researchIdentities(
  identities: WineIdentity[],
  run: ResearchRun,
  from: number
): Promise<ResearchedWine[]> {
  const researched = await Promise.all(
    identities.map((identity, index) =>
      researchWine(
        identity,
        run,
        wineProgress(run, index, identities.length, from)
      )
    )
  );
  return mergeDuplicateWines(
    researched.filter((wine): wine is ResearchedWine => wine !== null)
  );
}

export async function researchWinesByQuery(
  query: string,
  options: ResearchOptions = {}
): Promise<ResearchedWine[]> {
  const run = resolveRun(options);
  run.context.report("Searching the web", 0);
  const identities = await identifyWines(query, run);
  run.context.report(
    identities.length > 0
      ? `Found ${identities.length} ${identities.length === 1 ? "wine" : "wines"} to research`
      : "Nothing matched",
    PROGRESS.identified
  );
  return researchIdentities(identities, run, PROGRESS.identified);
}

async function readLabel(
  image: Buffer,
  run: ResearchRun
): Promise<LabelReading> {
  const prepared = await prepareLabelScanForVision(image);
  return chatJson<LabelReading>({
    images: [prepared.toString("base64")],
    schema: LABEL_READING_SCHEMA,
    signal: run.context.signal,
    system: LABEL_READING_PROMPT,
    user: "Identify this wine from its label photo.",
  });
}

async function identityFromReading(
  reading: LabelReading,
  run: ResearchRun
): Promise<WineIdentity> {
  const fromLabel: WineIdentity = {
    name: reading.name ?? "",
    producer: reading.producer,
    vintage: reading.vintage === "NV" ? null : reading.vintage,
  };
  if (reading.confidence === "high") {
    return fromLabel;
  }
  run.context.report(
    "Double-checking the label on the web",
    PROGRESS.labelRead
  );
  const [confirmed] = await identifyWines(wineLabel(fromLabel), run);
  return confirmed
    ? { ...confirmed, vintage: fromLabel.vintage ?? confirmed.vintage }
    : fromLabel;
}

export async function researchWineFromPhoto(
  image: Buffer,
  options: ResearchOptions = {}
): Promise<ResearchedWine[]> {
  const run = resolveRun(options);
  run.context.report("Reading the label", 0);
  const reading = await readLabel(image, run);
  if (!(reading.readable && reading.name)) {
    return [];
  }
  const identity = await identityFromReading(reading, run);
  run.context.report(`Read ${wineLabel(identity)}`, PROGRESS.identified);
  return researchIdentities([identity], run, PROGRESS.identified);
}
