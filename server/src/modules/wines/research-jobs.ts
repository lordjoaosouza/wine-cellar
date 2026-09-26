import { randomUUID } from "node:crypto";
import { HttpError } from "../../lib/http-error.js";
import { logger } from "../../lib/logger.js";
import type { WineDto } from "./wines.schemas.js";

/**
 * Web research on a local model takes minutes — longer than a phone keeps an
 * idle request open — so it runs as a background job the app polls. Jobs are
 * kept in memory: the API is a single process, and a job lost to a restart
 * just gets retried by the user.
 */
export type ResearchJobStatus = "queued" | "running" | "done" | "failed";

export interface ResearchJobDto {
  error: { code: string | null; message: string } | null;
  id: string;
  results: WineDto[] | null;
  stage: string;
  status: ResearchJobStatus;
}

interface ResearchJob extends ResearchJobDto {
  finishedAt: number | null;
  userId: string;
}

export type ReportStage = (stage: string) => void;

const JOB_RETENTION_MS = 60 * 60 * 1000;

const jobs = new Map<string, ResearchJob>();
// One job at a time: the model can't run two researches any faster in
// parallel, and queuing keeps each one's stage honest.
let queue: Promise<void> = Promise.resolve();

function toDto(job: ResearchJob): ResearchJobDto {
  const { error, id, results, stage, status } = job;
  return { error, id, results, stage, status };
}

function pruneFinishedJobs(now: number): void {
  for (const [id, job] of jobs) {
    if (job.finishedAt !== null && now - job.finishedAt > JOB_RETENTION_MS) {
      jobs.delete(id);
    }
  }
}

async function runJob(
  job: ResearchJob,
  run: (report: ReportStage) => Promise<WineDto[]>
): Promise<void> {
  job.status = "running";
  try {
    job.results = await run((stage) => {
      job.stage = stage;
    });
    job.status = "done";
    job.stage = "Done";
  } catch (error) {
    logger.warn({ err: error, jobId: job.id }, "research job failed");
    job.status = "failed";
    job.error =
      error instanceof HttpError
        ? { code: error.code ?? null, message: error.message }
        : { code: null, message: "Research failed" };
  } finally {
    job.finishedAt = Date.now();
  }
}

export function startResearchJob(
  userId: string,
  run: (report: ReportStage) => Promise<WineDto[]>
): ResearchJobDto {
  pruneFinishedJobs(Date.now());
  const job: ResearchJob = {
    error: null,
    finishedAt: null,
    id: randomUUID(),
    results: null,
    stage: "Waiting for another search to finish",
    status: "queued",
    userId,
  };
  jobs.set(job.id, job);
  queue = queue.then(() => runJob(job, run));
  return toDto(job);
}

export function getResearchJob(userId: string, id: string): ResearchJobDto {
  const job = jobs.get(id);
  if (!job || job.userId !== userId) {
    throw HttpError.notFound("Research job not found");
  }
  return toDto(job);
}
