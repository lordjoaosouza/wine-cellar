import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const del = vi.fn();

vi.mock("@/services/api-client", () => ({
  ApiError: class ApiError extends Error {
    code?: string;
  },
  apiClient: { delete: del, get },
}));

const { followJob, isUnavailableCode, JobCancelledError, JobFailedError } =
  await import("@/services/jobs");

const path = (id: string) => `/jobs/${id}`;

describe("followJob", () => {
  beforeEach(() => {
    get.mockReset();
    del.mockReset();
    del.mockResolvedValue(undefined);
  });

  it("polls until the job is done, reporting each stage and a final 100%", async () => {
    get
      .mockResolvedValueOnce({
        error: null,
        id: "j1",
        progress: 0.5,
        stage: "Halfway",
        status: "running",
      })
      .mockResolvedValueOnce({
        error: null,
        id: "j1",
        progress: 1,
        stage: "Done",
        status: "done",
      });
    const seen: { progress: number; stage: string }[] = [];

    const job = await followJob(
      { error: null, id: "j1", progress: 0, stage: "Queued", status: "queued" },
      path,
      { onProgress: (p) => seen.push(p), pollIntervalMs: 1 }
    );

    expect(job.status).toBe("done");
    expect(seen).toEqual([
      { progress: 0, stage: "Queued" },
      { progress: 0.5, stage: "Halfway" },
      { progress: 1, stage: "Done" },
    ]);
    expect(get).toHaveBeenCalledWith("/jobs/j1");
  });

  it("throws a JobFailedError carrying the server's code", async () => {
    await expect(
      followJob(
        {
          error: { code: "llm_unavailable", message: "Ollama down" },
          id: "j2",
          progress: 0,
          stage: "x",
          status: "failed",
        },
        path
      )
    ).rejects.toMatchObject({
      code: "llm_unavailable",
      name: "JobFailedError",
    });
  });

  it("cancels the job on the server when the signal aborts", async () => {
    const controller = new AbortController();
    get.mockImplementation(() => {
      controller.abort();
      return Promise.resolve({
        error: null,
        id: "j3",
        progress: 0.2,
        stage: "Working",
        status: "running",
      });
    });

    await expect(
      followJob(
        {
          error: null,
          id: "j3",
          progress: 0,
          stage: "Queued",
          status: "queued",
        },
        path,
        { pollIntervalMs: 1, signal: controller.signal }
      )
    ).rejects.toBeInstanceOf(JobCancelledError);
    expect(del).toHaveBeenCalledWith("/jobs/j3");
  });

  it("gives up after the timeout", async () => {
    get.mockResolvedValue({
      error: null,
      id: "j4",
      progress: 0,
      stage: "Slow",
      status: "running",
    });
    await expect(
      followJob(
        {
          error: null,
          id: "j4",
          progress: 0,
          stage: "Queued",
          status: "queued",
        },
        path,
        { pollIntervalMs: 1, timeoutMs: 0 }
      )
    ).rejects.toThrow("taking too long");
  });
});

describe("isUnavailableCode", () => {
  it("recognizes the two codes that mean the model cannot answer", () => {
    expect(isUnavailableCode(new JobFailedError("x", "llm_unavailable"))).toBe(
      true
    );
    expect(
      isUnavailableCode(new JobFailedError("x", "llm_model_missing"))
    ).toBe(true);
    expect(isUnavailableCode(new JobFailedError("x", null))).toBe(false);
    expect(isUnavailableCode(new Error("x"))).toBe(false);
  });
});
