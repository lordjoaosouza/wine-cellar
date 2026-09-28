-- Research now runs on a local model; per-user OpenAI keys are gone.
ALTER TABLE "users" DROP COLUMN "openaiApiKeyEncrypted";

-- Photos found on the web are no longer found by GPT.
ALTER TYPE "WineImageSource" RENAME VALUE 'GPT' TO 'WEB';
