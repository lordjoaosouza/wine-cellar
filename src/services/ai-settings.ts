import { apiClient } from "@/services/api-client";
import { type FollowJobOptions, followJob } from "@/services/jobs";
import type { AiStatus, PullJob, ResearchProfile } from "@/types/ai";

function pullPath(id: string): string {
  return `/ai/pulls/${id}`;
}

export function getAiStatus(): Promise<AiStatus> {
  return apiClient.get<AiStatus>("/ai/status");
}

export function selectModel(
  model: string
): Promise<{ activated: boolean; pull: PullJob | null }> {
  return apiClient.post("/ai/models/select", { model });
}

export function startModelDownload(model: string): Promise<PullJob> {
  return apiClient.post<PullJob>("/ai/models/pull", { model });
}

export function getModelDownload(id: string): Promise<PullJob> {
  return apiClient.get<PullJob>(pullPath(id));
}

export function followModelDownload(
  job: PullJob,
  options: FollowJobOptions = {}
): Promise<PullJob> {
  return followJob(job, pullPath, options);
}

export async function cancelModelDownload(id: string): Promise<void> {
  await apiClient.delete(pullPath(id));
}

export async function removeModel(model: string): Promise<void> {
  await apiClient.post("/ai/models/remove", { model });
}

export function setResearchProfile(
  researchProfile: ResearchProfile
): Promise<AiStatus> {
  return apiClient.patch<AiStatus>("/ai/settings", { researchProfile });
}
