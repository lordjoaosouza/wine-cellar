import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { bearerAuth, registry } from "../../openapi/registry.js";
import { accountArchiveSchema } from "./account.schemas.js";
import { exportAccount, importAccount } from "./account.service.js";

export const accountRouter = Router();
accountRouter.use(requireAuth);

const security = [{ [bearerAuth.name]: [] }];
const okResponse = z.object({ ok: z.literal(true) });

registry.registerPath({
  method: "get",
  path: "/account/export",
  responses: {
    200: {
      content: { "application/json": { schema: accountArchiveSchema } },
      description: "Archive",
    },
  },
  security,
  summary:
    "Export the full account archive (profile, wines, cellar, wishlist, ratings, recent views)",
  tags: ["Account"],
});

accountRouter.get(
  "/export",
  asyncHandler(async (req, res) => {
    res.json(await exportAccount(req.userId));
  })
);

registry.registerPath({
  method: "post",
  path: "/account/import",
  request: {
    body: { content: { "application/json": { schema: accountArchiveSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: okResponse } },
      description: "Imported",
    },
  },
  security,
  summary: "Restore an account archive produced by /account/export",
  tags: ["Account"],
});

accountRouter.post(
  "/import",
  validate({ body: accountArchiveSchema }),
  asyncHandler(async (req, res) => {
    await importAccount(req.userId, req.body);
    res.json({ ok: true });
  })
);
