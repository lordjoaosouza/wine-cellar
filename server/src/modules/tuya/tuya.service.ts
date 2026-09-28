import { HttpError } from "../../lib/http-error.js";
import { getDecryptedTuyaCredentials } from "../users/users.service.js";
import {
  readCellarSensor,
  type TuyaCredentials,
  type TuyaReading,
} from "./tuya-client.js";

export async function readUserCellarSensor(
  userId: string
): Promise<TuyaReading> {
  const credentials = await getDecryptedTuyaCredentials(userId);
  if (!credentials) {
    throw HttpError.badRequest(
      "Tuya is not connected yet — add your Client ID, Secret and Device ID."
    );
  }
  return readCellarSensor(credentials);
}

export function testTuyaCredentials(
  credentials: TuyaCredentials
): Promise<TuyaReading> {
  return readCellarSensor(credentials);
}
