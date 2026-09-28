import type { ResearchProfileName } from "../../lib/app-settings.js";

export interface ResearchProfile {
  identifyResultsShown: number;
  infoPages: number;
  infoTextChars: number;
  maxStorePages: number;
  name: ResearchProfileName;
  photoChecks: number;
  storePagesFetched: number;
  storeTextChars: number;
  winesPerSearch: number;
}

export const RESEARCH_PROFILE_PRESETS: Record<
  ResearchProfileName,
  ResearchProfile
> = {
  fast: {
    identifyResultsShown: 8,
    infoPages: 1,
    infoTextChars: 1200,
    maxStorePages: 3,
    name: "fast",
    photoChecks: 1,
    storePagesFetched: 5,
    storeTextChars: 450,
    winesPerSearch: 2,
  },
  thorough: {
    identifyResultsShown: 12,
    infoPages: 2,
    infoTextChars: 1800,
    maxStorePages: 4,
    name: "thorough",
    photoChecks: 2,
    storePagesFetched: 8,
    storeTextChars: 700,
    winesPerSearch: 4,
  },
};

export function researchProfile(name: ResearchProfileName): ResearchProfile {
  return RESEARCH_PROFILE_PRESETS[name];
}
