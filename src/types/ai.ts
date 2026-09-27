export type ResearchProfile = "fast" | "thorough";

export type ModelSpeed = "fast" | "balanced" | "accurate";

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export interface PullJob {
  completedBytes: number;
  error: { code: string | null; message: string } | null;
  id: string;
  model: string;
  progress: number;
  stage: string;
  status: JobStatus;
  totalBytes: number;
}

export interface AiModel {
  active: boolean;
  curated: boolean;
  description: string | null;
  downloadBytes: number | null;
  installed: boolean;
  installedBytes: number | null;
  label: string;
  memoryGb: number | null;
  name: string;
  pull: PullJob | null;
  speed: ModelSpeed | null;
  vision: boolean | null;
}

export interface AiStatus {
  activeModel: string;
  activeModelInstalled: boolean;
  models: AiModel[];
  ollama: { reachable: boolean; url: string; version: string | null };
  researchProfile: ResearchProfile;
}

export const ResearchProfileLabels: Record<
  ResearchProfile,
  { hint: string; title: string }
> = {
  fast: {
    hint: "Fewer pages and one photo check per wine. About half the wait.",
    title: "Fast",
  },
  thorough: {
    hint: "More store pages, producer sheets and two photo checks per wine.",
    title: "Thorough",
  },
};

export const ModelSpeedLabels: Record<ModelSpeed, string> = {
  accurate: "Most accurate",
  balanced: "Balanced",
  fast: "Fastest",
};
