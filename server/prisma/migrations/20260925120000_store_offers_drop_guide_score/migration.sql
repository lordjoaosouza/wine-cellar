-- AlterTable
ALTER TABLE "wines" DROP COLUMN "guideScore",
ADD COLUMN     "offers" JSONB NOT NULL DEFAULT '[]';
