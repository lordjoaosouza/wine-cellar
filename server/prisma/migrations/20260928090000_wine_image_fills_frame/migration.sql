ALTER TABLE "wines" ADD COLUMN "imageFillsFrame" BOOLEAN NOT NULL DEFAULT false;

UPDATE "wines" SET "imageFillsFrame" = true WHERE "imageSource" = 'LABEL_SCAN';
