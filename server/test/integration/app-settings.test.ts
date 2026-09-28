import { beforeEach, describe, expect, it } from "vitest";
import {
  getSetting,
  resetSettingsCache,
  setSetting,
} from "../../src/lib/app-settings.js";
import { prisma } from "../../src/lib/prisma.js";
import { resetDb } from "./helpers.js";

describe("app settings", () => {
  beforeEach(async () => {
    await resetDb();
    resetSettingsCache();
  });

  it("falls back to the environment default", async () => {
    expect(await getSetting("ai.activeModel")).toBe("qwen3.5:9b");
    expect(await getSetting("ai.researchProfile")).toBe("thorough");
  });

  it("persists values and serves them from the cache afterwards", async () => {
    await setSetting("ai.researchProfile", "fast");
    resetSettingsCache();
    expect(await getSetting("ai.researchProfile")).toBe("fast");
    await prisma.appSetting.deleteMany();
    expect(await getSetting("ai.researchProfile")).toBe("fast");
  });

  it("ignores a stored value that no longer validates", async () => {
    await prisma.appSetting.create({
      data: { key: "ai.researchProfile", value: "sloppy" },
    });
    expect(await getSetting("ai.researchProfile")).toBe("thorough");
  });
});
