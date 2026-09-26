import { describe, expect, it } from "vitest";
import {
  aggregatePrices,
  formatBrlPrice,
  type GptWineOffer,
  priceFromOffers,
  roundBrlPrice,
  toWineOffers,
  wineOffersFromJson,
} from "../../src/modules/wines/wine-pricing.js";

function offer(overrides: Partial<GptWineOffer>): GptWineOffer {
  return {
    amount: 100,
    country: "Brazil",
    currency: "BRL",
    store: "Store",
    url: "https://store.example/wine",
    ...overrides,
  };
}

describe("toWineOffers", () => {
  it("keeps BRL offers as-is", () => {
    const [result] = toWineOffers([offer({ amount: 189.9 })], null);
    expect(result).toMatchObject({ amount: 189.9, amountBrl: 189.9 });
  });

  it("converts foreign offers with the given rates", () => {
    const [result] = toWineOffers(
      [offer({ amount: 20, country: "United States", currency: "usd" })],
      { USD: 5.1821 }
    );
    expect(result).toMatchObject({
      amount: 20,
      amountBrl: 103.64,
      currency: "USD",
    });
  });

  it("drops foreign offers when there is no rate for their currency", () => {
    const foreign = offer({ currency: "EUR" });
    expect(toWineOffers([foreign], null)).toEqual([]);
    expect(toWineOffers([foreign], { USD: 5 })).toEqual([]);
  });

  it("drops invalid offers and keeps one per store", () => {
    const results = toWineOffers(
      [
        offer({ store: "Evino" }),
        offer({ amount: 120, store: " evino " }),
        offer({ amount: 0, store: "Zero" }),
        offer({ store: "No URL", url: "store.example/wine" }),
        offer({ store: "  " }),
      ],
      null
    );
    expect(results.map((result) => result.store)).toEqual(["Evino"]);
  });
});

describe("aggregatePrices", () => {
  it("returns null without prices", () => {
    expect(aggregatePrices([])).toBeNull();
  });

  it("uses a single price as-is and averages two", () => {
    expect(aggregatePrices([150])).toBe(150);
    expect(aggregatePrices([100, 140])).toBe(120);
  });

  it("takes the median of three or more after dropping outliers", () => {
    expect(aggregatePrices([100, 110, 130])).toBe(110);
    // 500 is more than double the median (120) and is discarded.
    expect(aggregatePrices([100, 120, 140, 500])).toBe(120);
  });
});

describe("roundBrlPrice", () => {
  it("rounds to 5 below R$ 100, 10 up to R$ 999 and 50 above", () => {
    expect(roundBrlPrice(87)).toBe(85);
    expect(roundBrlPrice(88)).toBe(90);
    expect(roundBrlPrice(244)).toBe(240);
    expect(roundBrlPrice(1372)).toBe(1350);
  });

  it("never rounds a real price down to zero", () => {
    expect(roundBrlPrice(2)).toBe(5);
  });
});

describe("formatBrlPrice", () => {
  it("uses a dot as thousands separator", () => {
    expect(formatBrlPrice(85)).toBe("~R$ 85");
    expect(formatBrlPrice(1350)).toBe("~R$ 1.350");
  });
});

describe("priceFromOffers", () => {
  it("prefers Brazilian offers and ignores foreign ones when any exist", () => {
    const offers = toWineOffers(
      [
        offer({ amount: 199.9, store: "Grand Cru" }),
        offer({ amount: 10, currency: "USD", store: "Total Wine" }),
      ],
      { USD: 5 }
    );
    expect(priceFromOffers(offers)).toEqual({
      market: "BR",
      price: "~R$ 200",
    });
  });

  it("falls back to converted foreign offers without a Brazilian one", () => {
    const offers = toWineOffers(
      [
        offer({ amount: 30, currency: "USD", store: "Total Wine" }),
        offer({ amount: 25, currency: "EUR", store: "Vinatis" }),
      ],
      { EUR: 6, USD: 5 }
    );
    // (150 + 150) / 2 = 150
    expect(priceFromOffers(offers)).toEqual({
      market: "INTERNATIONAL",
      price: "~R$ 150",
    });
  });

  it("returns no price without offers", () => {
    expect(priceFromOffers([])).toEqual({ market: null, price: null });
  });
});

describe("wineOffersFromJson", () => {
  it("drops malformed entries and non-array values", () => {
    const [valid] = toWineOffers([offer({})], null);
    expect(wineOffersFromJson([valid, { store: "broken" }])).toEqual([valid]);
    expect(wineOffersFromJson(null)).toEqual([]);
  });
});
