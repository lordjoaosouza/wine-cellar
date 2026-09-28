import sharp from "sharp";
import { logger } from "./logger.js";

const VISION_MAX_SIDE = 768;
const LABEL_MAX_SIDE = 1024;
const JPEG_QUALITY = 82;

function toVisionJpeg(buffer: Buffer, maxSide: number): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({
      fit: "inside",
      height: maxSide,
      width: maxSide,
      withoutEnlargement: true,
    })
    .jpeg({ mozjpeg: true, quality: JPEG_QUALITY })
    .toBuffer();
}

async function prepare(buffer: Buffer, maxSide: number): Promise<Buffer> {
  try {
    return await toVisionJpeg(buffer, maxSide);
  } catch (error) {
    logger.debug({ err: error }, "image could not be resized for the model");
    return buffer;
  }
}

export function prepareStorePhotoForVision(buffer: Buffer): Promise<Buffer> {
  return prepare(buffer, VISION_MAX_SIDE);
}

export function prepareLabelScanForVision(buffer: Buffer): Promise<Buffer> {
  return prepare(buffer, LABEL_MAX_SIDE);
}

export function visionMaxSide(kind: "store" | "label"): number {
  return kind === "store" ? VISION_MAX_SIDE : LABEL_MAX_SIDE;
}
