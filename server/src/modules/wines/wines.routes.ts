import { Router } from "express";
import type { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { decodeImage, imageUploadSchema } from "../../lib/image-payload.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { jsonResponse, registry, security } from "../../openapi/registry.js";
import {
  cancelResearchJob,
  getResearchJob,
  startResearchJob,
} from "./research-jobs.js";
import {
  researchJobParamsSchema,
  researchJobSchema,
  wineIdParamsSchema,
  wineResearchBodySchema,
  wineSchema,
  wineSearchQuerySchema,
  wineSearchResponseSchema,
} from "./wines.schemas.js";
import {
  getWineDetails,
  identifyWineFromLabel,
  refreshWine,
  researchWines,
  searchWines,
} from "./wines.service.js";

export const winesRouter = Router();
winesRouter.use(requireAuth);

const tags = ["Wines"];

const jobStartedResponse = jsonResponse(
  202,
  researchJobSchema,
  "Research job started; poll GET /wines/research/{jobId} for progress and results"
);

registry.registerPath({
  method: "get",
  path: "/wines/search",
  request: { query: wineSearchQuerySchema },
  responses: jsonResponse(200, wineSearchResponseSchema, "Search results"),
  security,
  summary:
    "Search the local catalog (fast, accent-insensitive, any word order). Use POST /wines/research to look for new wines on the web.",
  tags,
});

winesRouter.get(
  "/search",
  validate({ query: wineSearchQuerySchema }),
  asyncHandler(async (req, res) => {
    const { q } = req.query as unknown as z.infer<typeof wineSearchQuerySchema>;
    res.json(await searchWines(q));
  })
);

registry.registerPath({
  method: "post",
  path: "/wines/research",
  request: {
    body: {
      content: { "application/json": { schema: wineResearchBodySchema } },
    },
  },
  responses: jobStartedResponse,
  security,
  summary:
    "Research wines on the web with the local AI model (stores first, then producer pages)",
  tags,
});

winesRouter.post(
  "/research",
  validate({ body: wineResearchBodySchema }),
  (req, res) => {
    const { q } = req.body as z.infer<typeof wineResearchBodySchema>;
    res
      .status(202)
      .json(
        startResearchJob(req.userId, (context) => researchWines(q, context))
      );
  }
);

registry.registerPath({
  method: "get",
  path: "/wines/research/{jobId}",
  request: { params: researchJobParamsSchema },
  responses: jsonResponse(
    200,
    researchJobSchema,
    "Job progress; results are set once status is done"
  ),
  security,
  summary: "Poll a research job",
  tags,
});

winesRouter.get(
  "/research/:jobId",
  validate({ params: researchJobParamsSchema }),
  (req, res) => {
    res.json(getResearchJob(req.userId, req.params.jobId as string));
  }
);

registry.registerPath({
  method: "delete",
  path: "/wines/research/{jobId}",
  request: { params: researchJobParamsSchema },
  responses: jsonResponse(200, researchJobSchema, "Cancelled job"),
  security,
  summary: "Cancel a research job that is queued or running",
  tags,
});

winesRouter.delete(
  "/research/:jobId",
  validate({ params: researchJobParamsSchema }),
  (req, res) => {
    res.json(cancelResearchJob(req.userId, req.params.jobId as string));
  }
);

registry.registerPath({
  method: "post",
  path: "/wines/identify-label",
  request: {
    body: { content: { "application/json": { schema: imageUploadSchema } } },
  },
  responses: jobStartedResponse,
  security,
  summary:
    "Identify a wine from a photographed label (local vision model) and research it",
  tags,
});

winesRouter.post(
  "/identify-label",
  validate({ body: imageUploadSchema }),
  (req, res) => {
    const photo = decodeImage(req.body.image);
    res
      .status(202)
      .json(
        startResearchJob(req.userId, (context) =>
          identifyWineFromLabel(photo, context)
        )
      );
  }
);

registry.registerPath({
  method: "get",
  path: "/wines/{id}",
  request: { params: wineIdParamsSchema },
  responses: jsonResponse(200, wineSchema, "Wine"),
  security,
  summary: "Get a wine's full details",
  tags,
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
  responses: jobStartedResponse,
  security,
  summary:
    "Re-research this exact wine on the web and overwrite its stored data",
  tags,
});

winesRouter.post(
  "/:id/refresh",
  validate({ params: wineIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    await getWineDetails(id);
    res
      .status(202)
      .json(
        startResearchJob(req.userId, async (context) => [
          await refreshWine(id, context),
        ])
      );
  })
);
