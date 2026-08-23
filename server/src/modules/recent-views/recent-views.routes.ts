import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { bearerAuth, registry } from "../../openapi/registry.js";
import {
  recentViewSchema,
  wineIdParamsSchema,
} from "./recent-views.schemas.js";
import {
  clearRecentViews,
  listRecentViews,
  recordRecentView,
} from "./recent-views.service.js";

export const recentViewsRouter = Router();
recentViewsRouter.use(requireAuth);

const security = [{ [bearerAuth.name]: [] }];
const listResponse = z.array(recentViewSchema);
const okResponse = z.object({ ok: z.literal(true) });

registry.registerPath({
  method: "get",
  path: "/recent-views",
  responses: {
    200: {
      content: { "application/json": { schema: listResponse } },
      description: "Recent views",
    },
  },
  security,
  summary: "List the authenticated user's recently viewed wines (max 8)",
  tags: ["Recent views"],
});

recentViewsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listRecentViews(req.userId));
  })
);

registry.registerPath({
  method: "post",
  path: "/recent-views/{wineId}",
  request: { params: wineIdParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: listResponse } },
      description: "Updated recent views",
    },
  },
  security,
  summary: "Record a wine view",
  tags: ["Recent views"],
});

recentViewsRouter.post(
  "/:wineId",
  validate({ params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json(await recordRecentView(req.userId, req.params.wineId as string));
  })
);

registry.registerPath({
  method: "delete",
  path: "/recent-views",
  responses: {
    200: {
      content: { "application/json": { schema: okResponse } },
      description: "Cleared",
    },
  },
  security,
  summary: "Clear recently viewed wines",
  tags: ["Recent views"],
});

recentViewsRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    await clearRecentViews(req.userId);
    res.json({ ok: true });
  })
);
