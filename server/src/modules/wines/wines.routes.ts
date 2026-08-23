import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { decodeImage, imageUploadSchema } from "../../lib/image-payload.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { bearerAuth, registry } from "../../openapi/registry.js";
import {
  setWineImageUrlSchema,
  wineIdParamsSchema,
  wineSchema,
  wineSearchQuerySchema,
  wineSearchResponseSchema,
} from "./wines.schemas.js";
import {
  getWineDetails,
  identifyWineFromLabel,
  refreshWineFromGpt,
  searchWineImageWithGpt,
  searchWines,
  setWineImageFile,
  setWineImageUrl,
} from "./wines.service.js";

export const winesRouter = Router();
winesRouter.use(requireAuth);

const security = [{ [bearerAuth.name]: [] }];

registry.registerPath({
  method: "get",
  path: "/wines/search",
  request: { query: wineSearchQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: wineSearchResponseSchema } },
      description: "Search results",
    },
  },
  security,
  summary:
    "Search wines — the local catalog first, falling back to GPT research when nothing matches",
  tags: ["Wines"],
});

winesRouter.get(
  "/search",
  validate({ query: wineSearchQuerySchema }),
  asyncHandler(async (req, res) => {
    const { q, refresh } = req.query as unknown as z.infer<
      typeof wineSearchQuerySchema
    >;
    const { results, total } = await searchWines(
      req.userId,
      q,
      refresh === true
    );
    res.json({ results, total });
  })
);

registry.registerPath({
  method: "post",
  path: "/wines/identify-label",
  request: {
    body: { content: { "application/json": { schema: imageUploadSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(wineSchema) } },
      description: "Candidate wines",
    },
  },
  security,
  summary:
    "Identify a wine from a photographed label (GPT vision) and research it",
  tags: ["Wines"],
});

winesRouter.post(
  "/identify-label",
  validate({ body: imageUploadSchema }),
  asyncHandler(async (req, res) => {
    const { dataUri } = decodeImage(req.body.image);
    res.json(await identifyWineFromLabel(req.userId, dataUri));
  })
);

registry.registerPath({
  method: "get",
  path: "/wines/{id}",
  request: { params: wineIdParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: wineSchema } },
      description: "Wine",
    },
  },
  security,
  summary: "Get a wine's full details",
  tags: ["Wines"],
});

winesRouter.get(
  "/:id",
  validate({ params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json(await getWineDetails(req.params.id as string));
  })
);

registry.registerPath({
  method: "post",
  path: "/wines/{id}/refresh",
  request: { params: wineIdParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: wineSchema } },
      description: "Refreshed wine",
    },
  },
  security,
  summary:
    "Re-verify this exact wine against GPT and overwrite its stored data",
  tags: ["Wines"],
});

winesRouter.post(
  "/:id/refresh",
  validate({ params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json(await refreshWineFromGpt(req.userId, req.params.id as string));
  })
);

registry.registerPath({
  method: "put",
  path: "/wines/{id}/image",
  request: {
    body: {
      content: { "application/json": { schema: setWineImageUrlSchema } },
    },
    params: wineIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: wineSchema } },
      description: "Updated wine",
    },
  },
  security,
  summary: "Set a wine's image from a URL (manual override)",
  tags: ["Wines"],
});

winesRouter.put(
  "/:id/image",
  validate({ body: setWineImageUrlSchema, params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json(await setWineImageUrl(req.params.id as string, req.body.imageUrl));
  })
);

registry.registerPath({
  method: "post",
  path: "/wines/{id}/image",
  request: {
    body: { content: { "application/json": { schema: imageUploadSchema } } },
    params: wineIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: wineSchema } },
      description: "Updated wine",
    },
  },
  security,
  summary: "Upload a label photo for a wine (manual override)",
  tags: ["Wines"],
});

winesRouter.post(
  "/:id/image",
  validate({ body: imageUploadSchema, params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json(
      await setWineImageFile(
        req.params.id as string,
        decodeImage(req.body.image)
      )
    );
  })
);

registry.registerPath({
  method: "post",
  path: "/wines/{id}/image/search",
  request: { params: wineIdParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: wineSchema } },
      description: "Wine, with imageUrl set if a photo was found",
    },
  },
  security,
  summary:
    "Opt-in: ask GPT to find a real product photo for this wine (slow, not used by default)",
  tags: ["Wines"],
});

winesRouter.post(
  "/:id/image/search",
  validate({ params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json(await searchWineImageWithGpt(req.userId, req.params.id as string));
  })
);
