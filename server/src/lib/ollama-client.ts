import { logger } from "./logger.js";

export interface OllamaModelInfo {
  family: string | null;
  modifiedAt: string | null;
  name: string;
  parameterSize: string | null;
  quantization: string | null;
  sizeBytes: number;
}

export interface OllamaPullProgress {
  completedBytes: number;
  stage: string;
  totalBytes: number;
}

export interface OllamaChatRequest {
  format?: object | undefined;
  images?: string[] | undefined;
  keepAlive?: string | undefined;
  model: string;
  numCtx: number;
  system: string;
  user: string;
}

export class OllamaUnavailableError extends Error {
  constructor(message = "Ollama is not reachable", options?: ErrorOptions) {
    super(message, options);
    this.name = "OllamaUnavailableError";
  }
}

export class OllamaRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "OllamaRequestError";
    this.status = status;
  }

  get notFound(): boolean {
    return this.status === 404;
  }
}

interface TagsResponse {
  models?: {
    details?: {
      family?: string;
      parameter_size?: string;
      quantization_level?: string;
    };
    modified_at?: string;
    name?: string;
    size?: number;
  }[];
}

interface ShowResponse {
  capabilities?: string[];
}

interface PullLine {
  completed?: number;
  digest?: string;
  error?: string;
  status?: string;
  total?: number;
}

interface ChatResponse {
  message?: { content?: string };
}

const DEFAULT_TIMEOUT_MS = 10_000;
const CHAT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_KEEP_ALIVE = "30m";

function combineSignals(signals: (AbortSignal | undefined)[]): AbortSignal {
  return AbortSignal.any(
    signals.filter((signal): signal is AbortSignal => Boolean(signal))
  );
}

export class OllamaClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(baseUrl: string, fetchFn: typeof fetch = fetch) {
    this.baseUrl = baseUrl;
    this.fetchFn = fetchFn;
  }

  async version(signal?: AbortSignal): Promise<string> {
    const body = await this.json<{ version?: string }>(
      "GET",
      "/api/version",
      undefined,
      signal
    );
    return body.version ?? "unknown";
  }

  async listModels(signal?: AbortSignal): Promise<OllamaModelInfo[]> {
    const body = await this.json<TagsResponse>(
      "GET",
      "/api/tags",
      undefined,
      signal
    );
    return (body.models ?? []).flatMap((model) =>
      model.name
        ? [
            {
              family: model.details?.family ?? null,
              modifiedAt: model.modified_at ?? null,
              name: model.name,
              parameterSize: model.details?.parameter_size ?? null,
              quantization: model.details?.quantization_level ?? null,
              sizeBytes: model.size ?? 0,
            },
          ]
        : []
    );
  }

  async capabilities(model: string, signal?: AbortSignal): Promise<string[]> {
    const body = await this.json<ShowResponse>(
      "POST",
      "/api/show",
      { model },
      signal
    );
    return body.capabilities ?? [];
  }

  async remove(model: string, signal?: AbortSignal): Promise<void> {
    await this.request("DELETE", "/api/delete", { model }, signal);
  }

  async load(model: string, signal?: AbortSignal): Promise<void> {
    await this.request(
      "POST",
      "/api/generate",
      { keep_alive: DEFAULT_KEEP_ALIVE, model },
      signal,
      CHAT_TIMEOUT_MS
    );
  }

  async pull(
    model: string,
    onProgress: (progress: OllamaPullProgress) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const response = await this.request(
      "POST",
      "/api/pull",
      { model, stream: true },
      signal,
      0
    );
    const layers = new Map<string, { completed: number; total: number }>();
    for await (const line of ndjsonLines(response)) {
      if (line.error) {
        throw new OllamaRequestError(400, line.error);
      }
      if (line.digest && typeof line.total === "number") {
        layers.set(line.digest, {
          completed: line.completed ?? 0,
          total: line.total,
        });
      }
      let completedBytes = 0;
      let totalBytes = 0;
      for (const layer of layers.values()) {
        completedBytes += layer.completed;
        totalBytes += layer.total;
      }
      onProgress({
        completedBytes,
        stage: line.status ?? "pulling",
        totalBytes,
      });
    }
  }

  async chat(
    request: OllamaChatRequest,
    signal?: AbortSignal
  ): Promise<string> {
    const body = await this.json<ChatResponse>(
      "POST",
      "/api/chat",
      {
        format: request.format,
        keep_alive: request.keepAlive ?? DEFAULT_KEEP_ALIVE,
        messages: [
          { content: request.system, role: "system" },
          {
            content: request.user,
            role: "user",
            ...(request.images ? { images: request.images } : {}),
          },
        ],
        model: request.model,
        options: { num_ctx: request.numCtx, temperature: 0 },
        stream: false,
        think: false,
      },
      signal,
      CHAT_TIMEOUT_MS
    );
    return body.message?.content ?? "";
  }

  private async json<T>(
    method: string,
    path: string,
    body: object | undefined,
    signal: AbortSignal | undefined,
    timeoutMs = DEFAULT_TIMEOUT_MS
  ): Promise<T> {
    const response = await this.request(method, path, body, signal, timeoutMs);
    return (await response.json()) as T;
  }

  private async request(
    method: string,
    path: string,
    body: object | undefined,
    signal: AbortSignal | undefined,
    timeoutMs = DEFAULT_TIMEOUT_MS
  ): Promise<Response> {
    let response: Response;
    try {
      const init: RequestInit = {
        method,
        signal: combineSignals([
          signal,
          timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined,
        ]),
      };
      if (body) {
        init.body = JSON.stringify(body);
        init.headers = { "content-type": "application/json" };
      }
      response = await this.fetchFn(new URL(path, this.baseUrl), init);
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      logger.warn({ err: error, path }, "ollama request failed");
      throw new OllamaUnavailableError("Ollama is not reachable", {
        cause: error,
      });
    }
    if (!response.ok) {
      const text = await response.text();
      throw new OllamaRequestError(response.status, extractError(text));
    }
    return response;
  }
}

function extractError(text: string): string {
  try {
    const parsed = JSON.parse(text) as { error?: string };
    return parsed.error ?? text;
  } catch {
    return text;
  }
}

async function* ndjsonLines(response: Response): AsyncGenerator<PullLine> {
  if (!response.body) {
    return;
  }
  const decoder = new TextDecoder();
  let buffered = "";
  for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
    buffered += decoder.decode(chunk, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) {
        yield JSON.parse(line) as PullLine;
      }
    }
  }
  if (buffered.trim()) {
    yield JSON.parse(buffered) as PullLine;
  }
}
