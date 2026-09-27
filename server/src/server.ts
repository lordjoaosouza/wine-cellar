import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { warmUpModel } from "./lib/ollama.js";
import { prisma } from "./lib/prisma.js";
import { ensureUploadsDirExists } from "./lib/storage.js";

await ensureUploadsDirExists();

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Wine Cellar API listening on port ${env.PORT}`);
  void warmUpModel();
});

function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => shutdown(signal));
}
