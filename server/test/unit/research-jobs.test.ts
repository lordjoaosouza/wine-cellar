import { describe, expect, it } from "vitest";
import { HttpError } from "../../src/lib/http-error.js";
import {
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
  it("reports stages while running and results once done", async () => {
    const work = deferred<WineDto[]>();
    const job = startResearchJob("user-1", (report) => {
      report("Checking stores for Catena Malbec");
      return work.promise;
    });
    await settle();

    expect(getResearchJob("user-1", job.id)).toMatchObject({
      stage: "Checking stores for Catena Malbec",
      status: "running",
    });

    work.resolve([]);
    await settle();
    expect(getResearchJob("user-1", job.id)).toMatchObject({
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

  it("hides other users' jobs", () => {
    const job = startResearchJob("user-1", () => Promise.resolve([]));
    expect(() => getResearchJob("user-2", job.id)).toThrow(HttpError);
    expect(() => getResearchJob("user-1", "missing")).toThrow(HttpError);
  });
});
