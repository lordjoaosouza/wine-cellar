import { describe, expect, it } from "vitest";
import {
  JobCancelledError,
  JobQueue,
  throwIfAborted,
} from "../../src/lib/job-queue.js";

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function queue() {
  return new JobQueue<string>({
    failureMessage: "It broke",
    name: "Test",
    queuedStage: "Waiting",
  });
}

describe("JobQueue", () => {
  it("starts queued, clamps progress and exposes the result", async () => {
    const jobs = queue();
    const job = jobs.start("owner", ({ report }) => {
      report("halfway", 1.7);
      return Promise.resolve("done!");
    });
    expect(job).toMatchObject({
      progress: 0,
      stage: "Waiting",
      status: "queued",
    });
    await settle();
    expect(jobs.get("owner", job.id)).toMatchObject({
      progress: 1,
      result: "done!",
      status: "done",
    });
  });

  it("lets anyone read a job without an owner", async () => {
    const jobs = queue();
    const job = jobs.start(null, () => Promise.resolve("shared"));
    await settle();
    expect(jobs.get("anyone", job.id).result).toBe("shared");
    expect(jobs.get(null, job.id).result).toBe("shared");
  });

  it("uses the generic failure message for unexpected errors", async () => {
    const jobs = queue();
    const job = jobs.start("owner", () => Promise.reject(new Error("boom")));
    await settle();
    expect(jobs.get("owner", job.id).error).toEqual({
      code: null,
      message: "It broke",
    });
  });

  it("treats a JobCancelledError thrown by the runner as a cancellation", async () => {
    const jobs = queue();
    const job = jobs.start("owner", ({ signal }) => {
      jobs.cancel("owner", job.id);
      throwIfAborted(signal);
      return Promise.resolve("never");
    });
    await settle();
    expect(jobs.get("owner", job.id).status).toBe("cancelled");
  });

  it("finds an active job by predicate", async () => {
    const jobs = queue();
    const pending = new Promise<string>(() => undefined);
    const job = jobs.start(null, () => pending);
    expect(jobs.findActive((entry) => entry.id === job.id)?.id).toBe(job.id);
    expect(jobs.findActive(() => false)).toBeNull();
    jobs.cancel(null, job.id);
    await settle();
    expect(jobs.findActive((entry) => entry.id === job.id)).toBeNull();
  });

  it("forgets finished jobs after the retention period", async () => {
    const jobs = new JobQueue<string>({
      failureMessage: "x",
      name: "Test",
      queuedStage: "Waiting",
      retentionMs: 0,
    });
    const job = jobs.start("owner", () => Promise.resolve("old"));
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 2));
    jobs.start("owner", () => Promise.resolve("new"));
    expect(() => jobs.get("owner", job.id)).toThrow("Test job not found");
  });

  it("throwIfAborted is a no-op for live signals", () => {
    expect(() => throwIfAborted(new AbortController().signal)).not.toThrow();
    const controller = new AbortController();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow(JobCancelledError);
  });
});
