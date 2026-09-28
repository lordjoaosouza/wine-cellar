import { describe, expect, it } from "vitest";
import {
  normalizedTextKey,
  stripLinks,
  wineNormalizedKey,
} from "../../src/modules/wines/wine-normalize.js";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

describe("normalizedTextKey", () => {
  it("strips diacritics and lowercases", () => {
    expect(normalizedTextKey("Luján de Cuyo")).toBe("lujan de cuyo");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizedTextKey("  Mendoza  ")).toBe("mendoza");
  });
});

describe("wineNormalizedKey", () => {
  it("produces the same key for the same producer, name and vintage", () => {
    const a = wineNormalizedKey(
      "Bodega Catena Zapata",
      "Catena Alta Malbec",
      "2021"
    );
    const b = wineNormalizedKey(
      "Bodega Catena Zapata",
      "Catena Alta Malbec",
      "2021"
    );
    expect(a).toBe(b);
  });

  it("produces different keys for different vintages", () => {
    const a = wineNormalizedKey(
      "Bodega Catena Zapata",
      "Catena Alta Malbec",
      "2021"
    );
    const b = wineNormalizedKey(
      "Bodega Catena Zapata",
      "Catena Alta Malbec",
      "2020"
    );
    expect(a).not.toBe(b);
  });

  it("treats a null vintage as its own bucket distinct from a specific vintage", () => {
    const withVintage = wineNormalizedKey(
      "Miolo",
      "Single Vineyard Syrah",
      "2020"
    );
    const withoutVintage = wineNormalizedKey(
      "Miolo",
      "Single Vineyard Syrah",
      null
    );
    expect(withVintage).not.toBe(withoutVintage);
  });

  it("is resilient to a missing producer", () => {
    expect(() => wineNormalizedKey(null, "Some Wine", null)).not.toThrow();
    expect(wineNormalizedKey(null, "Some Wine", null).length).toBeGreaterThan(
      0
    );
  });

  it("only produces URL-safe slug characters", () => {
    const key = wineNormalizedKey("Château d'Yquem", "Sauternes", "2015");
    expect(key).toMatch(SLUG_PATTERN);
  });
});

describe("stripLinks", () => {
  it("drops a parenthesized markdown citation", () => {
    expect(
      stripLinks(
        "The grapes are sourced from Gouveia and Nelas in the Dão ([rocim.pt](https://rocim.pt/catalogo.pdf?utm_source=openai))."
      )
    ).toBe("The grapes are sourced from Gouveia and Nelas in the Dão.");
  });

  it("keeps the label of an inline markdown link", () => {
    expect(
      stripLinks("See [the producer](https://example.com) for more.")
    ).toBe("See the producer for more.");
  });

  it("removes bare URLs", () => {
    expect(stripLinks("Founded in 1902 https://example.com/about today.")).toBe(
      "Founded in 1902 today."
    );
  });

  it("leaves clean text and null untouched", () => {
    expect(stripLinks("A clean sentence, with (parentheses).")).toBe(
      "A clean sentence, with (parentheses)."
    );
    expect(stripLinks(null)).toBeNull();
  });
});
