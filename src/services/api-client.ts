import { getApiBaseUrl } from "@/services/api-config";
import { emitAuthLogout } from "@/services/auth-events";
import {
  clearStoredTokens,
  getStoredTokens,
  storeTokens,
} from "@/services/token-storage";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = await getStoredTokens();
  if (!tokens) {
    return null;
  }

  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/refresh`, {
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    await clearStoredTokens();
    emitAuthLogout();
    return null;
  }

  const refreshed = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  await storeTokens(refreshed);
  return refreshed.accessToken;
}

interface RequestOptions {
  body?: unknown;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  skipAuth?: boolean;
}

async function parseErrorBody(
  response: Response
): Promise<{ error?: string; code?: string; details?: unknown }> {
  try {
    return (await response.json()) as {
      error?: string;
      code?: string;
      details?: unknown;
    };
  } catch {
    return {};
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  isRetry = false
): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  if (!options.skipAuth) {
    const tokens = await getStoredTokens();
    if (tokens) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
  }

  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    body,
    headers,
    method: options.method ?? "GET",
  });

  if (response.status === 401 && !options.skipAuth && !isRetry) {
    const newAccessToken = await getRefreshedAccessToken();
    if (newAccessToken) {
      return request<T>(path, options, true);
    }
  }

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);
    throw new ApiError(
      response.status,
      errorBody.error ?? `Request failed with status ${response.status}`,
      errorBody.code,
      errorBody.details
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function getRefreshedAccessToken(): Promise<string | null> {
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export const apiClient = {
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  get: <T>(path: string) => request<T>(path),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { body, method: "PATCH" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { body, method: "POST" }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { body, method: "PUT" }),
};
