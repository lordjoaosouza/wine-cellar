import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { env } from "../config/env.js";
import { HttpError } from "./http-error.js";
import type { DecodedImage } from "./image-payload.js";
import { uploadPath } from "./upload-urls.js";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/;

function uploadsDir(): string {
  return path.resolve(env.UPLOADS_DIR);
}

function pathForKey(key: string): string {
  if (!KEY_PATTERN.test(key)) {
    throw HttpError.notFound("Image not found");
  }
  return path.join(uploadsDir(), key);
}

export async function ensureUploadsDirExists(): Promise<void> {
  await mkdir(uploadsDir(), { recursive: true });
}

export async function uploadImage(
  file: Pick<DecodedImage, "buffer" | "extension" | "mimetype">
): Promise<string> {
  const key = `${randomUUID()}${file.extension}`;
  const target = pathForKey(key);

  const temporary = `${target}.tmp`;
  await ensureUploadsDirExists();
  await writeFile(temporary, file.buffer);
  await rename(temporary, target);
  return key;
}

export interface StoredImage {
  body: Readable;
  contentType: string;
}

export async function getImage(key: string): Promise<StoredImage> {
  const filePath = pathForKey(key);
  await stat(filePath);
  return {
    body: createReadStream(filePath),
    contentType: CONTENT_TYPES[path.extname(key)] ?? "application/octet-stream",
  };
}

export async function deleteImage(key: string): Promise<void> {
  await rm(pathForKey(key), { force: true });
}

export function publicUrlForImage(key: string): string {
  return uploadPath(key);
}
