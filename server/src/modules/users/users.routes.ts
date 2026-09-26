import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { bearerAuth, registry } from "../../openapi/registry.js";
import {
  profileResponseSchema,
  tuyaCredentialsInputSchema,
  tuyaCredentialsResponseSchema,
  updateProfileSchema,
} from "./users.schemas.js";
import {
  clearTuyaCredentials,
  getProfile,
  getTuyaCredentials,
  saveTuyaCredentials,
  updateProfile,
} from "./users.service.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

const okResponse = z.object({ ok: z.literal(true) });
const security = [{ [bearerAuth.name]: [] }];

registry.registerPath({
  method: "get",
  path: "/users/me",
  responses: {
    200: {
      content: { "application/json": { schema: profileResponseSchema } },
      description: "Profile",
    },
  },
  security,
  summary: "Get the authenticated user's profile",
  tags: ["Users"],
});

usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    res.json(await getProfile(req.userId));
  })
);

registry.registerPath({
  method: "patch",
  path: "/users/me",
  request: {
    body: { content: { "application/json": { schema: updateProfileSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: profileResponseSchema } },
      description: "Updated profile",
    },
  },
  security,
  summary: "Update the authenticated user's profile or climate target",
  tags: ["Users"],
});

usersRouter.patch(
  "/me",
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    res.json(await updateProfile(req.userId, req.body));
  })
);

registry.registerPath({
  method: "get",
  path: "/users/me/tuya",
  responses: {
    200: {
      content: {
        "application/json": { schema: tuyaCredentialsResponseSchema },
      },
      description: "Tuya credentials",
    },
  },
  security,
  summary:
    "Get the authenticated user's Tuya credentials (secret never returned)",
  tags: ["Users"],
});

usersRouter.get(
  "/me/tuya",
  asyncHandler(async (req, res) => {
    res.json(await getTuyaCredentials(req.userId));
  })
);

registry.registerPath({
  method: "put",
  path: "/users/me/tuya",
  request: {
    body: {
      content: { "application/json": { schema: tuyaCredentialsInputSchema } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: tuyaCredentialsResponseSchema },
      },
      description: "Saved",
    },
  },
  security,
  summary: "Save Tuya cellar sensor credentials",
  tags: ["Users"],
});

usersRouter.put(
  "/me/tuya",
  validate({ body: tuyaCredentialsInputSchema }),
  asyncHandler(async (req, res) => {
    res.json(await saveTuyaCredentials(req.userId, req.body));
  })
);

registry.registerPath({
  method: "delete",
  path: "/users/me/tuya",
  responses: {
    200: {
      content: { "application/json": { schema: okResponse } },
      description: "Removed",
    },
  },
  security,
  summary: "Remove Tuya cellar sensor credentials",
  tags: ["Users"],
});

usersRouter.delete(
  "/me/tuya",
  asyncHandler(async (req, res) => {
    await clearTuyaCredentials(req.userId);
    res.json({ ok: true });
  })
);
