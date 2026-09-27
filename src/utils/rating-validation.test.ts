import { describe, expect, it } from "vitest";
import { validateRatingForm } from "@/utils/rating-validation";

const complete = {
  balance: 3 as const,
  complexity: 4 as const,
  conclusion: "Lovely",
  emotion: 5 as const,
  intensity: 2 as const,
  nose: "Cherries",
  palate: "Silky",
  persistence: 3 as const,
  score: "8,5",
  visual: "Ruby",
};

describe("validateRatingForm", () => {
  it("accepts a complete draft and normalizes the score", () => {
    const result = validateRatingForm(complete);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.values.score).toBe(8.5);
      expect(result.values.nose).toBe("Cherries");
    }
  });

  it("returns one message per field that needs attention", () => {
    const result = validateRatingForm({
      ...complete,
      conclusion: "  ",
      score: "eleven",
      visual: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.errors).sort()).toEqual([
        "conclusion",
        "score",
        "visual",
      ]);
      expect(result.errors.score).toContain("number");
    }
  });

  it("keeps the score within 0 and 10", () => {
    const result = validateRatingForm({ ...complete, score: "10.4" });
    expect(result.success).toBe(false);
  });
});
