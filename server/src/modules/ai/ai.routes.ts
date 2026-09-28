import { Router } from "express";
import type { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  jsonResponse,
  okResponseSchema,
  registry,
  security,
} from "../../openapi/registry.js";
import {
  aiStatusSchema,
  pullJobParamsSchema,
  pullJobSchema,
  selectModelBodySchema,
  selectModelResponseSchema,
  updateAiSettingsSchema,
} from "./ai.schemas.js";
import {
  downloadModel,
  getAiStatus,
  removeModel,
  selectModel,
  updateAiSettings,
} from "./ai.service.js";
import { cancelModelPull, getModelPull } from "./model-pulls.js";

export const aiRouter = Router();
aiRouter.use(requireAuth);

const tags = ["AI"];

registry.registerPath({
  method: "get",
  path: "/ai/status",
  responses: jsonResponse(
    200,
    aiStatusSchema,
    "Ollama status, models and settings"
  ),
  security,
  summary:
    "Ollama reachability, installed and suggested models, the active model and research depth",
  tags,
});

aiRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    res.json(await getAiStatus());
  })
);

registry.registerPath({
  method: "patch",
  path: "/ai/settings",
  request: {
    body: {
      content: { "application/json": { schema: updateAiSettingsSchema } },
    },
  },
  responses: jsonResponse(200, aiStatusSchema, "Updated status"),
  security,
  summary: "Change research depth",
  tags,
});

aiRouter.patch(
  "/settings",
  validate({ body: updateAiSettingsSchema }),
  asyncHandler(async (req, res) => {
    res.json(
      await updateAiSettings(req.body as z.infer<typeof updateAiSettingsSchema>)
    );
  })
);

registry.registerPath({
  method: "post",
  path: "/ai/models/select",
  request: {
    body: {
      content: { "application/json": { schema: selectModelBodySchema } },
    },
  },
  responses: jsonResponse(
    200,
    selectModelResponseSchema,
    "Activated immediately, or a download job that activates the model when it finishes"
  ),
  security,
  summary:
    "Use a model for research and label reading, downloading it first if needed",
  tags,
});

aiRouter.post(
  "/models/select",
  validate({ body: selectModelBodySchema }),
  asyncHandler(async (req, res) => {
    res.json(await selectModel(req.body.model as string));
  })
);

registry.registerPath({
  method: "post",
  path: "/ai/models/pull",
  request: {
    body: {
      content: { "application/json": { schema: selectModelBodySchema } },
    },
  },
  responses: jsonResponse(202, pullJobSchema, "Download job started"),
  security,
  summary: "Download a model without activating it",
  tags,
});

aiRouter.post(
  "/models/pull",
  validate({ body: selectModelBodySchema }),
  (req, res) => {
    res.status(202).json(downloadModel(req.body.model as string));
  }
);

registry.registerPath({
  method: "post",
  path: "/ai/models/remove",
  request: {
    body: {
      content: { "application/json": { schema: selectModelBodySchema } },
    },
  },
  responses: jsonResponse(200, okResponseSchema, "Removed"),
  security,
  summary: "Delete a downloaded model from Ollama",
  tags,
});

aiRouter.post(
  "/models/remove",
  validate({ body: selectModelBodySchema }),
  asyncHandler(async (req, res) => {
    await removeModel(req.body.model as string);
    res.json({ ok: true });
  })
);

registry.registerPath({
  method: "get",
  path: "/ai/pulls/{jobId}",
  request: { params: pullJobParamsSchema },
  responses: jsonResponse(200, pullJobSchema, "Download progress"),
  security,
  summary: "Poll a model download",
  tags,
});

aiRouter.get(
  "/pulls/:jobId",
  validate({ params: pullJobParamsSchema }),
  (req, res) => {
    res.json(getModelPull(req.params.jobId as string));
  }
);

registry.registerPath({
  method: "delete",
  path: "/ai/pulls/{jobId}",
  request: { params: pullJobParamsSchema },
  responses: jsonResponse(200, pullJobSchema, "Cancelled"),
  security,
  summary: "Cancel a model download",
  tags,
});

aiRouter.delete(
  "/pulls/:jobId",
  validate({ params: pullJobParamsSchema }),
  (req, res) => {
    res.json(cancelModelPull(req.params.jobId as string));
  }
);
