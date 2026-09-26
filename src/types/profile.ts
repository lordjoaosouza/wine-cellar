export interface UserProfile {
  avatarUri: string | null;
  email: string;
  id: string;
  name: string;
  targetHumidityPct: number;
  targetTemperatureC: number;
}

export const defaultUserProfile: UserProfile = {
  avatarUri: null,
  email: "",
  id: "",
  name: "",
  targetHumidityPct: 70,
  targetTemperatureC: 13,
};
