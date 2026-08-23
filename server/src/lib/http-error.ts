export class HttpError extends Error {
  readonly status: number;
  readonly details?: unknown;
  readonly code?: string | undefined;

  constructor(
    status: number,
    message: string,
    details?: unknown,
    options?: ErrorOptions & { code?: string }
  ) {
    super(message, options);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
    this.code = options?.code;
  }

  static badRequest(message: string, details?: unknown): HttpError {
    return new HttpError(400, message, details);
  }

  static badRequestWithCode(code: string, message: string): HttpError {
    return new HttpError(400, message, undefined, { code });
  }

  static unauthorized(message = "Unauthorized", cause?: unknown): HttpError {
    return new HttpError(
      401,
      message,
      undefined,
      cause ? { cause } : undefined
    );
  }

  static forbidden(message = "Forbidden"): HttpError {
    return new HttpError(403, message);
  }

  static notFound(message = "Not found"): HttpError {
    return new HttpError(404, message);
  }

  static conflict(message: string): HttpError {
    return new HttpError(409, message);
  }
}
