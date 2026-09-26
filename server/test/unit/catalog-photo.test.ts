import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { trimCatalogPhoto } from "../../src/lib/catalog-photo.js";
import type { DownloadedImage } from "../../src/lib/remote-image.js";

/** A white canvas with a dark "bottle" rectangle in the middle. */
async function catalogShot(options: {
  background: { r: number; g: number; b: number; alpha: number };
  bottle: { width: number; height: number };
}): Promise<DownloadedImage> {
  const bottle = await sharp({
    create: {
      background: { b: 40, g: 20, r: 60 },
      channels: 3,
      height: options.bottle.height,
      width: options.bottle.width,
    },
  })
    .png()
    .toBuffer();
  const buffer = await sharp({
    create: {
      background: options.background,
      channels: 4,
      height: 800,
      width: 600,
    },
  })
    .composite([{ gravity: "center", input: bottle }])
    .png()
    .toBuffer();
  return { buffer, extension: ".png", mimetype: "image/png" };
}

describe("trimCatalogPhoto", () => {
  it("crops the white border down to the bottle plus a small margin", async () => {
    const photo = await catalogShot({
      background: { alpha: 1, b: 255, g: 255, r: 255 },
      bottle: { height: 500, width: 150 },
    });

    const trimmed = await trimCatalogPhoto(photo);
    const { height, width, format } = await sharp(trimmed.buffer).metadata();

    // 500px bottle + 4% (20px) margin on each side.
    expect({ format, height, width }).toEqual({
      format: "jpeg",
      height: 540,
      width: 190,
    });
    expect(trimmed.mimetype).toBe("image/jpeg");
  });

  it("treats a transparent background like white", async () => {
    const photo = await catalogShot({
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      bottle: { height: 400, width: 100 },
    });
    const { height } = await sharp(
      (await trimCatalogPhoto(photo)).buffer
    ).metadata();
    expect(height).toBe(432);
  });

  it("keeps photos it can't trim", async () => {
    const blank = await sharp({
      create: { background: "#ffffff", channels: 3, height: 50, width: 50 },
    })
      .png()
      .toBuffer();
    const photo = {
      buffer: blank,
      extension: ".png",
      mimetype: "image/png",
    } as const;
    expect(await trimCatalogPhoto(photo)).toBe(photo);

    const notAnImage = {
      buffer: Buffer.from("nope"),
      extension: ".jpg",
      mimetype: "image/jpeg",
    } as const;
    expect(await trimCatalogPhoto(notAnImage)).toBe(notAnImage);
  });
});
