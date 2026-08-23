import { apiClient } from "@/services/api-client";

export function exportAccountArchive(): Promise<unknown> {
  return apiClient.get<unknown>("/account/export");
}

export async function importAccountArchive(archive: unknown): Promise<void> {
  await apiClient.post("/account/import", archive);
}
