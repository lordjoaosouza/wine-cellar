import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

const twoMegabytes = "a".repeat(2 * 1024 * 1024);

describe("image upload body limit", () => {
  const app = createApp();

  it("lets the image upload routes accept bodies above the default JSON limit", async () => {
    const responses = await Promise.all(
      ["/wines/identify-label", "/ratings/some-id/photo"].map((path) =>
        request(app).post(path).send({ image: twoMegabytes })
      )
    );
    expect(responses.map((response) => response.status)).toEqual([401, 401]);
  });

  it("keeps the default JSON limit everywhere else", async () => {
    const response = await request(app)
      .post("/auth/request-code")
      .send({ email: twoMegabytes });
    expect(response.status).toBe(413);
  });
});
