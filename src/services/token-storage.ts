import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "wine-cellar.access-token";
const REFRESH_TOKEN_KEY = "wine-cellar.refresh-token";

const isNative = Platform.OS === "ios" || Platform.OS === "android";

async function getItem(key: string): Promise<string | null> {
  return isNative ? await getItemAsync(key) : await AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isNative) {
    await setItemAsync(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

async function removeItem(key: string): Promise<void> {
  if (isNative) {
    await deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function getStoredTokens(): Promise<TokenPair | null> {
  const [accessToken, refreshToken] = await Promise.all([
    getItem(ACCESS_TOKEN_KEY),
    getItem(REFRESH_TOKEN_KEY),
  ]);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export async function storeTokens(tokens: TokenPair): Promise<void> {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearStoredTokens(): Promise<void> {
  await Promise.all([
    removeItem(ACCESS_TOKEN_KEY),
    removeItem(REFRESH_TOKEN_KEY),
  ]);
}
