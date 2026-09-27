import { describe, expect, it } from "vitest";
import { wineTypeSlug } from "@/utils/wine-illustration";

describe("wineTypeSlug", () => {
  it("maps a wine type to its illustration file name", () => {
    expect(wineTypeSlug("Sparkling rosé")).toBe("sparkling-rose");
    expect(wineTypeSlug("Dry white")).toBe("dry-white");
  });

  it("falls back to dry red", () => {
    expect(wineTypeSlug(null)).toBe("dry-red");
    expect(wineTypeSlug("???")).toBe("dry-red");
  });
});
