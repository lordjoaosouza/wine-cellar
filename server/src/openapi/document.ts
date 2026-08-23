import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry.js";

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    info: {
      description:
        "Backend for the Wine Cellar app: wine catalog search (DB-first, GPT fallback), cellar, wishlist, ratings, and Tuya cellar sensor integration.",
      title: "Wine Cellar API",
      version: "1.0.0",
    },
    openapi: "3.0.3",
    servers: [{ url: "/" }],
  });
}
