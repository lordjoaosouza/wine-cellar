import { describe, expect, it } from "vitest";
import {
  BRAZILIAN_STORES,
  cleanStoreName,
  isExcludedUrl,
  knownStoreFor,
  storeCountry,
  storeNameFromUrl,
} from "../../src/modules/wines/wine-stores.js";

describe("wine stores", () => {
  it("recognizes known stores, including subdomains", () => {
    expect(
      knownStoreFor("https://loja.grandcru.com.br/p/1", BRAZILIAN_STORES)?.name
    ).toBe("Grand Cru");
    expect(
      knownStoreFor("https://notgrandcru.com.br/p/1", BRAZILIAN_STORES)
    ).toBeNull();
  });

  it("excludes marketplaces and aggregators", () => {
    expect(isExcludedUrl("https://produto.mercadolivre.com.br/MLB-1")).toBe(
      true
    );
    expect(isExcludedUrl("https://www.vivino.com/wines/1")).toBe(true);
    expect(isExcludedUrl("https://www.ciadovinho.com.br/catena")).toBe(false);
    expect(isExcludedUrl("not a url")).toBe(true);
  });

  it("works out a store's country from its domain, then its currency", () => {
    expect(storeCountry("https://www.ciadovinho.com.br/x", "BRL")).toBe(
      "Brazil"
    );
    expect(storeCountry("https://www.majestic.co.uk/x", "GBP")).toBe(
      "United Kingdom"
    );
    expect(storeCountry("https://shop.example.com/x", "USD")).toBe(
      "United States"
    );
  });

  it("names stores without og:site_name after their host", () => {
    expect(storeNameFromUrl("https://www.boccati.com.br/vinho")).toBe(
      "boccati.com.br"
    );
  });

  it("drops slogans from og:site_name", () => {
    expect(
      cleanStoreName("Vida Vino | Vinhos Selecionados, Espumantes e Azeites.")
    ).toBe("Vida Vino");
    expect(cleanStoreName("Adega Brasil - Vinhos")).toBe("Adega Brasil");
    expect(cleanStoreName("Grand Cru")).toBe("Grand Cru");
    expect(cleanStoreName("Casa Santa-Luzia")).toBe("Casa Santa-Luzia");
    expect(cleanStoreName("EMPÓRIO ITIÊ")).toBe("Empório Itiê");
    expect(cleanStoreName("VINHOS E VINHOS")).toBe("Vinhos e Vinhos");
    expect(cleanStoreName("K&L Wine Merchants")).toBe("K&L Wine Merchants");
  });
});
