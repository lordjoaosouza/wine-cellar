-- Photos stored on this server were saved as absolute URLs built from
-- PUBLIC_URL (often http://localhost:3000, unreachable from the phone). Keep
-- only the /uploads/<uuid>.<ext> path; the API makes it absolute per request.
UPDATE "wines"
SET "imageUrl" = substring("imageUrl" from '(/uploads/[0-9a-f-]{36}\.(jpg|png|webp))$')
WHERE "imageUrl" ~ '^https?://[^/]+/uploads/[0-9a-f-]{36}\.(jpg|png|webp)$';

UPDATE "ratings"
SET "photoUrl" = substring("photoUrl" from '(/uploads/[0-9a-f-]{36}\.(jpg|png|webp))$')
WHERE "photoUrl" ~ '^https?://[^/]+/uploads/[0-9a-f-]{36}\.(jpg|png|webp)$';

UPDATE "users"
SET "avatarUrl" = substring("avatarUrl" from '(/uploads/[0-9a-f-]{36}\.(jpg|png|webp))$')
WHERE "avatarUrl" ~ '^https?://[^/]+/uploads/[0-9a-f-]{36}\.(jpg|png|webp)$';
