import { logger } from "./logger.js";

// Currencies Frankfurter (ECB reference rates) can convert to BRL. Listings
// from stores abroad in any other currency are skipped.
export const FOREIGN_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "ZAR",
  "MXN",
  "JPY",
  "SEK",
  "NOK",
  "DKK",
] as const;

export type ForeignCurrency = (typeof FOREIGN_CURRENCIES)[number];

const RATES_URL = "https://api.frankfurter.dev/v1/latest?base=BRL";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

/** How many BRL one unit of each currency costs, e.g. { USD: 5.18 }. */
export type BrlRates = Record<string, number>;

let cached: { fetchedAt: number; rates: BrlRates } | null = null;
let inflight: Promise<BrlRates | null> | null = null;

async function fetchBrlRates(): Promise<BrlRates | null> {
  try {
    const response = await fetch(RATES_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, "exchange rates fetch failed");
      return null;
    }
    // base=BRL gives units of each currency per 1 BRL; invert to BRL per unit.
    const body = (await response.json()) as { rates?: Record<string, number> };
    const rates: BrlRates = {};
    for (const [currency, perBrl] of Object.entries(body.rates ?? {})) {
      if (Number.isFinite(perBrl) && perBrl > 0) {
        rates[currency] = 1 / perBrl;
      }
    }
    return rates;
  } catch (error) {
    logger.warn({ err: error }, "exchange rates fetch failed");
    return null;
  }
}

/**
 * Current BRL rates, cached for 12h. Falls back to the last good rates when
 * the API is down, and to null when there has never been a successful fetch.
 */
export async function getBrlRates(): Promise<BrlRates | null> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rates;
  }
  inflight ??= fetchBrlRates().finally(() => {
    inflight = null;
  });
  const rates = await inflight;
  if (rates) {
    cached = { fetchedAt: Date.now(), rates };
    return rates;
  }
  return cached?.rates ?? null;
}

export function resetBrlRatesCache(): void {
  cached = null;
  inflight = null;
}
