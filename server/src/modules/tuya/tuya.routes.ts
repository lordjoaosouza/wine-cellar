import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { bearerAuth, registry } from "../../openapi/registry.js";
import { tuyaCredentialsInputSchema } from "../users/users.schemas.js";
import { tuyaReadingSchema } from "./tuya.schemas.js";
import { readUserCellarSensor, testTuyaCredentials } from "./tuya.service.js";

export const tuyaRouter = Router();
tuyaRouter.use(requireAuth);

const security = [{ [bearerAuth.name]: [] }];

registry.registerPath({
  method: "get",
  path: "/tuya/reading",
  responses: {
    200: {
      content: { "application/json": { schema: tuyaReadingSchema } },
      description: "Reading",
    },
  },
  security,
  summary:
    "Read the current temperature/humidity from the authenticated user's cellar sensor",
  tags: ["Tuya"],
});

tuyaRouter.get(
  "/reading",
  asyncHandler(async (req, res) => {
    res.json(await readUserCellarSensor(req.userId));
  })
);

registry.registerPath({
  method: "post",
  path: "/tuya/test",
  request: {
    body: {
      content: { "application/json": { schema: tuyaCredentialsInputSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: tuyaReadingSchema } },
      description: "Reading from the tested device",
    },
  },
  security,
  summary: "Validate a set of Tuya credentials before saving them",
  tags: ["Tuya"],
});

tuyaRouter.post(
  "/test",
  validate({ body: tuyaCredentialsInputSchema }),
  asyncHandler(async (req, res) => {
    res.json(await testTuyaCredentials(req.body));
  })
);
