import { describe, expect, it, vi } from "vitest";
import {
  OllamaClient,
  type OllamaPullProgress,
  OllamaRequestError,
  OllamaUnavailableError,
} from "../../src/lib/ollama-client.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function streamResponse(lines: object[]): Response {
  const encoder = new TextEncoder();
  const chunks = lines.map((line) => `${JSON.stringify(line)}\n`);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const joined = chunks.join("");
      const middle = Math.floor(joined.length / 2);
      controller.enqueue(encoder.encode(joined.slice(0, middle)));
      controller.enqueue(encoder.encode(joined.slice(middle)));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe("OllamaClient", () => {
  it("lists installed models with their details", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        models: [
          {
            details: {
              family: "qwen3",
              parameter_size: "9B",
              quantization_level: "Q4_K_M",
            },
            modified_at: "2026-09-01T00:00:00Z",
            name: "qwen3.5:9b",
            size: 6_600_000_000,
          },
          { size: 1 },
        ],
      })
    );
    const client = new OllamaClient("http://ollama:11434", fetchMock);

    expect(await client.listModels()).toEqual([
      {
        family: "qwen3",
        modifiedAt: "2026-09-01T00:00:00Z",
        name: "qwen3.5:9b",
        parameterSize: "9B",
        quantization: "Q4_K_M",
        sizeBytes: 6_600_000_000,
      },
    ]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://ollama:11434/api/tags"
    );
  });

  it("aggregates pull progress across layers and splits chunks on newlines", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        streamResponse([
          { status: "pulling manifest" },
          { completed: 100, digest: "a", status: "pulling a", total: 1000 },
          { completed: 0, digest: "b", status: "pulling b", total: 3000 },
          { completed: 1000, digest: "a", status: "pulling a", total: 1000 },
          { completed: 3000, digest: "b", status: "pulling b", total: 3000 },
          { status: "success" },
        ])
      );
    const client = new OllamaClient("http://ollama:11434", fetchMock);
    const seen: OllamaPullProgress[] = [];

    await client.pull("gemma3:4b", (progress) => seen.push(progress));

    expect(seen[0]).toEqual({
      completedBytes: 0,
      stage: "pulling manifest",
      totalBytes: 0,
    });
    expect(seen[2]).toEqual({
      completedBytes: 100,
      stage: "pulling b",
      totalBytes: 4000,
    });
    expect(seen.at(-1)).toEqual({
      completedBytes: 4000,
      stage: "success",
      totalBytes: 4000,
    });
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({
      model: "gemma3:4b",
      stream: true,
    });
  });

  it("surfaces an error line from the pull stream", async () => {
    const client = new OllamaClient(
      "http://ollama:11434",
      vi
        .fn()
        .mockResolvedValue(
          streamResponse([
            { error: "pull model manifest: file does not exist" },
          ])
        )
    );
    await expect(client.pull("nope:1b", () => undefined)).rejects.toThrow(
      "pull model manifest: file does not exist"
    );
  });

  it("turns network failures into OllamaUnavailableError and HTTP errors into OllamaRequestError", async () => {
    const offline = new OllamaClient(
      "http://ollama:11434",
      vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    );
    await expect(offline.version()).rejects.toBeInstanceOf(
      OllamaUnavailableError
    );

    const missing = new OllamaClient(
      "http://ollama:11434",
      vi.fn().mockResolvedValue(jsonResponse({ error: "model not found" }, 404))
    );
    const error = await missing.capabilities("ghost:1b").catch((e) => e);
    expect(error).toBeInstanceOf(OllamaRequestError);
    expect(error.notFound).toBe(true);
    expect(error.message).toBe("model not found");
  });

  it("rethrows the caller's abort instead of reporting Ollama as down", async () => {
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    const client = new OllamaClient(
      "http://ollama:11434",
      vi.fn().mockRejectedValue(new Error("cancelled"))
    );
    await expect(client.version(controller.signal)).rejects.toThrow(
      "cancelled"
    );
  });

  it("sends a structured chat request and returns the reply text", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: { content: '{"ok":true}' } }));
    const client = new OllamaClient("http://ollama:11434", fetchMock);

    const reply = await client.chat({
      format: { type: "object" },
      images: ["abc"],
      model: "qwen3.5:9b",
      numCtx: 4096,
      system: "sys",
      user: "usr",
    });

    expect(reply).toBe('{"ok":true}');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      keep_alive: "30m",
      messages: [
        { content: "sys", role: "system" },
        { content: "usr", images: ["abc"], role: "user" },
      ],
      model: "qwen3.5:9b",
      options: { num_ctx: 4096, temperature: 0 },
      stream: false,
      think: false,
    });
  });
});
