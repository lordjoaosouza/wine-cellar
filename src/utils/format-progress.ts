const GB = 1024 ** 3;
const MB = 1024 ** 2;

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function formatPercent(progress: number): string {
  return `${Math.round(clampProgress(progress) * 100)}%`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
    return "—";
  }
  if (bytes >= GB) {
    return `${(bytes / GB).toFixed(1)} GB`;
  }
  if (bytes >= MB) {
    return `${Math.round(bytes / MB)} MB`;
  }
  return `${Math.max(0, Math.round(bytes / 1024))} KB`;
}

export function formatDownload(completed: number, total: number): string {
  if (total <= 0) {
    return "Starting…";
  }
  return `${formatBytes(completed)} of ${formatBytes(total)}`;
}
