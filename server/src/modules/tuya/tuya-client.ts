import { createHash, createHmac } from "node:crypto";

export type TuyaRegion = "US" | "EU" | "CN" | "IN";

export interface TuyaCredentials {
  clientId: string;
  clientSecret: string;
  deviceId: string;
  region: TuyaRegion;
}

export interface TuyaReading {
  humidityPct: number | null;
  temperatureC: number | null;
  updatedAt: string;
}

const REGION_HOSTS: Record<TuyaRegion, string> = {
  CN: "https://openapi.tuyacn.com",
  EU: "https://openapi.tuyaeu.com",
  IN: "https://openapi.tuyain.com",
  US: "https://openapi.tuyaus.com",
};

const EMPTY_BODY_SHA256 = createHash("sha256").update("").digest("hex");

function randomNonce(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function signRequest(base: string, secret: string): string {
  return createHmac("sha256", secret).update(base).digest("hex").toUpperCase();
}

async function tuyaRequest<T>(
  credentials: TuyaCredentials,
  path: string,
  accessToken?: string
): Promise<T> {
  const host = REGION_HOSTS[credentials.region];
  const t = Date.now().toString();
  const nonce = randomNonce();
  const stringToSign = `GET\n${EMPTY_BODY_SHA256}\n\n${path}`;
  const base = accessToken
    ? `${credentials.clientId}${accessToken}${t}${nonce}${stringToSign}`
    : `${credentials.clientId}${t}${nonce}${stringToSign}`;

  const headers: Record<string, string> = {
    client_id: credentials.clientId,
    nonce,
    sign: signRequest(base, credentials.clientSecret),
    sign_method: "HMAC-SHA256",
    t,
  };
  if (accessToken) {
    headers.access_token = accessToken;
  }

  const response = await fetch(`${host}${path}`, { headers, method: "GET" });
  const data = (await response.json()) as {
    success: boolean;
    msg?: string;
    result?: T;
  };
  if (!data.success) {
    throw new Error(data.msg ?? "Tuya request failed.");
  }
  return data.result as T;
}

async function getAccessToken(credentials: TuyaCredentials): Promise<string> {
  const result = await tuyaRequest<{ access_token: string }>(
    credentials,
    "/v1.0/token?grant_type=1"
  );
  return result.access_token;
}

interface TuyaStatusPoint {
  code: string;
  value: unknown;
}
interface TuyaSpecStatus {
  code: string;
  type: string;
  values: string;
}

function scaleFor(spec: TuyaSpecStatus[], code: string): number {
  const entry = spec.find((item) => item.code === code);
  if (!entry) {
    return 0;
  }
  try {
    const parsed = JSON.parse(entry.values) as { scale?: number };
    return typeof parsed.scale === "number" ? parsed.scale : 0;
  } catch {
    return 0;
  }
}

export async function readCellarSensor(
  credentials: TuyaCredentials
): Promise<TuyaReading> {
  const accessToken = await getAccessToken(credentials);
  const [status, spec] = await Promise.all([
    tuyaRequest<TuyaStatusPoint[]>(
      credentials,
      `/v1.0/iot-03/devices/${credentials.deviceId}/status`,
      accessToken
    ),
    tuyaRequest<{ status: TuyaSpecStatus[] }>(
      credentials,
      `/v1.0/iot-03/devices/${credentials.deviceId}/specification`,
      accessToken
    ).catch(() => ({ status: [] as TuyaSpecStatus[] })),
  ]);

  const readScaled = (codes: string[]): number | null => {
    for (const code of codes) {
      const point = status.find((item) => item.code === code);
      if (point && typeof point.value === "number") {
        return point.value / 10 ** scaleFor(spec.status, code);
      }
    }
    return null;
  };

  return {
    humidityPct: readScaled([
      "va_humidity",
      "humidity_value",
      "humidity_current",
      "humidity",
    ]),
    temperatureC: readScaled(["va_temperature", "temp_current", "temperature"]),
    updatedAt: new Date().toISOString(),
  };
}
