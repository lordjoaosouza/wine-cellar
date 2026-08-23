import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { IMAGE_BODY_LIMIT } from "./lib/image-payload.js";
import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { accountRouter } from "./modules/account/account.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { cellarRouter } from "./modules/cellar/cellar.routes.js";
import { ratingsRouter } from "./modules/ratings/ratings.routes.js";
import { recentViewsRouter } from "./modules/recent-views/recent-views.routes.js";
import { tuyaRouter } from "./modules/tuya/tuya.routes.js";
import { uploadsRouter } from "./modules/uploads/uploads.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { winesRouter } from "./modules/wines/wines.routes.js";
import { wishlistRouter } from "./modules/wishlist/wishlist.routes.js";
import { buildOpenApiDocument } from "./openapi/document.js";

const IMAGE_UPLOAD_PATHS = [
  "/wines/identify-label",
  "/wines/:id/image",
  "/ratings/:wineId/photo",
];

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({ origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : true })
  );
  app.post(IMAGE_UPLOAD_PATHS, express.json({ limit: IMAGE_BODY_LIMIT }));
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger }));
  app.use("/uploads", uploadsRouter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(buildOpenApiDocument()));

  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/wines", winesRouter);
  app.use("/cellar", cellarRouter);
  app.use("/wishlist", wishlistRouter);
  app.use("/ratings", ratingsRouter);
  app.use("/recent-views", recentViewsRouter);
  app.use("/tuya", tuyaRouter);
  app.use("/account", accountRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
