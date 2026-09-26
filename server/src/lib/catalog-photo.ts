import sharp from "sharp";
import { logger } from "./logger.js";
import type { DownloadedImage } from "./remote-image.js";

const WHITE = { alpha: 1, b: 255, g: 255, r: 255 };
// How far from pure white a pixel may be and still count as background.
const TRIM_THRESHOLD = 24;
// Breathing room left around the bottle, relative to its longest side.
const MARGIN_RATIO = 0.04;
const MAX_SIDE = 1200;
// A crop keeping less than this share of the image means something went
// wrong (e.g. a white bottle on white): keep the original then.
const MIN_KEPT_AREA_RATIO = 0.05;

/**
 * Store catalog shots float a small bottle in a big white canvas (the bottle
 * often covers a third of the width). Cropping that border lets the photo
 * fill the app's frames. Transparent backgrounds become white, the result is
 * capped at 1200px and saved as JPEG; anything unexpected keeps the original.
 */
export async function trimCatalogPhoto(
  photo: DownloadedImage
): Promise<DownloadedImage> {
  try {
    // sharp trims before it flattens within one pipeline, so transparency
    // is turned into white in a pass of its own first.
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
    // e.g. a single-colour image, or a format libvips can't read.
    logger.warn({ err: error }, "trimming catalog photo failed");
    return photo;
  }
}
