import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { HttpError } from "../../lib/http-error.js";
import { getImage } from "../../lib/storage.js";

export const uploadsRouter = Router();

const ONE_YEAR_SECONDS = 31_536_000;

uploadsRouter.get(
  "/:key",
  asyncHandler(async (req, res) => {
    const image = await getImage(req.params.key as string).catch(() => {
      throw HttpError.notFound("Image not found");
    });
    res.setHeader("Content-Type", image.contentType);
    res.setHeader(
      "Cache-Control",
      `public, max-age=${ONE_YEAR_SECONDS}, immutable`
    );
    image.body.pipe(res);
  })
);
