-- Wine photos can no longer be set by hand: they come from stores (WEB) or
-- from the label photo taken to identify the wine (LABEL_SCAN). Photos that
-- were uploaded by hand are kept, as the user's own photo of the label.
UPDATE "wines" SET "imageSource" = 'LABEL_SCAN' WHERE "imageSource" = 'MANUAL';

ALTER TYPE "WineImageSource" RENAME TO "WineImageSource_old";
CREATE TYPE "WineImageSource" AS ENUM ('WEB', 'LABEL_SCAN');
ALTER TABLE "wines"
  ALTER COLUMN "imageSource" TYPE "WineImageSource"
  USING "imageSource"::text::"WineImageSource";
DROP TYPE "WineImageSource_old";
