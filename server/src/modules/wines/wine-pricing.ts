import { z } from "zod";
import type { BrlRates } from "../../lib/exchange-rates.js";

export interface StoreListing {
  amount: number;
  country: string;
  currency: string;
  store: string;
  url: string;
}

export const wineOfferSchema = z.object({
  amount: z.number(),
  amountBrl: z.number(),
  country: z.string(),
  currency: z.string(),
  store: z.string(),
  url: z.string(),
});

export type WineOffer = z.infer<typeof wineOfferSchema>;

export type PriceMarket = "BR" | "INTERNATIONAL";

const HTTP_URL_PATTERN = /^https?:\/\//i;
const THOUSANDS_PATTERN = /\B(?=(\d{3})+(?!\d))/g;

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function isValidOffer(offer: StoreListing): boolean {
  return (
    offer.store.trim().length > 0 &&
    HTTP_URL_PATTERN.test(offer.url) &&
    Number.isFinite(offer.amount) &&
    offer.amount > 0
  );
}

export function toWineOffers(
  offers: StoreListing[],
  rates: BrlRates | null
): WineOffer[] {
  const seenStores = new Set<string>();
  const result: WineOffer[] = [];

  for (const offer of offers) {
    const storeKey = offer.store.trim().toLocaleLowerCase("en-US");
    if (!isValidOffer(offer) || seenStores.has(storeKey)) {
      continue;
    }
    const currency = offer.currency.toUpperCase();
    const rate = currency === "BRL" ? 1 : rates?.[currency];
    if (!rate) {
      continue;
    }
    seenStores.add(storeKey);
    result.push({
      amount: offer.amount,
      amountBrl: roundCents(offer.amount * rate),
      country: offer.country.trim(),
      currency,
      store: offer.store.trim(),
      url: offer.url,
    });
  }

  return result;
}

function median(sorted: number[]): number {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
    : (sorted[middle] as number);
}

export function aggregatePrices(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  if (values.length <= 2) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = median(sorted);
  const kept = sorted.filter((value) => value <= mid * 2 && value >= mid / 2);
  return median(kept);
}

export function roundBrlPrice(value: number): number {
  let step = 50;
  if (value < 100) {
    step = 5;
  } else if (value < 1000) {
    step = 10;
  }
  return Math.max(step, Math.round(value / step) * step);
}

export function formatBrlPrice(value: number): string {
  return `~R$ ${String(value).replace(THOUSANDS_PATTERN, ".")}`;
}

export function priceFromOffers(offers: WineOffer[]): {
  market: PriceMarket | null;
  price: string | null;
} {
  const brazilian = offers.filter((offer) => offer.currency === "BRL");
  const market: PriceMarket = brazilian.length > 0 ? "BR" : "INTERNATIONAL";
  const tier = market === "BR" ? brazilian : offers;
  const aggregated = aggregatePrices(tier.map((offer) => offer.amountBrl));
  if (aggregated === null) {
    return { market: null, price: null };
  }
  return { market, price: formatBrlPrice(roundBrlPrice(aggregated)) };
}

export function wineOffersFromJson(value: unknown): WineOffer[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const parsed = wineOfferSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
