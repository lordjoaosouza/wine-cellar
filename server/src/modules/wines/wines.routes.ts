import { Router } from "express";
import type { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { decodeImage, imageUploadSchema } from "../../lib/image-payload.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { bearerAuth, registry } from "../../openapi/registry.js";
import { getResearchJob, startResearchJob } from "./research-jobs.js";
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

const security = [{ [bearerAuth.name]: [] }];

const jobStartedResponse = {
  202: {
    content: { "application/json": { schema: researchJobSchema } },
    description:
      "Research job started — poll GET /wines/research/{jobId} for progress and results",
  },
};

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
    "Search the local wine catalog (fast). Use POST /wines/research to look for new wines on the web.",
  tags: ["Wines"],
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
  tags: ["Wines"],
});

winesRouter.post(
  "/research",
  validate({ body: wineResearchBodySchema }),
  (req, res) => {
    const { q } = req.body as z.infer<typeof wineResearchBodySchema>;
    res
      .status(202)
      .json(startResearchJob(req.userId, (report) => researchWines(q, report)));
  }
);

registry.registerPath({
  method: "get",
  path: "/wines/research/{jobId}",
  request: { params: researchJobParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: researchJobSchema } },
      description: "Job progress; results are set once status is done",
    },
  },
  security,
  summary: "Poll a research job",
  tags: ["Wines"],
});

winesRouter.get(
  "/research/:jobId",
  validate({ params: researchJobParamsSchema }),
  (req, res) => {
    res.json(getResearchJob(req.userId, req.params.jobId as string));
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
  tags: ["Wines"],
});

winesRouter.post(
  "/identify-label",
  validate({ body: imageUploadSchema }),
  (req, res) => {
    const photo = decodeImage(req.body.image);
    res
      .status(202)
      .json(
        startResearchJob(req.userId, (report) =>
          identifyWineFromLabel(photo, report)
        )
      );
  }
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
  responses: jobStartedResponse,
  security,
  summary:
    "Re-research this exact wine on the web and overwrite its stored data",
  tags: ["Wines"],
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
        startResearchJob(req.userId, async (report) => [
          await refreshWine(id, report),
        ])
      );
  })
);
