import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageProduct, WebPage } from "../../src/lib/web-page.js";
import type { WebSearchResult } from "../../src/lib/web-search.js";

const searchWeb = vi.fn<(query: string) => Promise<WebSearchResult[]>>();
const fetchWebPage = vi.fn<(url: string) => Promise<WebPage | null>>();
const chatJson = vi.fn();
const chooseStorePhoto = vi.fn();

vi.mock("../../src/lib/web-search.js", () => ({ searchWeb }));
vi.mock("../../src/lib/ollama.js", () => ({ chatJson }));
vi.mock("../../src/modules/wines/wine-photos.js", () => ({ chooseStorePhoto }));
vi.mock("../../src/lib/web-page.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/web-page.js")>()),
  fetchWebPage,
}));

const {
  mergeDuplicateWines,
  researchWine,
  researchWineFromPhoto,
  researchWinesByQuery,
  wineLabel,
} = await import("../../src/modules/wines/wine-research.js");
const { RESEARCH_PROFILE_PRESETS } = await import(
  "../../src/modules/wines/research-profiles.js"
);

const CATENA = {
  name: "Catena Malbec",
  producer: "Bodega Catena Zapata",
  vintage: null,
};

function result(url: string): WebSearchResult {
  return { content: "", title: url, url };
}

function page(url: string, product?: Partial<PageProduct>): WebPage {
  return {
    images: [`${url}/bottle.jpg`],
    products: product
      ? [
          {
            availability: null,
            currency: null,
            image: null,
            name: "Catena Malbec",
            price: null,
            ...product,
          },
        ]
      : [],
    siteName: null,
    text: "Vinho Catena Malbec 750ml. Uvas: Malbec. ".repeat(10),
    title: url,
    url,
  };
}

function record(overrides: object = {}) {
  return {
    country: "Argentina",
    found: true,
    grapes: ["Malbec"],
    matchingStorePages: [],
    name: "Catena Malbec",
    pairings: [],
    producer: "Bodega Catena Zapata",
    producerProfile: null,
    region: "Mendoza",
    regionProfile: null,
    tastingNotes: null,
    type: "Dry red",
    vintage: null,
    ...overrides,
  };
}

const PAGES: Record<string, WebPage> = {
  "https://www.catenawines.com/malbec": page(
    "https://www.catenawines.com/malbec"
  ),
  "https://www.ciadovinho.com.br/catena": page(
    "https://www.ciadovinho.com.br/catena",
    { currency: "BRL", price: 225.9 }
  ),
  "https://www.grandcru.com.br/dv-catena": page(
    "https://www.grandcru.com.br/dv-catena",
    { currency: "BRL", name: "DV Catena Malbec", price: 139 }
  ),
  "https://www.klwines.com/catena": page("https://www.klwines.com/catena", {
    currency: "USD",
    price: 24.99,
  }),
  "https://www.somestore.com/catena": page("https://www.somestore.com/catena", {
    currency: "BRL",
    price: 999,
  }),
};

describe("wineLabel", () => {
  it("adds the producer only when the name doesn't already carry it", () => {
    expect(wineLabel(CATENA)).toBe("Catena Malbec");
    expect(
      wineLabel({
        name: "Casillero del Diablo Reserva Cabernet Sauvignon",
        producer: "Concha y Toro",
        vintage: "2021",
      })
    ).toBe(
      "Concha y Toro Casillero del Diablo Reserva Cabernet Sauvignon 2021"
    );
  });
});

