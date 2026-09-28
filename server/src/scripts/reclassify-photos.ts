import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { analyzeBackground, stripWhiteMargin } from "../lib/catalog-photo.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { deleteImage, publicUrlForImage, uploadImage } from "../lib/storage.js";

const UPLOAD_PREFIX = "/uploads/";

interface Classification {
  fillsFrame: boolean;
  imageUrl: string;
}

function keyFor(imageUrl: string): string | null {
  return imageUrl.startsWith(UPLOAD_PREFIX)
    ? imageUrl.slice(UPLOAD_PREFIX.length)
    : null;
}

async function classify(
  key: string,
  imageUrl: string
): Promise<Classification> {
  const buffer = await readFile(path.join(path.resolve(env.UPLOADS_DIR), key));
  const { cornersWhite, insetWhite } = await analyzeBackground(buffer);
  if (cornersWhite && insetWhite) {
    return { fillsFrame: false, imageUrl };
  }
  if (!cornersWhite) {
    return { fillsFrame: true, imageUrl };
  }
  const stripped = await stripWhiteMargin({
    buffer,
    extension: path.extname(key),
    mimetype: "image/jpeg",
  });
  const replacement = publicUrlForImage(await uploadImage(stripped));
  await deleteImage(key);
  logger.info({ from: imageUrl, to: replacement }, "white margin removed");
  return { fillsFrame: true, imageUrl: replacement };
}

const wines = await prisma.wine.findMany({
  select: { id: true, imageUrl: true, name: true },
  where: { imageSource: "WEB", imageUrl: { not: null } },
});

let changed = 0;
for (const wine of wines) {
  const imageUrl = wine.imageUrl ?? "";
  const key = keyFor(imageUrl);
  if (!key) {
    continue;
  }
  let classification: Classification;
  try {
    classification = await classify(key, imageUrl);
  } catch (error) {
    logger.warn({ err: error, key }, "photo could not be read");
    continue;
  }
  const result = await prisma.wine.updateMany({
    data: {
      imageFillsFrame: classification.fillsFrame,
      imageUrl: classification.imageUrl,
    },
    where: {
      id: wine.id,
      NOT: {
        imageFillsFrame: classification.fillsFrame,
        imageUrl: classification.imageUrl,
      },
    },
  });
  if (result.count > 0) {
    changed += 1;
    logger.info(
      { fillsFrame: classification.fillsFrame, wine: wine.name },
      "photo reclassified"
    );
  }
}

logger.info({ changed, checked: wines.length }, "photo reclassification done");
await prisma.$disconnect();
