import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetSettingsCache } from "../../src/lib/app-settings.js";
import { ollama } from "../../src/lib/ollama.js";
import {
  type OllamaModelInfo,
  OllamaRequestError,
  OllamaUnavailableError,
} from "../../src/lib/ollama-client.js";
import { resetAiCaches } from "../../src/modules/ai/ai.service.js";
import { app, bearer, loginAs, resetDb } from "./helpers.js";

function installed(name: string, sizeBytes = 1000): OllamaModelInfo {
  return {
    family: "qwen3",
    modifiedAt: null,
    name,
    parameterSize: "9B",
    quantization: "Q4_K_M",
    sizeBytes,
  };
}

async function waitForPull(token: { Authorization: string }, id: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const res = await request(app)
      .get(`/ai/pulls/${id}`)
      .set(token)
      .expect(200);
    if (res.body.status !== "queued" && res.body.status !== "running") {
      return res.body;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("pull did not finish");
}

describe("AI settings", () => {
  beforeEach(async () => {
    await resetDb();
    resetSettingsCache();
    resetAiCaches();
    vi.spyOn(ollama, "version").mockResolvedValue("0.12.0");
    vi.spyOn(ollama, "load").mockResolvedValue(undefined);
    vi.spyOn(ollama, "capabilities").mockResolvedValue([
      "completion",
      "vision",
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires authentication", async () => {
    await request(app).get("/ai/status").expect(401);
  });

  it("merges the curated catalog with what Ollama has installed", async () => {
    const session = await loginAs("ai@example.com");
    vi.spyOn(ollama, "listModels").mockResolvedValue([
      installed("qwen3.5:9b", 6_600_000_000),
      installed("mistral:7b"),
    ]);

    const res = await request(app)
      .get("/ai/status")
      .set(bearer(session))
      .expect(200);

    expect(res.body).toMatchObject({
      activeModel: "qwen3.5:9b",
      activeModelInstalled: true,
      ollama: { reachable: true, version: "0.12.0" },
      researchProfile: "thorough",
    });
    const byName = new Map(
      (res.body.models as { name: string }[]).map((model) => [
        model.name,
        model,
      ])
    );
    expect(byName.get("qwen3.5:9b")).toMatchObject({
      active: true,
      curated: true,
      installed: true,
      installedBytes: 6_600_000_000,
      label: "Qwen 3.5 9B",
      vision: true,
    });
    expect(byName.get("gemma3:4b")).toMatchObject({
      active: false,
      curated: true,
      installed: false,
      vision: null,
    });
    expect(byName.get("mistral:7b")).toMatchObject({
      curated: false,
      installed: true,
      label: "mistral:7b",
    });
  });

  it("reports Ollama as unreachable without failing the request", async () => {
    const session = await loginAs("down@example.com");
    vi.spyOn(ollama, "listModels").mockRejectedValue(
      new OllamaUnavailableError()
    );

    const res = await request(app)
      .get("/ai/status")
      .set(bearer(session))
      .expect(200);
    expect(res.body.ollama).toMatchObject({ reachable: false, version: null });
    expect(res.body.activeModelInstalled).toBe(false);
  });

  it("activates an installed model at once and persists the choice", async () => {
    const session = await loginAs("select@example.com");
    vi.spyOn(ollama, "listModels").mockResolvedValue([
      installed("qwen3.5:9b"),
      installed("gemma3:4b"),
    ]);

    const res = await request(app)
      .post("/ai/models/select")
      .set(bearer(session))
      .send({ model: "gemma3:4b" })
      .expect(200);
    expect(res.body).toEqual({ activated: true, pull: null });

    resetSettingsCache();
    const status = await request(app).get("/ai/status").set(bearer(session));
    expect(status.body.activeModel).toBe("gemma3:4b");
    expect(ollama.load).toHaveBeenCalledWith("gemma3:4b");
  });

  it("downloads a missing model with progress and activates it when done", async () => {
    const session = await loginAs("pull@example.com");
    vi.spyOn(ollama, "listModels").mockResolvedValue([installed("qwen3.5:9b")]);
    vi.spyOn(ollama, "pull").mockImplementation((_model, onProgress) => {
      onProgress({ completedBytes: 50, stage: "pulling", totalBytes: 100 });
      onProgress({ completedBytes: 100, stage: "success", totalBytes: 100 });
      return Promise.resolve();
    });

    const res = await request(app)
      .post("/ai/models/select")
      .set(bearer(session))
      .send({ model: "qwen2.5vl:3b" })
      .expect(200);
    expect(res.body.activated).toBe(false);
    expect(res.body.pull).toMatchObject({ model: "qwen2.5vl:3b" });

    const done = await waitForPull(bearer(session), res.body.pull.id);
    expect(done).toMatchObject({
      completedBytes: 100,
      progress: 1,
      status: "done",
      totalBytes: 100,
    });
    resetSettingsCache();
    const status = await request(app).get("/ai/status").set(bearer(session));
    expect(status.body.activeModel).toBe("qwen2.5vl:3b");
  });

  it("refuses a model that cannot read images", async () => {
    const session = await loginAs("text-only@example.com");
    vi.spyOn(ollama, "listModels").mockResolvedValue([
      installed("qwen3.5:9b"),
      installed("mistral:7b"),
    ]);
    vi.spyOn(ollama, "capabilities").mockResolvedValue(["completion"]);

    await request(app)
      .post("/ai/models/select")
      .set(bearer(session))
      .send({ model: "mistral:7b" })
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe("model_without_vision");
      });
  });

  it("validates model names", async () => {
    const session = await loginAs("names@example.com");
    await request(app)
      .post("/ai/models/select")
      .set(bearer(session))
      .send({ model: "../etc/passwd" })
      .expect(400);
  });

  it("removes models except the active one", async () => {
    const session = await loginAs("remove@example.com");
    const remove = vi.spyOn(ollama, "remove").mockResolvedValue(undefined);

    await request(app)
      .post("/ai/models/remove")
      .set(bearer(session))
      .send({ model: "qwen3.5:9b" })
      .expect(409);
    await request(app)
      .post("/ai/models/remove")
      .set(bearer(session))
      .send({ model: "gemma3:4b" })
      .expect(200, { ok: true });
    expect(remove).toHaveBeenCalledWith("gemma3:4b");

    remove.mockRejectedValue(new OllamaRequestError(404, "model not found"));
    await request(app)
      .post("/ai/models/remove")
      .set(bearer(session))
      .send({ model: "ghost:1b" })
      .expect(503)
      .expect((res) => {
        expect(res.body.code).toBe("llm_model_missing");
      });
  });

  it("switches the research depth", async () => {
    const session = await loginAs("depth@example.com");
    vi.spyOn(ollama, "listModels").mockResolvedValue([]);

    const res = await request(app)
      .patch("/ai/settings")
      .set(bearer(session))
      .send({ researchProfile: "fast" })
      .expect(200);
    expect(res.body.researchProfile).toBe("fast");

    await request(app)
      .patch("/ai/settings")
      .set(bearer(session))
      .send({ researchProfile: "sloppy" })
      .expect(400);
  });

  it("reports failed downloads with their reason", async () => {
    const session = await loginAs("failed-pull@example.com");
    vi.spyOn(ollama, "pull").mockRejectedValue(
      new OllamaRequestError(400, "pull model manifest: file does not exist")
    );

    const res = await request(app)
      .post("/ai/models/pull")
      .set(bearer(session))
      .send({ model: "nope:1b" })
      .expect(202);
    const job = await waitForPull(bearer(session), res.body.id);
    expect(job).toMatchObject({
      error: { code: "llm_unavailable" },
      status: "failed",
    });
  });
});
