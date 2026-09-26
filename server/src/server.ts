import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { ensureUploadsDirExists } from "./lib/storage.js";

await ensureUploadsDirExists();

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Wine Cellar API listening on port ${env.PORT}`);
});
