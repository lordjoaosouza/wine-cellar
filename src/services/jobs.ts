import { ApiError, apiClient } from "@/services/api-client";
import type { JobStatus } from "@/types/ai";

export interface JobSnapshot {
  error: { code: string | null; message: string } | null;
  id: string;
  progress: number;
  stage: string;
  status: JobStatus;
}

export interface JobProgress {
  progress: number;
  stage: string;
}

export interface FollowJobOptions {
  onProgress?: (progress: JobProgress) => void;
  pollIntervalMs?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class JobCancelledError extends Error {
  constructor() {
    super("Cancelled");
    this.name = "JobCancelledError";
  }
}

export class JobFailedError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null) {
    super(message);
    this.name = "JobFailedError";
    this.code = code;
  }
}

const DEFAULT_POLL_MS = 1500;
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      signal?.removeEventListener("abort", done);
      clearTimeout(timer);
      resolve();
    }
    signal?.addEventListener("abort", done, { once: true });
  });
}

export async function followJob<T extends JobSnapshot>(
  started: T,
  path: (id: string) => string,
  options: FollowJobOptions = {}
): Promise<T> {
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const interval = options.pollIntervalMs ?? DEFAULT_POLL_MS;
  let job = started;
  while (job.status === "queued" || job.status === "running") {
    options.onProgress?.({ progress: job.progress, stage: job.stage });
    if (options.signal?.aborted) {
      await apiClient.delete(path(job.id)).catch(() => undefined);
      throw new JobCancelledError();
    }
    if (Date.now() > deadline) {
      throw new Error("This is taking too long. Try again in a moment.");
    }
    await wait(interval, options.signal);
    if (options.signal?.aborted) {
      continue;
    }
    job = await apiClient.get<T>(path(job.id));
  }
  if (job.status === "cancelled") {
    throw new JobCancelledError();
  }
  if (job.status === "failed") {
    throw new JobFailedError(
      job.error?.message ?? "The job failed.",
      job.error?.code ?? null
    );
  }
  options.onProgress?.({ progress: 1, stage: job.stage });
  return job;
}

export function isUnavailableCode(error: unknown): boolean {
  const code =
    error instanceof JobFailedError || error instanceof ApiError
      ? error.code
      : null;
  return code === "llm_unavailable" || code === "llm_model_missing";
}