describe("researchWine", () => {
  beforeEach(() => {
    searchWeb.mockReset();
    fetchWebPage.mockReset();
    chatJson.mockReset();
    chooseStorePhoto.mockReset();
    chooseStorePhoto.mockResolvedValue({ photo: null, wrongPages: [] });
    fetchWebPage.mockImplementation((url) =>
      Promise.resolve(PAGES[url] ?? null)
    );
  });

  it("lists only the Brazilian store pages the model matched to this wine", async () => {
    searchWeb.mockResolvedValue([
      result("https://produto.mercadolivre.com.br/catena"),
      result("https://www.ciadovinho.com.br/catena"),
      result("https://www.grandcru.com.br/dv-catena"),
      result("https://www.catenawines.com/malbec"),
    ]);

    chatJson.mockResolvedValue(record({ matchingStorePages: [2] }));

    const wine = await researchWine(CATENA);

    expect(wine?.listings).toEqual([
      {
        amount: 225.9,
        country: "Brazil",
        currency: "BRL",
        store: "ciadovinho.com.br",
        url: "https://www.ciadovinho.com.br/catena",
      },
    ]);

    expect(chooseStorePhoto).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Catena Malbec" }),
      [
        {
          imageUrl: "https://www.ciadovinho.com.br/catena/bottle.jpg",
          pageUrl: "https://www.ciadovinho.com.br/catena",
        },
      ],
      expect.objectContaining({ maxChecks: 2, signal: expect.any(AbortSignal) })
    );
    expect(fetchWebPage).not.toHaveBeenCalledWith(
      "https://produto.mercadolivre.com.br/catena"
    );

    expect(searchWeb).not.toHaveBeenCalledWith(
      expect.stringContaining("wine price"),
      expect.anything()
    );
    const prompt = chatJson.mock.calls[0]?.[0].user as string;
    expect(prompt).toContain("[INFO 1]");
    expect(prompt).toContain("[STORE 2] ciadovinho.com.br, Brazil");
  });

  it("drops store pages whose photo shows a different wine", async () => {
    searchWeb.mockResolvedValue([
      result("https://www.ciadovinho.com.br/catena"),
      result("https://www.grandcru.com.br/dv-catena"),
    ]);
    chatJson.mockResolvedValue(record({ matchingStorePages: [1, 2] }));
    const photo = {
      buffer: Buffer.from("x"),
      extension: ".jpg",
      mimetype: "image/jpeg",
    };
    chooseStorePhoto.mockResolvedValue({
      photo,
      wrongPages: ["https://www.grandcru.com.br/dv-catena"],
    });

    const wine = await researchWine(CATENA);

    expect(wine?.listings.map((listing) => listing.store)).toEqual([
      "ciadovinho.com.br",
    ]);
    expect(wine?.photo).toBe(photo);
  });

  it("falls back to stores abroad when no Brazilian store has a price", async () => {
    searchWeb.mockImplementation((query) =>
      Promise.resolve(
        query.includes("wine price")
          ? [
              result("https://www.klwines.com/catena"),
              result("https://www.somestore.com/catena"),
            ]
          : [result("https://www.catenawines.com/malbec")]
      )
    );
    chatJson.mockResolvedValue(record({ matchingStorePages: [1, 1, 7] }));

    const wine = await researchWine(CATENA);

    expect(wine?.listings).toEqual([
      {
        amount: 24.99,
        country: "United States",
        currency: "USD",
        store: "K&L Wine Merchants",
        url: "https://www.klwines.com/catena",
      },
    ]);
  });

  it("returns null when the sources don't confirm the wine", async () => {
    searchWeb.mockResolvedValue([]);
    chatJson.mockResolvedValue(record({ found: false }));
    expect(await researchWine(CATENA)).toBeNull();
    expect(chatJson.mock.calls[0]?.[0].user).toContain("(no pages found)");
  });

  it("keeps the requested vintage over whatever the model returns", async () => {
    searchWeb.mockResolvedValue([]);
    chatJson.mockResolvedValue(record({ vintage: "2019" }));
    const wine = await researchWine({ ...CATENA, vintage: "2021" });
    expect(wine?.vintage).toBe("2021");
  });
});

describe("research profiles and progress", () => {
  beforeEach(() => {
    searchWeb.mockReset();
    fetchWebPage.mockReset();
    chatJson.mockReset();
    chooseStorePhoto.mockReset();
    chooseStorePhoto.mockResolvedValue({ photo: null, wrongPages: [] });
    fetchWebPage.mockImplementation((url) =>
      Promise.resolve(PAGES[url] ?? null)
    );
  });

  it("fetches fewer pages and checks one photo on the fast profile", async () => {
    searchWeb.mockResolvedValue([
      result("https://www.ciadovinho.com.br/catena"),
      result("https://www.grandcru.com.br/dv-catena"),
      result("https://www.somestore.com/catena"),
      result("https://www.catenawines.com/malbec"),
    ]);
    chatJson.mockResolvedValue(record({ matchingStorePages: [1, 2, 3] }));

    await researchWine(CATENA, { profile: RESEARCH_PROFILE_PRESETS.fast });

    expect(chooseStorePhoto).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ maxChecks: 1 })
    );
    const prompt = chatJson.mock.calls[0]?.[0].user as string;
    expect(prompt).not.toContain("[INFO 2]");
  });

  it("reports stages with increasing progress across wines", async () => {
    searchWeb.mockResolvedValue([]);
    chatJson.mockImplementation(({ schema }) =>
      Promise.resolve(
        "wines" in schema.properties
          ? {
              wines: [CATENA, { ...CATENA, name: "Catena Alta Malbec" }],
            }
          : record()
      )
    );
    const stages: [string, number | undefined][] = [];
    const context = {
      report: (stage: string, progress?: number) => {
        stages.push([stage, progress]);
      },
      signal: new AbortController().signal,
    };

    const wines = await researchWinesByQuery("catena", { context });

    expect(wines).toHaveLength(1);
    expect(stages[0]).toEqual(["Searching the web", 0]);
    expect(stages[1]).toEqual(["Found 2 wines to research", 0.12]);
    const values = stages
      .map(([, progress]) => progress)
      .filter((value): value is number => value !== undefined);
    expect(values.at(-1)).toBeGreaterThan(0.9);
    expect(values.at(-1)).toBeLessThanOrEqual(1);
    expect(
      stages.some(([stage]) => stage === "Checking stores for Catena Malbec")
    ).toBe(true);
  });

  it("stops as soon as the job is cancelled", async () => {
    const controller = new AbortController();
    searchWeb.mockImplementation(() => {
      controller.abort();
      return Promise.resolve([]);
    });
    await expect(
      researchWine(CATENA, {
        context: { report: () => undefined, signal: controller.signal },
      })
    ).rejects.toThrow("Job cancelled");
    expect(chatJson).not.toHaveBeenCalled();
  });
});

