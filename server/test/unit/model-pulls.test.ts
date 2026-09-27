import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OllamaPullProgress } from "../../src/lib/ollama-client.js";

const pull =
  vi.fn<
    (
      model: string,
      onProgress: (progress: OllamaPullProgress) => void,
      signal?: AbortSignal
    ) => Promise<void>
  >();

vi.mock("../../src/lib/ollama.js", () => ({
  ollama: { pull },
  toLlmHttpError: (error: unknown) => error,
}));

const { activePullFor, cancelModelPull, getModelPull, startModelPull } =
  await import("../../src/modules/ai/model-pulls.js");

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("model pulls", () => {
  beforeEach(() => {
    pull.mockReset();
  });

  it("reports download progress in bytes and a percentage, then activates", async () => {
    let emit: ((progress: OllamaPullProgress) => void) | null = null;
    let finish!: () => void;
    pull.mockImplementation((_model, onProgress) => {
      emit = onProgress;
      return new Promise<void>((resolve) => {
        finish = resolve;
      });
    });
    const onDone = vi.fn().mockResolvedValue(undefined);

    const job = startModelPull("gemma3:4b", onDone);
    await settle();
    emit?.({
      completedBytes: 1_073_741_824,
      stage: "pulling",
      totalBytes: 4_294_967_296,
    });

    expect(getModelPull(job.id)).toMatchObject({
      completedBytes: 1_073_741_824,
      model: "gemma3:4b",
      progress: 0.25,
      stage: "Downloading 1.0 GB of 4.0 GB",
      status: "running",
      totalBytes: 4_294_967_296,
    });
    expect(activePullFor("gemma3:4b")?.id).toBe(job.id);

    finish();
    await settle();
    await settle();
    expect(onDone).toHaveBeenCalledWith("gemma3:4b");
    expect(getModelPull(job.id)).toMatchObject({ progress: 1, status: "done" });
    expect(activePullFor("gemma3:4b")).toBeNull();
  });

  it("reuses the running download for the same model", async () => {
    pull.mockImplementation(() => new Promise(() => undefined));
    const first = startModelPull("llava:7b", () => Promise.resolve());
    await settle();
    const second = startModelPull("llava:7b", () => Promise.resolve());
    expect(second.id).toBe(first.id);
    cancelModelPull(first.id);
  });

  it("can be cancelled through the abort signal", async () => {
    pull.mockImplementation(
      (_model, _onProgress, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(signal.reason));
        })
    );
    const job = startModelPull("gemma3:12b", () => Promise.resolve());
    await settle();
    cancelModelPull(job.id);
    await settle();
    expect(getModelPull(job.id).status).toBe("cancelled");
  });
});
