import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { wineSearchText } from "../../src/modules/wines/wine-search-text.js";
import { app, bearer, loginAs, resetDb } from "./helpers.js";

function seed(
  name: string,
  fields: Partial<Parameters<typeof wineSearchText>[0]> = {}
) {
  const wine = {
    country: null,
    grapes: [],
    name,
    region: null,
    vintage: null,
    winery: null,
    ...fields,
  };
  return prisma.wine.create({
    data: {
      ...wine,
      normalizedKey: name.toLowerCase().replace(/\s+/g, "-"),
      searchText: wineSearchText(wine),
    },
  });
}

describe("catalog search", () => {
  beforeEach(resetDb);

  it("matches any word order, ignores accents and searches grapes and producers", async () => {
    const session = await loginAs("search@example.com");
    await seed("Catena Malbec", {
      country: "Argentina",
      grapes: ["Malbec"],
      region: "Luján de Cuyo",
      winery: "Bodega Catena Zapata",
    });
    await seed("Barolo Riserva", { country: "Italy", grapes: ["Nebbiolo"] });

    const find = async (q: string) => {
      const res = await request(app)
        .get(`/wines/search?q=${encodeURIComponent(q)}`)
        .set(bearer(session))
        .expect(200);
      return res.body as { results: { name: string }[]; source: string };
    };

    expect((await find("malbec catena")).results.map((w) => w.name)).toEqual([
      "Catena Malbec",
    ]);
    expect((await find("lujan cuyo")).results).toHaveLength(1);
    expect((await find("zapata")).results).toHaveLength(1);
    expect((await find("nebbiolo")).results.map((w) => w.name)).toEqual([
      "Barolo Riserva",
    ]);
    expect(await find("catena nebbiolo")).toMatchObject({
      results: [],
      source: "none",
    });
  });

  it("indexes wines that arrive through an account import", async () => {
    const session = await loginAs("import-search@example.com");
    await request(app)
      .post("/account/import")
      .set(bearer(session))
      .send({
        cellar: [],
        exportedAt: new Date().toISOString(),
        profile: {
          avatarUrl: null,
          name: null,
          targetHumidityPct: 65,
          targetTemperatureC: 14,
        },
        ratings: [],
        recentViews: [],
        version: 1,
        wines: [
          {
            agingNotes: null,
            country: "Portugal",
            grapes: ["Touriga Nacional"],
            id: "imported-wine",
            imageSource: null,
            imageUrl: null,
            name: "Quinta do Crasto Reserva",
            pairings: [],
            price: null,
            producerProfile: null,
            region: "Douro",
            regionProfile: null,
            servingNotes: null,
            tastingNotes: null,
            type: "Dry red",
            vintage: "2019",
            winery: "Quinta do Crasto",
          },
        ],
        wishlist: [],
      })
      .expect(200);

    const res = await request(app)
      .get("/wines/search?q=touriga%20douro")
      .set(bearer(session))
      .expect(200);
    expect(res.body.results.map((w: { id: string }) => w.id)).toEqual([
      "imported-wine",
    ]);
  });
});
