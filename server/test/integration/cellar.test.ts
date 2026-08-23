import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app, bearer, createWine, loginAs, resetDb } from "./helpers.js";

describe("cellar", () => {
  beforeEach(resetDb);

  it("requires authentication", async () => {
    await request(app).get("/cellar").expect(401);
    await request(app).post("/cellar").send({ wineId: "x" }).expect(401);
  });

  it("starts empty", async () => {
    const session = await loginAs("empty@example.com");
    await request(app).get("/cellar").set(bearer(session)).expect(200, []);
  });

  it("adds a wine, defaulting to one bottle", async () => {
    const session = await loginAs("add@example.com");
    const wine = await createWine("Barolo");

    const res = await request(app)
      .post("/cellar")
      .set(bearer(session))
      .send({ wineId: wine.id })
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: wine.id, quantity: 1 });
  });

  it("re-adding the same wine updates quantity instead of duplicating", async () => {
    const session = await loginAs("upsert@example.com");
    const wine = await createWine();
    const add = (quantity: number) =>
      request(app)
        .post("/cellar")
        .set(bearer(session))
        .send({ quantity, wineId: wine.id });

    await add(2).expect(200);
    const res = await add(5).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].quantity).toBe(5);
  });

  it("404s when adding a wine that does not exist", async () => {
    const session = await loginAs("missing@example.com");
    await request(app)
      .post("/cellar")
      .set(bearer(session))
      .send({ wineId: "does-not-exist" })
      .expect(404);
  });

  it("validates quantity bounds", async () => {
    const session = await loginAs("bounds@example.com");
    const wine = await createWine();
    const add = (quantity: number) =>
      request(app)
        .post("/cellar")
        .set(bearer(session))
        .send({ quantity, wineId: wine.id });

    await add(0).expect(400);
    await add(100).expect(400);
    await add(1.5).expect(400);
    await add(99).expect(200);
  });

  it("updates quantity of an owned wine and 404s otherwise", async () => {
    const session = await loginAs("patch@example.com");
    const owned = await createWine();
    const other = await createWine();
    await request(app)
      .post("/cellar")
      .set(bearer(session))
      .send({ wineId: owned.id })
      .expect(200);

    const res = await request(app)
      .patch(`/cellar/${owned.id}`)
      .set(bearer(session))
      .send({ quantity: 6 })
      .expect(200);
    expect(res.body[0].quantity).toBe(6);

    await request(app)
      .patch(`/cellar/${other.id}`)
      .set(bearer(session))
      .send({ quantity: 2 })
      .expect(404);
  });

  it("removes a wine from the cellar", async () => {
    const session = await loginAs("delete@example.com");
    const wine = await createWine();
    await request(app)
      .post("/cellar")
      .set(bearer(session))
      .send({ wineId: wine.id })
      .expect(200);

    await request(app)
      .delete(`/cellar/${wine.id}`)
      .set(bearer(session))
      .expect(200, []);
  });

  it("keeps each user's cellar private", async () => {
    const alice = await loginAs("alice@example.com");
    const bob = await loginAs("bob@example.com");
    const wine = await createWine();

    await request(app)
      .post("/cellar")
      .set(bearer(alice))
      .send({ wineId: wine.id })
      .expect(200);

    await request(app).get("/cellar").set(bearer(bob)).expect(200, []);
    await request(app)
      .patch(`/cellar/${wine.id}`)
      .set(bearer(bob))
      .send({ quantity: 3 })
      .expect(404);

    await request(app)
      .delete(`/cellar/${wine.id}`)
      .set(bearer(bob))
      .expect(200);
    const aliceCellar = await request(app)
      .get("/cellar")
      .set(bearer(alice))
      .expect(200);
    expect(aliceCellar.body).toHaveLength(1);
  });
});
