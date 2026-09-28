import { apiClient } from "@/services/api-client";
import { emitAuthLogout } from "@/services/auth-events";
import {
  clearStoredTokens,
  getStoredTokens,
  storeTokens,
  type TokenPair,
} from "@/services/token-storage";

export async function requestLoginCode(email: string): Promise<void> {
  await apiClient.post<{ ok: true }>("/auth/request-code", { email });
}

export async function verifyLoginCode(
  email: string,
  code: string
): Promise<void> {
  const tokens = await apiClient.post<TokenPair>("/auth/verify-code", {
    code,
    email,
  });
  await storeTokens(tokens);
}

export async function logout(): Promise<void> {
  const tokens = await getStoredTokens();
  await clearStoredTokens();
  emitAuthLogout();
  if (tokens) {
    await apiClient
      .post("/auth/logout", { refreshToken: tokens.refreshToken })
      .catch(() => undefined);
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getStoredTokens()) !== null;
}
