export interface UserProfile {
  avatarUri: string | null;
  email: string;
  hasOpenaiApiKey: boolean;
  id: string;
  name: string;
  targetHumidityPct: number;
  targetTemperatureC: number;
}

export const defaultUserProfile: UserProfile = {
  avatarUri: null,
  email: "",
  hasOpenaiApiKey: false,
  id: "",
  name: "",
  targetHumidityPct: 70,
  targetTemperatureC: 13,
};
