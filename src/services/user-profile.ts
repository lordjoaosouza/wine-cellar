import { apiClient } from "@/services/api-client";
import { createLocalRecord } from "@/services/local-store";
import { defaultUserProfile, type UserProfile } from "@/types/profile";

const WHITESPACE_PATTERN = /\s+/;

interface ProfileResponse {
  avatarUrl: string | null;
  email: string;
  id: string;
  name: string | null;
  targetHumidityPct: number;
  targetTemperatureC: number;
}

const avatarStore = createLocalRecord<string | null>({
  defaultValue: null,
  key: "@wine-cellar:avatar-uri:v1",
});

const profileCache = createLocalRecord<UserProfile>({
  defaultValue: defaultUserProfile,
  key: "@wine-cellar:profile-cache:v1",
});

async function toProfile(response: ProfileResponse): Promise<UserProfile> {
  return {
    avatarUri: await avatarStore.get(),
    email: response.email,
    id: response.id,
    name: response.name ?? "",
    targetHumidityPct: response.targetHumidityPct,
    targetTemperatureC: response.targetTemperatureC,
  };
}

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const response = await apiClient.get<ProfileResponse>("/users/me");
    return profileCache.save(await toProfile(response));
  } catch {
    return profileCache.get();
  }
}

export async function updateProfile(
  patch: Partial<
    Pick<UserProfile, "name" | "targetTemperatureC" | "targetHumidityPct">
  > & {
    avatarUri?: string | null;
  }
): Promise<UserProfile> {
  if (patch.avatarUri !== undefined) {
    await avatarStore.save(patch.avatarUri);
  }

  const hasServerPatch =
    patch.name !== undefined ||
    patch.targetTemperatureC !== undefined ||
    patch.targetHumidityPct !== undefined;

  if (!hasServerPatch) {
    const current = await profileCache.get();
    return profileCache.save({
      ...current,
      avatarUri: patch.avatarUri ?? current.avatarUri,
    });
  }

  const response = await apiClient.patch<ProfileResponse>("/users/me", {
    name: patch.name,
    targetHumidityPct: patch.targetHumidityPct,
    targetTemperatureC: patch.targetTemperatureC,
  });
  return profileCache.save(await toProfile(response));
}

export function subscribeUserProfile(listener: (profile: UserProfile) => void) {
  return profileCache.subscribe(listener);
}

export function profileInitials(profile: UserProfile): string {
  const source = profile.name.trim();
  if (!source) {
    return profile.email.slice(0, 2).toUpperCase() || "JS";
  }
  const parts = source.split(WHITESPACE_PATTERN).filter(Boolean);
  if (parts.length === 1) {
    return parts[0]?.slice(0, 2).toUpperCase() ?? "JS";
  }
  return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}
