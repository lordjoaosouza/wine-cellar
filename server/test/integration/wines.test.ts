import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { app, bearer, loginAs, resetDb } from "./helpers.js";

const BR_OFFER = {
  amount: 189.9,
  amountBrl: 189.9,
  country: "Brazil",
  currency: "BRL",
  store: "Grand Cru",
  url: "https://www.grandcru.com.br/catena-malbec",
};

describe("wine store offers", () => {
  beforeEach(resetDb);

  it("returns stored offers and the market the price came from", async () => {
    const session = await loginAs("offers@example.com");
    const wine = await prisma.wine.create({
      data: {
        name: "Catena Malbec",
        normalizedKey: "catena-malbec-nv",
        offers: [BR_OFFER],
        price: "~R$ 190",
      },
    });

    const res = await request(app)
      .get(`/wines/${wine.id}`)
      .set(bearer(session))
      .expect(200);

    expect(res.body).toMatchObject({
      offers: [BR_OFFER],
      price: "~R$ 190",
      priceMarket: "BR",
    });
    expect(res.body).not.toHaveProperty("guideScore");
  });

  it("imports an archive exported before offers replaced guide scores", async () => {
    const session = await loginAs("legacy-import@example.com");
    const legacyWine = {
      agingNotes: null,
      country: "Argentina",
      grapes: ["Malbec"],
      guideScore: 4.1,
      id: "legacy-wine",
      imageSource: null,
      imageUrl: null,
      name: "Catena Malbec",
      pairings: [],
      price: "~R$ 190",
      producerProfile: null,
      region: "Mendoza",
      regionProfile: null,
      servingNotes: null,
      tastingNotes: null,
      type: "Dry red",
      vintage: null,
      winery: "Bodega Catena Zapata",
    };

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
        wines: [legacyWine],
        wishlist: [],
      })
      .expect(200);

    const stored = await prisma.wine.findUniqueOrThrow({
      where: { id: "legacy-wine" },
    });
    expect(stored.offers).toEqual([]);
    expect(stored.price).toBe("~R$ 190");
  });
});
