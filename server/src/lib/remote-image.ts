import type { DecodedImage } from "./image-payload.js";
import { logger } from "./logger.js";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 12_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MIN_IMAGE_BYTES = 2 * 1024;
const HTTP_URL_PATTERN = /^https?:\/\//i;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export type DownloadedImage = Pick<
  DecodedImage,
  "buffer" | "extension" | "mimetype"
>;

/**
 * Downloads a JPEG/PNG/WebP image, or returns null for anything else (HTML
 * error pages, SVG logos, tracking pixels, oversized files).
 */
export async function downloadImage(
  url: string
): Promise<DownloadedImage | null> {
  if (!HTTP_URL_PATTERN.test(url)) {
    return null;
  }
  try {
    const response = await fetch(url, {
      headers: { Accept: "image/*", "User-Agent": BROWSER_USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const mimetype = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      ?.trim()
      .toLowerCase();
    const extension = mimetype ? EXTENSIONS[mimetype] : undefined;
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (!(response.ok && extension) || declaredSize > MAX_IMAGE_BYTES) {
      await response.body?.cancel();
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (
      buffer.byteLength < MIN_IMAGE_BYTES ||
      buffer.byteLength > MAX_IMAGE_BYTES
    ) {
      return null;
    }
    return {
      buffer,
      extension,
      mimetype: (mimetype === "image/jpg"
        ? "image/jpeg"
        : mimetype) as DecodedImage["mimetype"],
    };
  } catch (error) {
    logger.debug({ err: error, url }, "downloadImage failed");
    return null;
  }
}
