import { z } from "zod";
import { HttpError } from "./http-error.js";

export const IMAGE_BODY_LIMIT = "12mb";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
} as const;

type ImageMimeType = keyof typeof EXTENSIONS;

const HEADER_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64$/;

export const imageUploadSchema = z.object({
  image: z
    .string()
    .min(1)
    .describe("JPEG, PNG or WebP base64 data URI (up to 8 MB)"),
});

export interface DecodedImage {
  buffer: Buffer;
  dataUri: string;
  extension: string;
  mimetype: ImageMimeType;
}

export function decodeImage(dataUri: string): DecodedImage {
  const separator = dataUri.indexOf(",");
  const header = HEADER_PATTERN.exec(dataUri.slice(0, separator));
  if (separator === -1 || !header) {
    throw HttpError.badRequest(
      "image must be a JPEG, PNG or WebP base64 data URI"
    );
  }

  const buffer = Buffer.from(dataUri.slice(separator + 1), "base64");
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw HttpError.badRequest("Image is larger than 8 MB");
  }

  const mimetype = header[1] as ImageMimeType;
  return { buffer, dataUri, extension: EXTENSIONS[mimetype], mimetype };
}
