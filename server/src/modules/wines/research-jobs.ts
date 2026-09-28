import {
  type JobContext,
  type JobDto,
  JobQueue,
  type JobStatus,
} from "../../lib/job-queue.js";
import type { WineDto } from "./wines.schemas.js";

export interface ResearchJobDto {
  error: JobDto<WineDto[]>["error"];
  id: string;
  progress: number;
  results: WineDto[] | null;
  stage: string;
  status: JobStatus;
}

export type ResearchContext = JobContext;
export type ReportStage = JobContext["report"];

const queue = new JobQueue<WineDto[]>({
  failureMessage: "Research failed",
  name: "Research",
  queuedStage: "Waiting for another search to finish",
});

function toResearchDto(job: JobDto<WineDto[]>): ResearchJobDto {
  const { error, id, progress, result, stage, status } = job;
  return { error, id, progress, results: result, stage, status };
}

export function startResearchJob(
  userId: string,
  run: (context: ResearchContext) => Promise<WineDto[]>
): ResearchJobDto {
  return toResearchDto(queue.start(userId, run));
}

export function getResearchJob(userId: string, id: string): ResearchJobDto {
  return toResearchDto(queue.get(userId, id));
}

export function cancelResearchJob(userId: string, id: string): ResearchJobDto {
  return toResearchDto(queue.cancel(userId, id));
}

export function idleContext(): ResearchContext {
  return { report: () => undefined, signal: new AbortController().signal };
}