describe("researchWineFromPhoto", () => {
  beforeEach(() => {
    searchWeb.mockReset();
    fetchWebPage.mockReset();
    chatJson.mockReset();
    chooseStorePhoto.mockReset();
    chooseStorePhoto.mockResolvedValue({ photo: null, wrongPages: [] });
    fetchWebPage.mockResolvedValue(null);
    searchWeb.mockResolvedValue([]);
  });

  it("trusts a confident reading and researches it directly", async () => {
    chatJson
      .mockResolvedValueOnce({
        confidence: "high",
        name: "Catena Malbec",
        producer: "Bodega Catena Zapata",
        readable: true,
        vintage: "NV",
      })
      .mockResolvedValueOnce(record());

    const wines = await researchWineFromPhoto(Buffer.from("photo"));

    expect(wines.map((wine) => wine.name)).toEqual(["Catena Malbec"]);
    expect(chatJson).toHaveBeenCalledTimes(2);
    expect(chatJson.mock.calls[0]?.[0].images).toEqual([
      Buffer.from("photo").toString("base64"),
    ]);
  });

  it("double-checks a low-confidence reading against the web", async () => {
    chatJson
      .mockResolvedValueOnce({
        confidence: "low",
        name: "Catna Malbek",
        producer: null,
        readable: true,
        vintage: "2021",
      })
      .mockResolvedValueOnce({ wines: [{ ...CATENA, vintage: null }] })
      .mockResolvedValueOnce(record());

    const wines = await researchWineFromPhoto(Buffer.from("photo"));

    expect(wines[0]).toMatchObject({ name: "Catena Malbec", vintage: "2021" });
    expect(chatJson).toHaveBeenCalledTimes(3);
  });

  it("returns nothing for an unreadable label", async () => {
    chatJson.mockResolvedValueOnce({
      confidence: "low",
      name: null,
      producer: null,
      readable: false,
      vintage: null,
    });
    expect(await researchWineFromPhoto(Buffer.from("blur"))).toEqual([]);
    expect(chatJson).toHaveBeenCalledTimes(1);
  });
});

describe("mergeDuplicateWines", () => {
  it("keeps one entry per canonical wine and pools their store listings", () => {
    const listing = (url: string) => ({
      amount: 100,
      country: "Brazil",
      currency: "BRL",
      store: url,
      url,
    });
    const photo = {
      buffer: Buffer.from("second"),
      extension: ".jpg",
      mimetype: "image/jpeg",
    };
    const wine = (listings: string[], withPhoto = false) => ({
      ...record(),
      listings: listings.map(listing),
      photo: withPhoto ? photo : null,
    });

    const merged = mergeDuplicateWines([
      wine(["https://a.com.br/1", "https://b.com.br/1"]),
      wine(["https://b.com.br/1", "https://c.com.br/1"], true),
      { ...wine([]), name: "Catena Alta Malbec" },
    ]);

    expect(merged.map((entry) => entry.name)).toEqual([
      "Catena Malbec",
      "Catena Alta Malbec",
    ]);
    expect(merged[0]?.listings.map((entry) => entry.url)).toEqual([
      "https://a.com.br/1",
      "https://b.com.br/1",
      "https://c.com.br/1",
    ]);

    expect(merged[0]?.photo).toBe(photo);
  });
});
