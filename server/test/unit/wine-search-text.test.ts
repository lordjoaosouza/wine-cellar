import { describe, expect, it } from "vitest";
import {
  normalizedQuery,
  searchTokens,
  wineSearchText,
} from "../../src/modules/wines/wine-search-text.js";

describe("searchTokens", () => {
  it("lowercases, strips accents and drops one-letter noise", () => {
    expect(searchTokens("  Luján de Cuyo Malbec ")).toEqual([
      "lujan",
      "de",
      "cuyo",
      "malbec",
    ]);
    expect(searchTokens("a Château d'Yquem")).toEqual(["chateau", "yquem"]);
  });

  it("deduplicates repeated words", () => {
    expect(searchTokens("malbec MALBEC")).toEqual(["malbec"]);
    expect(searchTokens("")).toEqual([]);
  });
});

describe("wineSearchText", () => {
  it("joins every searchable field into one normalized string", () => {
    expect(
      wineSearchText({
        country: "Argentina",
        grapes: ["Malbec", "Cabernet Sauvignon"],
        name: "Catena Malbec",
        region: "Mendoza",
        vintage: "2021",
        winery: "Bodega Catena Zapata",
      })
    ).toBe(
      "catena malbec bodega catena zapata mendoza argentina 2021 malbec cabernet sauvignon"
    );
  });

  it("copes with missing fields", () => {
    expect(
      wineSearchText({
        country: null,
        grapes: [],
        name: "Barolo",
        region: null,
        vintage: null,
        winery: null,
      })
    ).toBe("barolo");
  });
});

describe("normalizedQuery", () => {
  it("is stable across spacing, casing and accents", () => {
    expect(normalizedQuery("Catena  MALBEC")).toBe(
      normalizedQuery("catena malbec")
    );
    expect(normalizedQuery("São Paulo")).toBe("sao paulo");
  });
});
