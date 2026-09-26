import type { NextFunction, Request, Response } from "express";

/**
 * Photos stored on this server are saved in the database as relative paths
 * ("/uploads/<uuid>.jpg") and only made absolute when sent, using the address
 * the client itself called. The same record then works from the phone over
 * Tailscale and from the web app on localhost, and moving the server to a new
 * address never breaks stored photos.
 */
const UPLOAD_PATH_PATTERN =
  /^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/;
const ABSOLUTE_UPLOAD_URL_PATTERN =
  /^https?:\/\/[^/]+(\/uploads\/[0-9a-f-]{36}\.(?:jpg|png|webp))$/;
const MAX_DEPTH = 8;

export function uploadPath(key: string): string {
  return `/uploads/${key}`;
}

/** An absolute URL to one of this server's uploads → its relative path. */
export function toStoredUploadUrl(url: string): string {
  return url.replace(ABSOLUTE_UPLOAD_URL_PATTERN, "$1");
}

/** Copy of `value` with every upload path turned into an absolute URL. */
export function absolutizeUploadUrls(
  value: unknown,
  origin: string,
  depth = 0
): unknown {
  if (typeof value === "string") {
    return UPLOAD_PATH_PATTERN.test(value) ? `${origin}${value}` : value;
  }
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => absolutizeUploadUrls(item, origin, depth + 1));
  }
  if (value instanceof Date) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      absolutizeUploadUrls(item, origin, depth + 1),
    ])
  );
}

/** Makes upload paths in every JSON response absolute for this client. */
export function absoluteUploadUrls(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const json = res.json.bind(res);
  res.json = (body: unknown) =>
    json(absolutizeUploadUrls(body, `${req.protocol}://${req.get("host")}`));
  next();
}
