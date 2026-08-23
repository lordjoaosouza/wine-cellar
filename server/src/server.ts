import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { ensureBucketExists } from "./lib/storage.js";

await ensureBucketExists();

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Wine Cellar API listening on port ${env.PORT}`);
});
