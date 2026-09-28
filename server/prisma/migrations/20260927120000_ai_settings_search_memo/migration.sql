ALTER TABLE "wines" ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';

UPDATE "wines" SET "searchText" = lower(
  regexp_replace(
    translate(
      concat_ws(' ', "name", "winery", "region", "country", "vintage", array_to_string("grapes", ' ')),
      'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOooooooUUUUuuuuCcNn'
    ),
    '[^A-Za-z0-9]+', ' ', 'g'
  )
);

CREATE INDEX "wines_searchText_idx" ON "wines"("searchText");

CREATE TABLE "search_queries" (
    "id" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "wineIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_queries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "search_queries_normalized_key" ON "search_queries"("normalized");

CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);
