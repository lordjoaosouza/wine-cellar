import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { validate } from "../../middleware/validate.js";
import { registry } from "../../openapi/registry.js";
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

const okResponse = z.object({ ok: z.literal(true) });

registry.registerPath({
  method: "post",
  path: "/auth/request-code",
  request: {
    body: { content: { "application/json": { schema: requestCodeSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: okResponse } },
      description: "Code sent (if the email is valid)",
    },
  },
  summary: "Request a one-time login code by email",
  tags: ["Auth"],
});

authRouter.post(
  "/request-code",
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
      content: { "application/json": { schema: okResponse } },
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
