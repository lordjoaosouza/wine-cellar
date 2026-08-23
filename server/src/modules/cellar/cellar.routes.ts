import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { bearerAuth, registry } from "../../openapi/registry.js";
import {
  addToCellarSchema,
  cellarItemSchema,
  updateCellarQuantitySchema,
  wineIdParamsSchema,
} from "./cellar.schemas.js";
import {
  addToCellar,
  listCellar,
  removeFromCellar,
  updateCellarQuantity,
} from "./cellar.service.js";

export const cellarRouter = Router();
cellarRouter.use(requireAuth);

const security = [{ [bearerAuth.name]: [] }];
const listResponse = z.array(cellarItemSchema);

registry.registerPath({
  method: "get",
  path: "/cellar",
  responses: {
    200: {
      content: { "application/json": { schema: listResponse } },
      description: "Cellar items",
    },
  },
  security,
  summary: "List the wines in the authenticated user's cellar",
  tags: ["Cellar"],
});

cellarRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listCellar(req.userId));
  })
);

registry.registerPath({
  method: "post",
  path: "/cellar",
  request: {
    body: { content: { "application/json": { schema: addToCellarSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: listResponse } },
      description: "Updated cellar",
    },
  },
  security,
  summary:
    "Add a wine to the cellar (or update its quantity if already present)",
  tags: ["Cellar"],
});

cellarRouter.post(
  "/",
  validate({ body: addToCellarSchema }),
  asyncHandler(async (req, res) => {
    res.json(await addToCellar(req.userId, req.body.wineId, req.body.quantity));
  })
);

registry.registerPath({
  method: "patch",
  path: "/cellar/{wineId}",
  request: {
    body: {
      content: { "application/json": { schema: updateCellarQuantitySchema } },
    },
    params: wineIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: listResponse } },
      description: "Updated cellar",
    },
  },
  security,
  summary: "Update the bottle quantity for a wine already in the cellar",
  tags: ["Cellar"],
});

cellarRouter.patch(
  "/:wineId",
  validate({ body: updateCellarQuantitySchema, params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json(
      await updateCellarQuantity(
        req.userId,
        req.params.wineId as string,
        req.body.quantity
      )
    );
  })
);

registry.registerPath({
  method: "delete",
  path: "/cellar/{wineId}",
  request: { params: wineIdParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: listResponse } },
      description: "Updated cellar",
    },
  },
  security,
  summary: "Remove a wine from the cellar",
  tags: ["Cellar"],
});

cellarRouter.delete(
  "/:wineId",
  validate({ params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json(await removeFromCellar(req.userId, req.params.wineId as string));
  })
);
