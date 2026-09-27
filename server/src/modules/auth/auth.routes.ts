import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { validate } from "../../middleware/validate.js";
import { okResponseSchema, registry } from "../../openapi/registry.js";
import {
  refreshSchema,
  requestCodeSchema,
  tokenPairSchema,
  verifyCodeSchema,
} from "./auth.schemas.js";
import {
  refreshTokenPair,
  requestLoginCode,
  revokeRefreshToken,
  verifyLoginCode,
} from "./auth.service.js";

export const authRouter = Router();

const codeRequestLimit = rateLimit({
  limit: 10,
  message:
    "Too many login attempts from this address. Try again in a few minutes.",
  windowMs: 15 * 60 * 1000,
});
const verifyLimit = rateLimit({
  limit: 30,
  message:
    "Too many code attempts from this address. Try again in a few minutes.",
  windowMs: 15 * 60 * 1000,
});

registry.registerPath({
  method: "post",
  path: "/auth/request-code",
  request: {
    body: { content: { "application/json": { schema: requestCodeSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: okResponseSchema } },
      description: "Code sent (if the email is valid)",
    },
  },
  summary: "Request a one-time login code by email",
  tags: ["Auth"],
});

authRouter.post(
  "/request-code",
  codeRequestLimit,
  validate({ body: requestCodeSchema }),
  asyncHandler(async (req, res) => {
    await requestLoginCode(req.body.email);
    res.json({ ok: true });
  })
);

registry.registerPath({
  method: "post",
  path: "/auth/verify-code",
  request: {
    body: { content: { "application/json": { schema: verifyCodeSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: tokenPairSchema } },
      description: "Authenticated",
    },
  },
  summary: "Verify a login code and receive an access/refresh token pair",
  tags: ["Auth"],
});

authRouter.post(
  "/verify-code",
  verifyLimit,
  validate({ body: verifyCodeSchema }),
  asyncHandler(async (req, res) => {
    const tokens = await verifyLoginCode(req.body.email, req.body.code);
    res.json(tokens);
  })
);

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  request: {
    body: { content: { "application/json": { schema: refreshSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: tokenPairSchema } },
      description: "Refreshed",
    },
  },
  summary: "Exchange a refresh token for a new token pair",
  tags: ["Auth"],
});

authRouter.post(
  "/refresh",
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    const tokens = await refreshTokenPair(req.body.refreshToken);
    res.json(tokens);
  })
);

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  request: {
    body: { content: { "application/json": { schema: refreshSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: okResponseSchema } },
      description: "Logged out",
    },
  },
  summary: "Revoke a refresh token",
  tags: ["Auth"],
});

authRouter.post(
  "/logout",
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    await revokeRefreshToken(req.body.refreshToken);
    res.json({ ok: true });
  })
);
