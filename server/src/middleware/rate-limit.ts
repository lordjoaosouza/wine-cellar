import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error.js";

interface RateLimitOptions {
  limit: number;
  message: string;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  function prune(now: number) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }

  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (buckets.size > 1000) {
      prune(now);
    }
    const key = req.ip ?? "unknown";
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }
    bucket.count += 1;
    if (bucket.count > options.limit) {
      next(HttpError.tooManyRequests(options.message));
      return;
    }
    next();
  };
}
