import { getPool, isDatabaseReady } from "./init-db";

export const JOB_HEARTBEAT_STALE_MS = 90_000;

const runningJobIds = new Set<string>();
let acceptJobResults = true;

export function jobResultsOpen(): boolean {
  return acceptJobResults;
}

export function noteJobRunning(jobId: string): void {
  runningJobIds.add(jobId);
}

export function noteJobStopped(jobId: string): void {
  runningJobIds.delete(jobId);
}

export function isJobTracked(jobId: string): boolean {
  return runningJobIds.has(jobId);
}

export function jobNeedsResume(status: string, updatedAt: Date, now: number, trackedHere: boolean): boolean {
  if (trackedHere) return false;
  if (status === "queued") return true;
  if (status === "running") return now - updatedAt.getTime() >= JOB_HEARTBEAT_STALE_MS;
  return false;
}

export function inputTypeForStoredPaper(paper: {
  venue?: string | null;
  arxivId?: string | null;
  doi?: string | null;
}): "pdf" | "abstract" | "arxiv" | "doi" {
  if (paper.venue === "Uploaded PDF") return "pdf";
  if (paper.arxivId) return "arxiv";
  if (paper.doi) return "doi";
  return "abstract";
}

export async function requeueTrackedJobs(): Promise<void> {
  acceptJobResults = false;
  const ids = [...runningJobIds];
  runningJobIds.clear();
  if (ids.length === 0 || !isDatabaseReady()) return;
  await getPool().query(
    `update analysis_jobs
     set status = 'queued', error = null, updated_at = now()
     where id = any($1::uuid[]) and status = 'running'`,
    [ids]
  );
}
