import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { bearerAuth, registry } from "../../openapi/registry.js";
import {
  addToWishlistSchema,
  wineIdParamsSchema,
  wishlistItemSchema,
} from "./wishlist.schemas.js";
import {
  addToWishlist,
  listWishlist,
  removeFromWishlist,
} from "./wishlist.service.js";

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);

const security = [{ [bearerAuth.name]: [] }];
const listResponse = z.array(wishlistItemSchema);

registry.registerPath({
  method: "get",
  path: "/wishlist",
  responses: {
    200: {
      content: { "application/json": { schema: listResponse } },
      description: "Wishlist items",
    },
  },
  security,
  summary: "List the authenticated user's wishlist",
  tags: ["Wishlist"],
});

wishlistRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listWishlist(req.userId));
  })
);

registry.registerPath({
  method: "post",
  path: "/wishlist",
  request: {
    body: { content: { "application/json": { schema: addToWishlistSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: listResponse } },
      description: "Updated wishlist",
    },
  },
  security,
  summary: "Add a wine to the wishlist",
  tags: ["Wishlist"],
});

wishlistRouter.post(
  "/",
  validate({ body: addToWishlistSchema }),
  asyncHandler(async (req, res) => {
    res.json(await addToWishlist(req.userId, req.body.wineId));
  })
);

registry.registerPath({
  method: "delete",
  path: "/wishlist/{wineId}",
  request: { params: wineIdParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: listResponse } },
      description: "Updated wishlist",
    },
  },
  security,
  summary: "Remove a wine from the wishlist",
  tags: ["Wishlist"],
});

wishlistRouter.delete(
  "/:wineId",
  validate({ params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json(await removeFromWishlist(req.userId, req.params.wineId as string));
  })
);
