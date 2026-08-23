import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error.js";
import { verifyAccessToken } from "../lib/jwt.js";

declare global {
  // biome-ignore lint/style/noNamespace: express type augmentation requires the global namespace
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : null;

  if (!token) {
    next(HttpError.unauthorized("Missing bearer token"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(HttpError.unauthorized("Invalid or expired token"));
  }
}
