import { describe, expect, it } from "vitest";
import {
  agingNotesFor,
  normalizeGuideScore,
  servingNotesFor,
} from "../../src/modules/wines/wine-notes.js";

const CHILLED_PATTERN = /chilled/i;
const ROOM_TEMPERATURE_PATTERN = /room temperature/i;
const AGING_POTENTIAL_PATTERN = /aging potential/i;
const APPROACHABLE_NOW_PATTERN = /approachable now/i;
const YOUNG_PATTERN = /young/i;

describe("servingNotesFor", () => {
  it("returns null for an unknown type", () => {
    expect(servingNotesFor(null)).toBeNull();
  });

  it("suggests chilled serving for sparkling wine", () => {
    expect(servingNotesFor("Sparkling wine")).toMatch(CHILLED_PATTERN);
  });

  it("suggests cool room temperature for dry red", () => {
    expect(servingNotesFor("Dry red")).toMatch(ROOM_TEMPERATURE_PATTERN);
  });
});

describe("agingNotesFor", () => {
  it("returns null for an unknown type", () => {
    expect(agingNotesFor(null, [])).toBeNull();
  });

  it("gives full-bodied red grapes strong aging potential", () => {
    expect(agingNotesFor("Dry red", ["Cabernet Sauvignon"])).toMatch(
      AGING_POTENTIAL_PATTERN
    );
  });

  it("gives light red grapes a shorter aging window", () => {
    expect(agingNotesFor("Dry red", ["Gamay"])).toMatch(
      APPROACHABLE_NOW_PATTERN
    );
  });

  it("treats sparkling wine as drink-young regardless of grapes", () => {
    expect(agingNotesFor("Sparkling wine", ["Cabernet Sauvignon"])).toMatch(
      YOUNG_PATTERN
    );
  });
});

describe("normalizeGuideScore", () => {
  it("passes through an already-0-5 star score", () => {
    expect(normalizeGuideScore(4.6)).toBe(4.6);
  });

  it("halves a 10-point score", () => {
    expect(normalizeGuideScore(8.4)).toBe(4.2);
  });

  it("scales a 20-point score down to 5 stars", () => {
    expect(normalizeGuideScore(17.5)).toBe(4.4);
  });

  it("scales a 100-point score down to 5 stars", () => {
    expect(normalizeGuideScore(92)).toBe(4.6);
  });

  it("clamps to 5 for an out-of-range value", () => {
    expect(normalizeGuideScore(105)).toBeLessThanOrEqual(5);
  });

  it("returns null for null input", () => {
    expect(normalizeGuideScore(null)).toBeNull();
  });

  it("returns null for a non-finite value", () => {
    expect(normalizeGuideScore(Number.NaN)).toBeNull();
  });
});
