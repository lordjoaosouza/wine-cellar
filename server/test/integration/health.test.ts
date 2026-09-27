import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ollama } from "../../src/lib/ollama.js";
import { app } from "./helpers.js";

describe("health", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reports each dependency and degrades when one is down", async () => {
    vi.spyOn(ollama, "version").mockResolvedValue("0.12.0");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const res = await request(app).get("/health").expect(200);
    expect(res.body).toEqual({
      checks: { database: "ok", ollama: "ok", searxng: "down" },
      status: "degraded",
    });
  });

  it("is ok when everything answers", async () => {
    vi.spyOn(ollama, "version").mockResolvedValue("0.12.0");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("OK")));

    const res = await request(app).get("/health").expect(200);
    expect(res.body.status).toBe("ok");
  });
});
