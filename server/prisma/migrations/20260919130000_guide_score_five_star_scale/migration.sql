UPDATE "wines"
SET "guideScore" = ROUND(("guideScore" / 2)::numeric, 1)::double precision
WHERE "guideScore" IS NOT NULL;
