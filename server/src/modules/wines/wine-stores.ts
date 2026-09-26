export interface Store {
  country: string;
  /** Registrable domain; subdomains (www., loja.) match too. */
  domain: string;
  name: string;
}

/**
 * Well-known Brazilian wine retailers and importers. Any store whose product
 * page carries a price counts; these are just tried first.
 */
export const BRAZILIAN_STORES: Store[] = [
  { country: "Brazil", domain: "wine.com.br", name: "Wine" },
  { country: "Brazil", domain: "evino.com.br", name: "Evino" },
  { country: "Brazil", domain: "grandcru.com.br", name: "Grand Cru" },
  { country: "Brazil", domain: "mistral.com.br", name: "Mistral" },
  { country: "Brazil", domain: "worldwine.com.br", name: "World Wine" },
  { country: "Brazil", domain: "vinci.com.br", name: "Vinci" },
  { country: "Brazil", domain: "decanter.com.br", name: "Decanter" },
  { country: "Brazil", domain: "divvino.com.br", name: "Divvino" },
  { country: "Brazil", domain: "sonoma.com.br", name: "Sonoma" },
  { country: "Brazil", domain: "portoaporto.com.br", name: "Porto a Porto" },
  { country: "Brazil", domain: "superadega.com.br", name: "Super Adega" },
  {
    country: "Brazil",
    domain: "casasantaluzia.com.br",
    name: "Casa Santa Luzia",
  },
  { country: "Brazil", domain: "zonasul.com.br", name: "Zona Sul" },
  { country: "Brazil", domain: "paodeacucar.com", name: "Pão de Açúcar" },
];

/** Well-known stores abroad, tried first when no Brazilian store sells the wine. */
export const INTERNATIONAL_STORES: Store[] = [
  { country: "United States", domain: "wine.com", name: "Wine.com" },
  {
    country: "United States",
    domain: "totalwine.com",
    name: "Total Wine & More",
  },
  {
    country: "United States",
    domain: "klwines.com",
    name: "K&L Wine Merchants",
  },
  { country: "United States", domain: "astorwines.com", name: "Astor Wines" },
  { country: "United States", domain: "wallywine.com", name: "Wally's" },
  { country: "United Kingdom", domain: "majestic.co.uk", name: "Majestic" },
  {
    country: "United Kingdom",
    domain: "thewinesociety.com",
    name: "The Wine Society",
  },
  { country: "United Kingdom", domain: "bbr.com", name: "Berry Bros. & Rudd" },
  { country: "France", domain: "vinatis.com", name: "Vinatis" },
  { country: "France", domain: "millesima.fr", name: "Millésima" },
  { country: "Spain", domain: "decantalo.com", name: "Decántalo" },
  { country: "Germany", domain: "vinello.de", name: "Vinello" },
];

/**
 * Marketplaces and aggregators: never a store (third-party sellers, averages)
 * and not a trustworthy description of the wine either.
 */
const EXCLUDED_DOMAINS = [
  "mercadolivre.com.br",
  "mercadolibre.com",
  "amazon.com",
  "amazon.com.br",
  "shopee.com.br",
  "magazineluiza.com.br",
  "americanas.com.br",
  "casasbahia.com.br",
  "carrefour.com.br",
  "ebay.com",
  "aliexpress.com",
  "vivino.com",
  "wine-searcher.com",
  "google.com",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "pinterest.com",
  "reddit.com",
];

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function knownStoreFor(url: string, stores: Store[]): Store | null {
  const hostname = hostnameOf(url);
  if (!hostname) {
    return null;
  }
  return stores.find((store) => matchesDomain(hostname, store.domain)) ?? null;
}

/** Marketplaces, aggregators and social sites — never used as a source. */
export function isExcludedUrl(url: string): boolean {
  const hostname = hostnameOf(url);
  return (
    !hostname ||
    EXCLUDED_DOMAINS.some((domain) => matchesDomain(hostname, domain))
  );
}

const WWW_PREFIX_PATTERN = /^www\./;
const SITE_NAME_SEPARATOR_PATTERN = /\s+[|–—-]\s+|:\s+/;

const COUNTRY_BY_TLD: [string, string][] = [
  [".com.br", "Brazil"],
  [".br", "Brazil"],
  [".co.uk", "United Kingdom"],
  [".uk", "United Kingdom"],
  [".fr", "France"],
  [".de", "Germany"],
  [".es", "Spain"],
  [".it", "Italy"],
  [".pt", "Portugal"],
  [".ch", "Switzerland"],
  [".ca", "Canada"],
  [".com.au", "Australia"],
  [".co.nz", "New Zealand"],
  [".co.za", "South Africa"],
];

const COUNTRY_BY_CURRENCY: Record<string, string> = {
  AUD: "Australia",
  BRL: "Brazil",
  CAD: "Canada",
  CHF: "Switzerland",
  GBP: "United Kingdom",
  NZD: "New Zealand",
  USD: "United States",
  ZAR: "South Africa",
};

/** Where a store sells: its domain, else the currency it prices in. */
export function storeCountry(url: string, currency: string | null): string {
  const hostname = hostnameOf(url) ?? "";
  const byTld = COUNTRY_BY_TLD.find(([tld]) => hostname.endsWith(tld));
  if (byTld) {
    return byTld[1];
  }
  return (currency && COUNTRY_BY_CURRENCY[currency]) ?? "Europe";
}

/** "www.ciadovinho.com.br" → "ciadovinho.com.br", for stores without og:site_name. */
export function storeNameFromUrl(url: string): string {
  return (hostnameOf(url) ?? url).replace(WWW_PREFIX_PATTERN, "");
}

const LOWERCASE_JOINERS = new Set(["a", "da", "das", "de", "do", "dos", "e"]);

/** "EMPÓRIO ITIÊ" → "Empório Itiê", keeping "e", "do", "da"... lowercase. */
function titleCaseShouting(name: string): string {
  if (name !== name.toUpperCase() || name === name.toLowerCase()) {
    return name;
  }
  return name
    .toLowerCase()
    .split(" ")
    .map((word, index) =>
      index > 0 && LOWERCASE_JOINERS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

/** "Vida Vino | Vinhos Selecionados e Azeites" → "Vida Vino". */
export function cleanStoreName(siteName: string): string {
  const [name = siteName] = siteName.split(SITE_NAME_SEPARATOR_PATTERN);
  return titleCaseShouting(name.trim() || siteName.trim());
}
