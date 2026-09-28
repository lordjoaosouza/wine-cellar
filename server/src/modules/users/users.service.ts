import type { User } from "../../generated/prisma/client.js";
import { decryptSecret, encryptSecret } from "../../lib/crypto.js";
import { HttpError } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import type {
  TuyaCredentialsInput,
  UpdateProfileInput,
} from "./users.schemas.js";

export interface ProfileDto {
  avatarUrl: string | null;
  createdAt: string;
  email: string;
  id: string;
  name: string | null;
  targetHumidityPct: number;
  targetTemperatureC: number;
}

export interface TuyaCredentialsDto {
  clientId: string | null;
  deviceId: string | null;
  hasClientSecret: boolean;
  region: User["tuyaRegion"] | null;
}

function toProfileDto(user: User): ProfileDto {
  return {
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    email: user.email,
    id: user.id,
    name: user.name,
    targetHumidityPct: user.targetHumidityPct,
    targetTemperatureC: user.targetTemperatureC,
  };
}

async function findUserOrThrow(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw HttpError.notFound("User not found");
  }
  return user;
}

export async function getProfile(userId: string): Promise<ProfileDto> {
  return toProfileDto(await findUserOrThrow(userId));
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<ProfileDto> {
  await findUserOrThrow(userId);

  const user = await prisma.user.update({
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      ...(input.targetTemperatureC !== undefined && {
        targetTemperatureC: input.targetTemperatureC,
      }),
      ...(input.targetHumidityPct !== undefined && {
        targetHumidityPct: input.targetHumidityPct,
      }),
    },
    where: { id: userId },
  });

  return toProfileDto(user);
}

export async function getTuyaCredentials(
  userId: string
): Promise<TuyaCredentialsDto> {
  const user = await findUserOrThrow(userId);
  return {
    clientId: user.tuyaClientId,
    deviceId: user.tuyaDeviceId,
    hasClientSecret: Boolean(user.tuyaClientSecretEncrypted),
    region: user.tuyaRegion,
  };
}

export async function getDecryptedTuyaCredentials(userId: string): Promise<{
  clientId: string;
  clientSecret: string;
  deviceId: string;
  region: NonNullable<User["tuyaRegion"]>;
} | null> {
  const user = await findUserOrThrow(userId);
  if (
    !(
      user.tuyaClientId &&
      user.tuyaClientSecretEncrypted &&
      user.tuyaDeviceId &&
      user.tuyaRegion
    )
  ) {
    return null;
  }
  return {
    clientId: user.tuyaClientId,
    clientSecret: decryptSecret(user.tuyaClientSecretEncrypted),
    deviceId: user.tuyaDeviceId,
    region: user.tuyaRegion,
  };
}

export async function saveTuyaCredentials(
  userId: string,
  input: TuyaCredentialsInput
): Promise<TuyaCredentialsDto> {
  await findUserOrThrow(userId);
  const user = await prisma.user.update({
    data: {
      tuyaClientId: input.clientId,
      tuyaClientSecretEncrypted: encryptSecret(input.clientSecret),
      tuyaDeviceId: input.deviceId,
      tuyaRegion: input.region,
    },
    where: { id: userId },
  });
  return getTuyaCredentials(user.id);
}

export async function clearTuyaCredentials(userId: string): Promise<void> {
  await findUserOrThrow(userId);
  await prisma.user.update({
    data: {
      tuyaClientId: null,
      tuyaClientSecretEncrypted: null,
      tuyaDeviceId: null,
      tuyaRegion: null,
    },
    where: { id: userId },
  });
}
