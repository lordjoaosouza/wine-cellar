import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { type ZodType, z } from "zod";

export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent(
  "securitySchemes",
  "bearerAuth",
  {
    bearerFormat: "JWT",
    scheme: "bearer",
    type: "http",
  }
);

export const security = [{ [bearerAuth.name]: [] }];

export const okResponseSchema = z.object({ ok: z.literal(true) });

export function jsonResponse(
  status: number,
  schema: ZodType,
  description: string
) {
  return {
    [status]: {
      content: { "application/json": { schema } },
      description,
    },
  };
}
