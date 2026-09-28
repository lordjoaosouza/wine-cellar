import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/http-error.js";
import { logger } from "../lib/logger.js";

interface ClientRequestError {
  expose: true;
  message: string;
  status: number;
}

function isClientRequestError(error: unknown): error is ClientRequestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "expose" in error &&
    error.expose === true &&
    "status" in error &&
    typeof error.status === "number" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof ZodError) {
    res.status(400).json({ details: error.issues, error: "Validation failed" });
    return;
  }

  if (error instanceof HttpError) {
    res
      .status(error.status)
      .json({ code: error.code, details: error.details, error: error.message });
    return;
  }

  if (isClientRequestError(error)) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  logger.error({ err: error }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}
