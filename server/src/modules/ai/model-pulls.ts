import { type JobDto, JobQueue } from "../../lib/job-queue.js";
import { ollama, toLlmHttpError } from "../../lib/ollama.js";
import type { PullJobDto } from "./ai.schemas.js";

interface PullResult {
  model: string;
}

interface PullMeta {
  completedBytes: number;
  model: string;
  totalBytes: number;
}

const queue = new JobQueue<PullResult>({
  failureMessage: "The download failed",
  name: "Model download",
  queuedStage: "Waiting for another download to finish",
});
const meta = new Map<string, PullMeta>();

function toPullDto(job: JobDto<PullResult>): PullJobDto {
  const info = meta.get(job.id);
  return {
    completedBytes: info?.completedBytes ?? 0,
    error: job.error,
    id: job.id,
    model: info?.model ?? job.result?.model ?? "",
    progress: job.progress,
    stage: job.stage,
    status: job.status,
    totalBytes: info?.totalBytes ?? 0,
  };
}

function humanBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

export function startModelPull(
  model: string,
  onDone: (model: string) => Promise<void>
): PullJobDto {
  const active = activePullFor(model);
  if (active) {
    return active;
  }
  const job = queue.start(null, async ({ report, signal }) => {
    report(`Preparing ${model}`, 0);
    try {
      await ollama.pull(
        model,
        ({ completedBytes, stage, totalBytes }) => {
          const info = meta.get(job.id);
          if (info) {
            info.completedBytes = completedBytes;
            info.totalBytes = totalBytes;
          }
          if (totalBytes > 0) {
            report(
              `Downloading ${humanBytes(completedBytes)} of ${humanBytes(totalBytes)}`,
              completedBytes / totalBytes
            );
          } else {
            report(stage);
          }
        },
        signal
      );
    } catch (error) {
      throw toLlmHttpError(error, model);
    }
    report("Installing", 1);
    await onDone(model);
    return { model };
  });
  meta.set(job.id, { completedBytes: 0, model, totalBytes: 0 });
  return toPullDto(job);
}

export function getModelPull(id: string): PullJobDto {
  return toPullDto(queue.get(null, id));
}

export function cancelModelPull(id: string): PullJobDto {
  return toPullDto(queue.cancel(null, id));
}

export function activePullFor(model: string): PullJobDto | null {
  const job = queue.findActive((entry) => meta.get(entry.id)?.model === model);
  return job ? toPullDto(job) : null;
}
