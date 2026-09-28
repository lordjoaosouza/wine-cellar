import { describe, expect, it } from "vitest";
import { HttpError } from "../../src/lib/http-error.js";
import { decodeImage } from "../../src/lib/image-payload.js";

const PIXEL = Buffer.from("fake-image-bytes");

describe("decodeImage", () => {
  it("decodes a JPEG data URI", () => {
    const dataUri = `data:image/jpeg;base64,${PIXEL.toString("base64")}`;
    const image = decodeImage(dataUri);
    expect(image.mimetype).toBe("image/jpeg");
    expect(image.extension).toBe(".jpg");
    expect(image.buffer.equals(PIXEL)).toBe(true);
    expect(image.dataUri).toBe(dataUri);
  });

  it("maps PNG and WebP to their extensions", () => {
    const base64 = PIXEL.toString("base64");
    expect(decodeImage(`data:image/png;base64,${base64}`).extension).toBe(
      ".png"
    );
    expect(decodeImage(`data:image/webp;base64,${base64}`).extension).toBe(
      ".webp"
    );
  });

  it("rejects unsupported types and malformed values", () => {
    const base64 = PIXEL.toString("base64");
    for (const value of [
      `data:image/gif;base64,${base64}`,
      `data:image/heic;base64,${base64}`,
      `data:text/plain;base64,${base64}`,
      `image/jpeg;base64,${base64}`,
      "not-a-data-uri",
      "",
    ]) {
      expect(() => decodeImage(value)).toThrow(HttpError);
    }
  });

  it("rejects images over 8 MB", () => {
    const oversized = Buffer.alloc(8 * 1024 * 1024 + 1).toString("base64");
    expect(() => decodeImage(`data:image/jpeg;base64,${oversized}`)).toThrow(
      "larger than 8 MB"
    );
  });
});
