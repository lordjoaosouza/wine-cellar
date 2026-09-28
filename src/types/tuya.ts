export type TuyaRegion = "us" | "eu" | "cn" | "in";

export const TuyaRegionLabels: Record<TuyaRegion, string> = {
  cn: "China",
  eu: "Europe",
  in: "India",
  us: "Americas",
};

export interface TuyaConnectionStatus {
  clientId: string | null;
  deviceId: string | null;
  hasClientSecret: boolean;
  region: TuyaRegion | null;
}

export const defaultTuyaConnectionStatus: TuyaConnectionStatus = {
  clientId: null,
  deviceId: null,
  hasClientSecret: false,
  region: null,
};

export interface TuyaCredentialsInput {
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
