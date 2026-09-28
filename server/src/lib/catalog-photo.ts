import sharp from "sharp";
import { logger } from "./logger.js";
import type { DownloadedImage } from "./remote-image.js";

const WHITE = { alpha: 1, b: 255, g: 255, r: 255 };

const TRIM_THRESHOLD = 24;

const MARGIN_RATIO = 0.04;
const MAX_SIDE = 1200;

const MIN_KEPT_AREA_RATIO = 0.05;

const CORNER_SAMPLE_RATIO = 0.04;
const INSET_RATIO = 0.06;
const INSET_SAMPLE_RATIO = 0.02;
const WHITE_BACKGROUND_MIN_CHANNEL = 246;
const WHITE_MARGIN_THRESHOLD = 10;

export interface PreparedStorePhoto {
  fillsFrame: boolean;
  photo: DownloadedImage;
}

export interface BackgroundAnalysis {
  cornersWhite: boolean;
  insetWhite: boolean;
}

function patchMeans(
  image: Buffer,
  patches: { left: number; top: number }[],
  size: number
): Promise<number[][]> {
  return Promise.all(
    patches.map(async ({ left, top }) => {
      const patch = await sharp(image)
        .extract({ height: size, left, top, width: size })
        .toBuffer();
      const stats = await sharp(patch).stats();
      return stats.channels.slice(0, 3).map((channel) => channel.mean);
    })
  );
}

function allWhite(means: number[][]): boolean {
  return means.every((patch) =>
    patch.every((mean) => mean >= WHITE_BACKGROUND_MIN_CHANNEL)
  );
}

function edgePatches(
  width: number,
  height: number,
  inset: number,
  size: number
) {
  return [
    { left: inset, top: inset },
    { left: width - inset - size, top: inset },
    { left: inset, top: height - inset - size },
    { left: width - inset - size, top: height - inset - size },
  ];
}

export async function analyzeBackground(
  buffer: Buffer
): Promise<BackgroundAnalysis> {
  const flattened = await sharp(buffer)
    .flatten({ background: WHITE })
    .png()
    .toBuffer({ resolveWithObject: true });
  const { height, width } = flattened.info;
  const shortSide = Math.min(width, height);
  const size = Math.max(2, Math.round(shortSide * CORNER_SAMPLE_RATIO));
  const inset = Math.round(shortSide * INSET_RATIO);
  const insetSize = Math.max(2, Math.round(shortSide * INSET_SAMPLE_RATIO));
  const [corners, insets] = await Promise.all([
    patchMeans(flattened.data, edgePatches(width, height, 0, size), size),
    patchMeans(
      flattened.data,
      edgePatches(width, height, inset, insetSize),
      insetSize
    ),
  ]);
  return { cornersWhite: allWhite(corners), insetWhite: allWhite(insets) };
}

export async function hasWhiteBackground(buffer: Buffer): Promise<boolean> {
  const { cornersWhite, insetWhite } = await analyzeBackground(buffer);
  return cornersWhite && insetWhite;
}

export async function stripWhiteMargin(
  photo: DownloadedImage
): Promise<DownloadedImage> {
  const buffer = await sharp(photo.buffer)
    .flatten({ background: WHITE })
    .trim({ background: WHITE, threshold: WHITE_MARGIN_THRESHOLD })
    .jpeg({ mozjpeg: true, quality: 88 })
    .toBuffer();
  return { buffer, extension: ".jpg", mimetype: "image/jpeg" };
}

export async function trimCatalogPhoto(
  photo: DownloadedImage
): Promise<DownloadedImage> {
  try {
    const flattened = await sharp(photo.buffer)
      .flatten({ background: WHITE })
      .png()
      .toBuffer({ resolveWithObject: true });
    const { height, width } = flattened.info;
    const { data, info } = await sharp(flattened.data)
      .trim({ background: WHITE, threshold: TRIM_THRESHOLD })
      .toBuffer({ resolveWithObject: true });

    const nothingTrimmed = info.width === width && info.height === height;
    const keptTooLittle =
      info.width * info.height < width * height * MIN_KEPT_AREA_RATIO;
    if (nothingTrimmed || keptTooLittle) {
      return photo;
    }

    const margin = Math.round(Math.max(info.width, info.height) * MARGIN_RATIO);
    const buffer = await sharp(data)
      .extend({
        background: WHITE,
        bottom: margin,
        left: margin,
        right: margin,
        top: margin,
      })
      .resize({
        fit: "inside",
        height: MAX_SIDE,
        width: MAX_SIDE,
        withoutEnlargement: true,
      })
      .jpeg({ mozjpeg: true, quality: 88 })
      .toBuffer();
    return { buffer, extension: ".jpg", mimetype: "image/jpeg" };
  } catch (error) {
    logger.warn({ err: error }, "trimming catalog photo failed");
    return photo;
  }
}

async function capSize(photo: DownloadedImage): Promise<DownloadedImage> {
  const buffer = await sharp(photo.buffer)
    .rotate()
    .resize({
      fit: "inside",
      height: MAX_SIDE,
      width: MAX_SIDE,
      withoutEnlargement: true,
    })
    .jpeg({ mozjpeg: true, quality: 88 })
    .toBuffer();
  return { buffer, extension: ".jpg", mimetype: "image/jpeg" };
}

export async function prepareStorePhoto(
  photo: DownloadedImage
): Promise<PreparedStorePhoto> {
  let whiteBackground: boolean;
  try {
    whiteBackground = await hasWhiteBackground(photo.buffer);
  } catch (error) {
    logger.warn({ err: error }, "reading catalog photo background failed");
    return { fillsFrame: false, photo };
  }
  if (whiteBackground) {
    return { fillsFrame: false, photo: await trimCatalogPhoto(photo) };
  }
  try {
    return { fillsFrame: true, photo: await capSize(photo) };
  } catch (error) {
    logger.warn({ err: error }, "resizing catalog photo failed");
    return { fillsFrame: true, photo };
  }
}
