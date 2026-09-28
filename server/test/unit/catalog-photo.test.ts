import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  analyzeBackground,
  hasWhiteBackground,
  prepareStorePhoto,
  stripWhiteMargin,
  trimCatalogPhoto,
} from "../../src/lib/catalog-photo.js";
import type { DownloadedImage } from "../../src/lib/remote-image.js";

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

describe("prepareStorePhoto", () => {
  it("trims a white-background catalog shot and shows it whole", async () => {
    const photo = await catalogShot({
      background: { alpha: 1, b: 255, g: 255, r: 255 },
      bottle: { height: 500, width: 150 },
    });
    const prepared = await prepareStorePhoto(photo);
    const { width } = await sharp(prepared.photo.buffer).metadata();
    expect(prepared.fillsFrame).toBe(false);
    expect(width).toBe(190);
  });

  it("keeps a grey-background photo untrimmed and lets it fill the frame", async () => {
    const photo = await catalogShot({
      background: { alpha: 1, b: 236, g: 232, r: 232 },
      bottle: { height: 500, width: 150 },
    });
    const prepared = await prepareStorePhoto(photo);
    const { format, height, width } = await sharp(
      prepared.photo.buffer
    ).metadata();
    expect(prepared.fillsFrame).toBe(true);
    expect({ format, height, width }).toEqual({
      format: "jpeg",
      height: 800,
      width: 600,
    });
  });

  it("falls back to showing the photo whole when it cannot be read", async () => {
    const junk = {
      buffer: Buffer.from("nope"),
      extension: ".jpg",
      mimetype: "image/jpeg",
    } as const;
    expect(await prepareStorePhoto(junk)).toEqual({
      fillsFrame: false,
      photo: junk,
    });
  });
});

describe("hasWhiteBackground", () => {
  it("samples the corners", async () => {
    const white = await catalogShot({
      background: { alpha: 1, b: 255, g: 255, r: 255 },
      bottle: { height: 700, width: 500 },
    });
    const dark = await catalogShot({
      background: { alpha: 1, b: 40, g: 30, r: 30 },
      bottle: { height: 100, width: 100 },
    });
    expect(await hasWhiteBackground(white.buffer)).toBe(true);
    expect(await hasWhiteBackground(dark.buffer)).toBe(false);
  });
});

describe("photos trimmed by the older pipeline", () => {
  async function greyWithWhiteMargin(): Promise<DownloadedImage> {
    const grey = await catalogShot({
      background: { alpha: 1, b: 236, g: 232, r: 232 },
      bottle: { height: 500, width: 150 },
    });
    const buffer = await sharp(grey.buffer)
      .extend({
        background: { alpha: 1, b: 255, g: 255, r: 255 },
        bottom: 32,
        left: 24,
        right: 24,
        top: 32,
      })
      .png()
      .toBuffer();
    return { buffer, extension: ".png", mimetype: "image/png" };
  }

  it("tells a white margin around a grey photo from a white background", async () => {
    const legacy = await greyWithWhiteMargin();
    expect(await analyzeBackground(legacy.buffer)).toEqual({
      cornersWhite: true,
      insetWhite: false,
    });
    expect(await hasWhiteBackground(legacy.buffer)).toBe(false);
  });

  it("strips the white margin back off", async () => {
    const legacy = await greyWithWhiteMargin();
    const stripped = await stripWhiteMargin(legacy);
    const { height, width } = await sharp(stripped.buffer).metadata();
    expect({ height, width }).toEqual({ height: 800, width: 600 });
  });
});
