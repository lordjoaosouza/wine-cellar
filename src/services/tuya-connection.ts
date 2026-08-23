import { apiClient } from "@/services/api-client";
import { createLocalRecord } from "@/services/local-store";
import {
  defaultTuyaConnectionStatus,
  type TuyaConnectionStatus,
  type TuyaCredentialsInput,
  type TuyaReading,
} from "@/types/tuya";

const statusCache = createLocalRecord<TuyaConnectionStatus>({
  defaultValue: defaultTuyaConnectionStatus,
  key: "@wine-cellar:tuya-status:v2",
});

function toApiRegion(region: TuyaCredentialsInput["region"]): string {
  return region.toUpperCase();
}

function toAppRegion(region: string | null): TuyaConnectionStatus["region"] {
  return region
    ? (region.toLowerCase() as TuyaConnectionStatus["region"])
    : null;
}

export async function getTuyaConnectionStatus(): Promise<TuyaConnectionStatus> {
  try {
    const response = await apiClient.get<{
      clientId: string | null;
      deviceId: string | null;
      region: string | null;
      hasClientSecret: boolean;
    }>("/users/me/tuya");
    return statusCache.save({
      ...response,
      region: toAppRegion(response.region),
    });
  } catch {
    return statusCache.get();
  }
}

export function isTuyaConnected(status: TuyaConnectionStatus): boolean {
  return Boolean(status.clientId && status.deviceId && status.hasClientSecret);
}

export function testTuyaCredentials(
  credentials: TuyaCredentialsInput
): Promise<TuyaReading> {
  return apiClient.post<TuyaReading>("/tuya/test", {
    ...credentials,
    region: toApiRegion(credentials.region),
  });
}

export async function saveTuyaCredentials(
  credentials: TuyaCredentialsInput
): Promise<TuyaConnectionStatus> {
  const response = await apiClient.put<{
    clientId: string | null;
    deviceId: string | null;
    region: string | null;
    hasClientSecret: boolean;
  }>("/users/me/tuya", {
    ...credentials,
    region: toApiRegion(credentials.region),
  });
  return statusCache.save({
    ...response,
    region: toAppRegion(response.region),
  });
}

export async function clearTuyaCredentials(): Promise<void> {
  await apiClient.delete("/users/me/tuya");
  await statusCache.save(defaultTuyaConnectionStatus);
}

export function readCellarSensor(): Promise<TuyaReading> {
  return apiClient.get<TuyaReading>("/tuya/reading");
}
