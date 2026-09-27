import { randomUUID } from "node:crypto";
import { HttpError } from "./http-error.js";
import { logger } from "./logger.js";

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export interface JobError {
  code: string | null;
  message: string;
}

export interface JobDto<TResult> {
  error: JobError | null;
  id: string;
  progress: number;
  result: TResult | null;
  stage: string;
  status: JobStatus;
}

export interface JobContext {
  report: (stage: string, progress?: number) => void;
  signal: AbortSignal;
}

export type JobRunner<TResult> = (context: JobContext) => Promise<TResult>;

interface Job<TResult> extends JobDto<TResult> {
  controller: AbortController;
  finishedAt: number | null;
  ownerId: string | null;
}

export interface JobQueueOptions {
  failureMessage: string;
  name: string;
  queuedStage: string;
  retentionMs?: number;
}

const DEFAULT_RETENTION_MS = 60 * 60 * 1000;

export class JobCancelledError extends Error {
  constructor() {
    super("Job cancelled");
    this.name = "JobCancelledError";
  }
}

function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export class JobQueue<TResult> {
  private readonly jobs = new Map<string, Job<TResult>>();
  private chain: Promise<void> = Promise.resolve();
  private readonly options: Required<JobQueueOptions>;

  constructor(options: JobQueueOptions) {
    this.options = { retentionMs: DEFAULT_RETENTION_MS, ...options };
  }

  start(ownerId: string | null, run: JobRunner<TResult>): JobDto<TResult> {
    this.pruneFinished(Date.now());
    const job: Job<TResult> = {
      controller: new AbortController(),
      error: null,
      finishedAt: null,
      id: randomUUID(),
      ownerId,
      progress: 0,
      result: null,
      stage: this.options.queuedStage,
      status: "queued",
    };
    this.jobs.set(job.id, job);
    this.chain = this.chain.then(() => this.execute(job, run));
    return toDto(job);
  }

  get(ownerId: string | null, id: string): JobDto<TResult> {
    return toDto(this.find(ownerId, id));
  }

  cancel(ownerId: string | null, id: string): JobDto<TResult> {
    const job = this.find(ownerId, id);
    if (job.status === "queued" || job.status === "running") {
      job.controller.abort(new JobCancelledError());
      if (job.status === "queued") {
        this.settle(job, "cancelled");
      }
    }
    return toDto(job);
  }

  findActive(
    predicate: (job: JobDto<TResult>) => boolean
  ): JobDto<TResult> | null {
    for (const job of this.jobs.values()) {
      if (
        (job.status === "queued" || job.status === "running") &&
        predicate(toDto(job))
      ) {
        return toDto(job);
      }
    }
    return null;
  }

  private find(ownerId: string | null, id: string): Job<TResult> {
    const job = this.jobs.get(id);
    if (!job || (job.ownerId !== null && job.ownerId !== ownerId)) {
      throw HttpError.notFound(`${this.options.name} job not found`);
    }
    return job;
  }

  private async execute(job: Job<TResult>, run: JobRunner<TResult>) {
    if (job.status !== "queued") {
      return;
    }
    job.status = "running";
    const context: JobContext = {
      report: (stage, progress) => {
        if (job.status !== "running") {
          return;
        }
        job.stage = stage;
        if (progress !== undefined) {
          job.progress = clampProgress(progress);
        }
      },
      signal: job.controller.signal,
    };
    try {
      const result = await run(context);
      if (job.controller.signal.aborted) {
        this.settle(job, "cancelled");
        return;
      }
      job.result = result;
      job.progress = 1;
      job.stage = "Done";
      this.settle(job, "done");
    } catch (error) {
      if (job.controller.signal.aborted || error instanceof JobCancelledError) {
        this.settle(job, "cancelled");
        return;
      }
      logger.warn(
        { err: error, jobId: job.id },
        `${this.options.name} job failed`
      );
      job.error =
        error instanceof HttpError
          ? { code: error.code ?? null, message: error.message }
          : { code: null, message: this.options.failureMessage };
      this.settle(job, "failed");
    }
  }

  private settle(job: Job<TResult>, status: JobStatus) {
    job.status = status;
    job.finishedAt = Date.now();
    if (status === "cancelled") {
      job.stage = "Cancelled";
    }
  }

  private pruneFinished(now: number) {
    for (const [id, job] of this.jobs) {
      if (
        job.finishedAt !== null &&
        now - job.finishedAt > this.options.retentionMs
      ) {
        this.jobs.delete(id);
      }
    }
  }
}

function toDto<TResult>(job: Job<TResult>): JobDto<TResult> {
  const { error, id, progress, result, stage, status } = job;
  return { error, id, progress, result, stage, status };
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new JobCancelledError();
  }
}
