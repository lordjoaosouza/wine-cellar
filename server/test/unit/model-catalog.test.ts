import { describe, expect, it } from "vitest";
import {
  catalogModel,
  DEFAULT_MODEL,
  isValidModelName,
  labelForModel,
  MODEL_CATALOG,
} from "../../src/modules/ai/model-catalog.js";

describe("model catalog", () => {
  it("includes the default model", () => {
    expect(catalogModel(DEFAULT_MODEL)?.label).toBe("Qwen 3.5 9B");
    expect(MODEL_CATALOG.map((model) => model.name)).toContain(DEFAULT_MODEL);
  });

  it("has unique names and positive sizes", () => {
    const names = MODEL_CATALOG.map((model) => model.name);
    expect(new Set(names).size).toBe(names.length);
    for (const model of MODEL_CATALOG) {
      expect(model.downloadBytes).toBeGreaterThan(0);
      expect(model.memoryGb).toBeGreaterThan(0);
    }
  });

  it("accepts Ollama-style names and rejects junk", () => {
    for (const name of [
      "qwen3.5:9b",
      "gemma3:4b",
      "user/custom-model:latest",
      "llava",
    ]) {
      expect(isValidModelName(name)).toBe(true);
    }
    for (const name of ["", " ", "a b", "../etc", "model:", "a/b/c"]) {
      expect(isValidModelName(name)).toBe(false);
    }
  });

  it("falls back to the raw name as label", () => {
    expect(labelForModel("gemma3:4b")).toBe("Gemma 3 4B");
    expect(labelForModel("custom:7b")).toBe("custom:7b");
  });
});
