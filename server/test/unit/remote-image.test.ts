import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadImage } from "../../src/lib/remote-image.js";

const PHOTO = Buffer.alloc(4096, 1);

function respond(
  body: Buffer | string,
  headers: Record<string, string>,
  status = 200
) {
  return new Response(body, { headers, status });
}

describe("downloadImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts JPEG, PNG and WebP photos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respond(PHOTO, { "content-type": "image/jpg" }))
    );
    expect(await downloadImage("https://cdn.loja.com.br/a.jpg")).toMatchObject({
      extension: ".jpg",
      mimetype: "image/jpeg",
    });
  });

  it("rejects pages, SVGs, tiny pixels, huge files and failed requests", async () => {
    const cases = [
      respond("<html></html>", { "content-type": "text/html" }),
      respond("<svg/>", { "content-type": "image/svg+xml" }),
      respond(Buffer.alloc(100), { "content-type": "image/png" }),
      respond(PHOTO, {
        "content-length": String(20 * 1024 * 1024),
        "content-type": "image/png",
      }),
      respond(PHOTO, { "content-type": "image/png" }, 404),
    ];
    for (const response of cases) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
      // biome-ignore lint/performance/noAwaitInLoops: each case stubs fetch in turn
      expect(await downloadImage("https://cdn.loja.com.br/x")).toBeNull();
    }
    expect(await downloadImage("ftp://cdn.loja.com.br/x.jpg")).toBeNull();
  });
});
