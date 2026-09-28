import { env } from "../config/env.js";
import { ollama } from "./ollama.js";
import { prisma } from "./prisma.js";

export type CheckStatus = "ok" | "down";

export interface HealthReport {
  checks: { database: CheckStatus; ollama: CheckStatus; searxng: CheckStatus };
  status: "ok" | "degraded";
}

const CHECK_TIMEOUT_MS = 3000;

async function probe(run: () => Promise<unknown>): Promise<CheckStatus> {
  try {
    await run();
    return "ok";
  } catch {
    return "down";
  }
}

export async function checkHealth(): Promise<HealthReport> {
  const [database, ollamaStatus, searxng] = await Promise.all([
    probe(() => prisma.$queryRaw`SELECT 1`),
    probe(() => ollama.version(AbortSignal.timeout(CHECK_TIMEOUT_MS))),
    probe(async () => {
      const response = await fetch(new URL("/healthz", env.SEARXNG_URL), {
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`SearXNG ${response.status}`);
      }
    }),
  ]);
  const checks = { database, ollama: ollamaStatus, searxng };
  return {
    checks,
    status: Object.values(checks).every((check) => check === "ok")
      ? "ok"
      : "degraded",
  };
}
