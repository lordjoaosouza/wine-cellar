import express from "express";
import request from "supertest";
import { describe, it } from "vitest";
import { errorHandler } from "../../src/middleware/error-handler.js";
import { rateLimit } from "../../src/middleware/rate-limit.js";

function app(limit: number) {
  const server = express();
  server.set("trust proxy", true);
  server.get(
    "/ping",
    rateLimit({ limit, message: "Slow down", windowMs: 60_000 }),
    (_req, res) => {
      res.json({ ok: true });
    }
  );
  server.use(errorHandler);
  return server;
}

describe("rateLimit", () => {
  it("allows up to the limit per window and then answers 429", async () => {
    const server = app(2);
    await request(server).get("/ping").expect(200);
    await request(server).get("/ping").expect(200);
    await request(server).get("/ping").expect(429, { error: "Slow down" });
  });

  it("counts addresses separately", async () => {
    const server = app(1);
    await request(server)
      .get("/ping")
      .set("X-Forwarded-For", "1.1.1.1")
      .expect(200);
    await request(server)
      .get("/ping")
      .set("X-Forwarded-For", "2.2.2.2")
      .expect(200);
  });
});
