import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { decodeImage, imageUploadSchema } from "../../lib/image-payload.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { bearerAuth, registry } from "../../openapi/registry.js";
import {
  ratingSchema,
  upsertRatingSchema,
  wineIdParamsSchema,
} from "./ratings.schemas.js";
import {
  getRating,
  listRatings,
  removeRating,
  setRatingPhoto,
  upsertRating,
} from "./ratings.service.js";

export const ratingsRouter = Router();
ratingsRouter.use(requireAuth);

const security = [{ [bearerAuth.name]: [] }];
const okResponse = z.object({ ok: z.literal(true) });

registry.registerPath({
  method: "get",
  path: "/ratings",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(ratingSchema) } },
      description: "Ratings",
    },
  },
  security,
  summary: "List the authenticated user's ratings",
  tags: ["Ratings"],
});

ratingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listRatings(req.userId));
  })
);

registry.registerPath({
  method: "get",
  path: "/ratings/{wineId}",
  request: { params: wineIdParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: ratingSchema.nullable() } },
      description: "Rating or null",
    },
  },
  security,
  summary: "Get the rating for a specific wine",
  tags: ["Ratings"],
});

ratingsRouter.get(
  "/:wineId",
  validate({ params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json(await getRating(req.userId, req.params.wineId as string));
  })
);

registry.registerPath({
  method: "put",
  path: "/ratings/{wineId}",
  request: {
    body: { content: { "application/json": { schema: upsertRatingSchema } } },
    params: wineIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: ratingSchema } },
      description: "Saved rating",
    },
  },
  security,
  summary: "Create or update the rating for a wine",
  tags: ["Ratings"],
});

ratingsRouter.put(
  "/:wineId",
  validate({ body: upsertRatingSchema, params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json(
      await upsertRating(req.userId, req.params.wineId as string, req.body)
    );
  })
);

registry.registerPath({
  method: "post",
  path: "/ratings/{wineId}/photo",
  request: {
    body: { content: { "application/json": { schema: imageUploadSchema } } },
    params: wineIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: ratingSchema } },
      description: "Updated rating",
    },
  },
  security,
  summary: "Attach a tasting photo to an existing rating",
  tags: ["Ratings"],
});

ratingsRouter.post(
  "/:wineId/photo",
  validate({ body: imageUploadSchema, params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json(
      await setRatingPhoto(
        req.userId,
        req.params.wineId as string,
        decodeImage(req.body.image)
      )
    );
  })
);

registry.registerPath({
  method: "delete",
  path: "/ratings/{wineId}",
  request: { params: wineIdParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: okResponse } },
      description: "Removed",
    },
  },
  security,
  summary: "Remove the rating for a wine",
  tags: ["Ratings"],
});

ratingsRouter.delete(
  "/:wineId",
  validate({ params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    await removeRating(req.userId, req.params.wineId as string);
    res.json({ ok: true });
  })
);
