import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL_KEY = "wine-cellar:api-url";
const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const TRAILING_SLASHES_PATTERN = /\/+$/;

let cachedUrl: string | null = null;

function normalize(url: string): string {
  return url.trim().replace(TRAILING_SLASHES_PATTERN, "");
}

export async function getApiBaseUrl(): Promise<string> {
  if (cachedUrl) {
    return cachedUrl;
  }
  const stored = await AsyncStorage.getItem(API_URL_KEY);
  cachedUrl = normalize(stored || DEFAULT_API_URL);
  return cachedUrl;
}

export async function setApiBaseUrl(url: string): Promise<string> {
  const normalized = normalize(url);
  cachedUrl = normalized;
  await AsyncStorage.setItem(API_URL_KEY, normalized);
  return normalized;
}

export function getDefaultApiBaseUrl(): string {
  return DEFAULT_API_URL;
}
