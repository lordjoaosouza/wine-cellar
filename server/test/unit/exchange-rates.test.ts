import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBrlRates,
  resetBrlRatesCache,
} from "../../src/lib/exchange-rates.js";

function ratesResponse(rates: Record<string, number>): Response {
  return new Response(JSON.stringify({ base: "BRL", rates }), { status: 200 });
}

describe("getBrlRates", () => {
  beforeEach(() => {
    resetBrlRatesCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("inverts BRL-based rates into reais per unit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(ratesResponse({ EUR: 0.16, USD: 0.2 }))
    );
    const rates = await getBrlRates();
    expect(rates?.USD).toBeCloseTo(5);
    expect(rates?.EUR).toBeCloseTo(6.25);
  });

  it("caches rates between calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ratesResponse({ USD: 0.2 }));
    vi.stubGlobal("fetch", fetchMock);
    await getBrlRates();
    await getBrlRates();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the last good rates when a refresh fails", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ratesResponse({ USD: 0.2 }))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    await getBrlRates();
    vi.advanceTimersByTime(13 * 60 * 60 * 1000);
    const rates = await getBrlRates();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(rates?.USD).toBeCloseTo(5);
  });

  it("returns null when rates have never been fetched", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await getBrlRates()).toBeNull();
  });
});
