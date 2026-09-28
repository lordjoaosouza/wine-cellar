import { describe, expect, it } from "vitest";
import {
  clampProgress,
  formatBytes,
  formatDownload,
  formatPercent,
} from "@/utils/format-progress";

describe("clampProgress", () => {
  it("keeps values between 0 and 1 and ignores NaN", () => {
    expect(clampProgress(-1)).toBe(0);
    expect(clampProgress(0.42)).toBe(0.42);
    expect(clampProgress(7)).toBe(1);
    expect(clampProgress(Number.NaN)).toBe(0);
  });
});

describe("formatPercent", () => {
  it("rounds to whole percents", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.256)).toBe("26%");
    expect(formatPercent(1)).toBe("100%");
  });
});

describe("formatBytes", () => {
  it("picks GB, MB or KB", () => {
    expect(formatBytes(6.6 * 1024 ** 3)).toBe("6.6 GB");
    expect(formatBytes(512 * 1024 ** 2)).toBe("512 MB");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(null)).toBe("—");
  });
});

describe("formatDownload", () => {
  it("describes the transferred share, or a placeholder before the size is known", () => {
    expect(formatDownload(0, 0)).toBe("Starting…");
    expect(formatDownload(1024 ** 3, 4 * 1024 ** 3)).toBe("1.0 GB of 4.0 GB");
  });
});
