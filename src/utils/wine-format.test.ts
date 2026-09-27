import { describe, expect, it } from "vitest";
import {
  formatOfferAmount,
  normalizedTextKey,
  photoFillsFrame,
  storeDomain,
  toDisplayCase,
  wineOrigin,
  wineVintageDetails,
} from "@/utils/wine-format";

describe("toDisplayCase", () => {
  it("title-cases words but keeps short abbreviations", () => {
    expect(toDisplayCase("dry red")).toBe("Dry Red");
    expect(toDisplayCase("sparkling_rose / NV")).toBe("Sparkling Rose / NV");
    expect(toDisplayCase("DOCG wine")).toBe("DOCG Wine");
    expect(toDisplayCase(null)).toBeNull();
  });
});

describe("normalizedTextKey", () => {
  it("strips accents and case", () => {
    expect(normalizedTextKey("  Château Pétrus ")).toBe("chateau petrus");
  });
});

describe("wine summaries", () => {
  it("joins type and vintage with a middle dot", () => {
    expect(wineVintageDetails({ type: "Dry red", vintage: "2019" })).toBe(
      "Dry Red · 2019"
    );
    expect(wineVintageDetails({ type: null, vintage: null })).toBe(
      "Vintage not listed"
    );
  });

  it("joins producer, region and country", () => {
    expect(
      wineOrigin({ country: "Argentina", region: "Mendoza", winery: "Catena" })
    ).toBe("Catena · Mendoza · Argentina");
    expect(wineOrigin({ country: null, region: null, winery: null })).toBe(
      "Producer not listed"
    );
  });
});

describe("formatOfferAmount", () => {
  it("formats reais in Brazilian style and other currencies in English", () => {
    expect(formatOfferAmount(189.9, "BRL").replace(/ /g, " ")).toBe(
      "R$ 189,90"
    );
    expect(formatOfferAmount(24.99, "USD")).toBe("$24.99");
    expect(formatOfferAmount(10, "R$")).toBe("R$ 10.00");
  });
});

describe("photoFillsFrame / storeDomain", () => {
  it("fills the frame only for scanned labels", () => {
    expect(photoFillsFrame("LABEL_SCAN")).toBe(true);
    expect(photoFillsFrame("WEB")).toBe(false);
    expect(photoFillsFrame(null)).toBe(false);
  });

  it("extracts a store's domain without www", () => {
    expect(storeDomain("https://www.vinhosevinhos.com/miolo.html")).toBe(
      "vinhosevinhos.com"
    );
    expect(storeDomain("not a url")).toBeNull();
  });
});
