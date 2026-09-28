import { describe, expect, it } from "vitest";
import { HttpError } from "../../src/lib/http-error.js";
import {
  cancelResearchJob,
  getResearchJob,
  startResearchJob,
} from "../../src/modules/wines/research-jobs.js";
import type { WineDto } from "../../src/modules/wines/wines.schemas.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("research jobs", () => {
  it("reports stages and progress while running and results once done", async () => {
    const work = deferred<WineDto[]>();
    const job = startResearchJob("user-1", ({ report }) => {
      report("Checking stores for Catena Malbec", 0.3);
      return work.promise;
    });
    await settle();

    expect(getResearchJob("user-1", job.id)).toMatchObject({
      progress: 0.3,
      stage: "Checking stores for Catena Malbec",
      status: "running",
    });

    work.resolve([]);
    await settle();
    expect(getResearchJob("user-1", job.id)).toMatchObject({
      progress: 1,
      results: [],
      status: "done",
    });
  });

  it("runs one job at a time, queueing the rest", async () => {
    const first = deferred<WineDto[]>();
    const firstJob = startResearchJob("user-1", () => first.promise);
    const secondJob = startResearchJob("user-1", () => Promise.resolve([]));
    await settle();

    expect(getResearchJob("user-1", firstJob.id).status).toBe("running");
    expect(getResearchJob("user-1", secondJob.id).status).toBe("queued");

    first.resolve([]);
    await settle();
    await settle();
    expect(getResearchJob("user-1", secondJob.id).status).toBe("done");
  });

  it("keeps the error code of a failed job", async () => {
    const job = startResearchJob("user-1", () =>
      Promise.reject(
        HttpError.serviceUnavailableWithCode("llm_unavailable", "Ollama down")
      )
    );
    await settle();
    await settle();

    expect(getResearchJob("user-1", job.id)).toMatchObject({
      error: { code: "llm_unavailable", message: "Ollama down" },
      status: "failed",
    });
  });

  it("cancels a running job through its abort signal", async () => {
    const work = deferred<WineDto[]>();
    const job = startResearchJob("user-1", ({ signal }) => {
      signal.addEventListener("abort", () => work.reject(signal.reason));
      return work.promise;
    });
    await settle();

    expect(cancelResearchJob("user-1", job.id).status).toBe("running");
    await settle();
    expect(getResearchJob("user-1", job.id)).toMatchObject({
      results: null,
      stage: "Cancelled",
      status: "cancelled",
    });
  });

  it("cancels a queued job without ever running it", async () => {
    const first = deferred<WineDto[]>();
    startResearchJob("user-1", () => first.promise);
    let ran = false;
    const queued = startResearchJob("user-1", () => {
      ran = true;
      return Promise.resolve([]);
    });

    expect(cancelResearchJob("user-1", queued.id).status).toBe("cancelled");
    first.resolve([]);
    await settle();
    await settle();
    expect(ran).toBe(false);
  });

  it("hides other users' jobs", () => {
    const job = startResearchJob("user-1", () => Promise.resolve([]));
    expect(() => getResearchJob("user-2", job.id)).toThrow(HttpError);
    expect(() => cancelResearchJob("user-2", job.id)).toThrow(HttpError);
    expect(() => getResearchJob("user-1", "missing")).toThrow(HttpError);
  });
});
