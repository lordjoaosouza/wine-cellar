-- CreateEnum
CREATE TYPE "TuyaRegion" AS ENUM ('US', 'EU', 'CN', 'IN');

-- CreateEnum
CREATE TYPE "WineImageSource" AS ENUM ('GPT', 'LABEL_SCAN', 'MANUAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "openaiApiKeyEncrypted" TEXT,
    "tuyaClientId" TEXT,
    "tuyaClientSecretEncrypted" TEXT,
    "tuyaDeviceId" TEXT,
    "tuyaRegion" "TuyaRegion",
    "targetTemperatureC" DOUBLE PRECISION NOT NULL DEFAULT 13,
    "targetHumidityPct" DOUBLE PRECISION NOT NULL DEFAULT 70,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wines" (
    "id" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vintage" TEXT,
    "type" TEXT,
    "winery" TEXT,
    "region" TEXT,
    "country" TEXT,
    "grapes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" TEXT,
    "guideScore" DOUBLE PRECISION,
    "tastingNotes" TEXT,
    "pairings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "imageSource" "WineImageSource",
    "producerProfile" TEXT,
    "regionProfile" TEXT,
    "servingNotes" TEXT,
    "agingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cellar_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cellar_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "balance" INTEGER NOT NULL,
    "complexity" INTEGER NOT NULL,
    "intensity" INTEGER NOT NULL,
    "persistence" INTEGER NOT NULL,
    "emotion" INTEGER NOT NULL,
    "visual" TEXT NOT NULL,
    "nose" TEXT NOT NULL,
    "palate" TEXT NOT NULL,
    "conclusion" TEXT NOT NULL,
    "photoUrl" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recent_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recent_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "login_codes_userId_idx" ON "login_codes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wines_normalizedKey_key" ON "wines"("normalizedKey");

-- CreateIndex
CREATE INDEX "wines_name_idx" ON "wines"("name");

-- CreateIndex
CREATE INDEX "wines_winery_idx" ON "wines"("winery");

-- CreateIndex
CREATE INDEX "wines_region_idx" ON "wines"("region");

-- CreateIndex
CREATE UNIQUE INDEX "cellar_items_userId_wineId_key" ON "cellar_items"("userId", "wineId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_wineId_key" ON "wishlist_items"("userId", "wineId");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_userId_wineId_key" ON "ratings"("userId", "wineId");

-- CreateIndex
CREATE UNIQUE INDEX "recent_views_userId_wineId_key" ON "recent_views"("userId", "wineId");

-- CreateIndex
CREATE INDEX "recent_views_userId_viewedAt_idx" ON "recent_views"("userId", "viewedAt");

-- AddForeignKey
ALTER TABLE "login_codes" ADD CONSTRAINT "login_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cellar_items" ADD CONSTRAINT "cellar_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cellar_items" ADD CONSTRAINT "cellar_items_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "wines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "wines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "wines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recent_views" ADD CONSTRAINT "recent_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recent_views" ADD CONSTRAINT "recent_views_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "wines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
