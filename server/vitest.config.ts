import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/generated/**"],
      include: ["src/**"],
      provider: "v8",
      reporter: ["text", "html"],
    },
    environment: "node",
    // Integration files share one Postgres database and truncate it between tests.
    fileParallelism: false,
    globals: false,
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
  },
});
