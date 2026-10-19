import type { Analysis, AnalyzeResponse, Paper, RelatedPaper, SearchResult } from "@decodoc/shared";
import { ApiError, type UsageStatus, authHeaders } from "./auth-api";
import { apiUrl, getApiBaseUrl } from "./api-base";

export { ApiError, getApiBaseUrl, apiUrl };
export type { UsageStatus };

export const ANALYSIS_CANCELLED = "Analysis cancelled.";
export const ANALYZE_TIMEOUT_MS = 180_000;
export const PDF_UPLOAD_TIMEOUT_MS = 300_000;

const PENDING_ANALYSIS_KEY = "decodoc:pending-analysis";

export type PendingAnalysis = {
  mode: string;
  value: string;
  abstractTitle?: string;
};

const API_BASE = getApiBaseUrl();

let activeController: AbortController | null = null;
let userCancelled = false;
let sessionTimer: number | undefined;

function clearSessionTimer(): void {
  if (sessionTimer !== undefined) {
    window.clearTimeout(sessionTimer);
    sessionTimer = undefined;
  }
}

export function beginAnalysisSession(timeoutMs: number): AbortSignal {
  cancelActiveAnalysis({ silent: true });
  userCancelled = false;
  const controller = new AbortController();
  activeController = controller;
  sessionTimer = window.setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export function cancelActiveAnalysis(options?: { silent?: boolean }): void {
  if (!options?.silent) userCancelled = true;
  clearSessionTimer();
  activeController?.abort();
  activeController = null;
}

export function endAnalysisSession(): void {
  clearSessionTimer();
  activeController = null;
  userCancelled = false;
}

export function savePendingAnalysis(pending: PendingAnalysis): void {
  sessionStorage.setItem(PENDING_ANALYSIS_KEY, JSON.stringify(pending));
}

export function loadPendingAnalysis(): PendingAnalysis | null {
  const raw = sessionStorage.getItem(PENDING_ANALYSIS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAnalysis;
  } catch {
    return null;
  }
}

export function clearPendingAnalysis(): void {
  sessionStorage.removeItem(PENDING_ANALYSIS_KEY);
}

function timeoutMessage(path: string) {
  if (path.includes("/api/upload-pdf")) {
    return "PDF analysis is taking longer than expected. Large papers can take a few minutes — please try again.";
  }
  if (path.includes("/api/analyze")) {
    return "Analysis is taking too long. Try pasting the abstract or retry in a minute.";
  }
  if (path.includes("/api/search")) return "Search timed out. Analyze at least one paper first, then retry.";
  return "Request timed out. Please retry.";
}

function handleFetchError(error: unknown, path: string): never {
  if (error instanceof DOMException && error.name === "AbortError") {
    if (userCancelled) throw new Error(ANALYSIS_CANCELLED);
    throw new Error(timeoutMessage(path));
  }
  throw error;
}

function activeSignal(): AbortSignal {
  if (!activeController) throw new Error("No active analysis session.");
  return activeController.signal;
}

type JobPayload = {
  jobId?: string;
  status?: string;
  message?: string;
  paper?: Paper;
  analysis?: Analysis | null;
};

function isReadyAnalysis(data: AnalyzeResponse | JobPayload): data is AnalyzeResponse {
  return "paper" in data && "analysis" in data && Boolean(data.analysis);
}

async function delay(ms: number, signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function followAnalysis(data: AnalyzeResponse | JobPayload, timeoutMs = ANALYZE_TIMEOUT_MS): Promise<AnalyzeResponse> {
  if (isReadyAnalysis(data)) return data;
  const jobId = data.jobId;
  if (!jobId) throw new Error("The server returned an incomplete analysis.");
  const signal = activeSignal();
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const job = await request<JobPayload>(`/api/jobs/${encodeURIComponent(jobId)}`);
    if (job.status === "done" && job.paper && job.analysis) {
      return { paper: job.paper, analysis: job.analysis };
    }
    if (job.status === "failed") throw new Error(job.message || "Analysis failed.");
    await delay(2000, signal);
  }
  throw new Error("Analysis is taking too long. Try again in a minute.");
}

async function parseErrorResponse(res: Response): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new ApiError(data.message ?? data.error ?? `Request failed: ${res.status}`, data);
}

async function request<T>(path: string, init?: RequestInit, options?: { useActiveSignal?: boolean }): Promise<T> {
  try {
    const headers = await authHeaders(!(init?.body instanceof FormData));
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      signal: options?.useActiveSignal === false ? init?.signal : activeSignal(),
      headers: {
        ...headers,
        ...init?.headers,
      },
    });
    if (!res.ok) await parseErrorResponse(res);
    const data = await res.json().catch(() => ({}));
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    handleFetchError(error, path);
  }
}

export const api = {
  usage() {
    return request<UsageStatus>("/api/me/usage", { method: "GET" }, { useActiveSignal: false });
  },
  analyze(inputType: string, value: string, title?: string, model?: string) {
    return request<AnalyzeResponse | { jobId: string }>(
      "/api/analyze",
      {
        method: "POST",
        body: JSON.stringify({ inputType, value, title, model, async: true }),
      }
    ).then((data) => followAnalysis(data));
  },
  uploadPdf(file: File, text: string, model?: string) {
    function extractTitleFromText(rawText: string, fallback: string): string {
      const head = rawText.slice(0, 1000).trim();
      const lines = head.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 0);
      for (const line of lines) {
        if (
          line.length >= 10 &&
          line.length <= 200 &&
          !/^\d+$/.test(line) &&
          !/^[A-Z\s\d,.]+$/.test(line) &&
          !/^https?:\/\//i.test(line)
        ) {
          return line.replace(/\s+/g, " ").trim();
        }
      }
      return fallback;
    }
    const fallbackTitle = file.name.replace(/\.pdf$/i, "");
    const title = extractTitleFromText(text, fallbackTitle);
    const body = new FormData();
    body.append("pdf", file);
    body.append("text", text);
    body.append("title", title);
    if (model) body.append("model", model);
    body.append("async", "true");

    return authHeaders(false).then((headers: Record<string, string>) =>
      fetch(`${API_BASE}/api/upload-pdf`, {
        method: "POST",
        body,
        credentials: "include",
        signal: activeSignal(),
        headers,
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new ApiError(data.message ?? data.error ?? "PDF upload failed", data);
          return followAnalysis(data as AnalyzeResponse | { jobId: string }, PDF_UPLOAD_TIMEOUT_MS);
        })
        .catch((error) => {
          if (error instanceof ApiError) throw error;
          handleFetchError(error, "/api/upload-pdf");
        })
    );
  },
  search(q: string) {
    beginAnalysisSession(45_000);
    return request<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`).finally(endAnalysisSession);
  },
  paper(id: string) {
    return request<{ paper: Paper; analysis: Analysis | null }>(`/api/paper/${encodeURIComponent(id)}`);
  },
  similar(id: string) {
    return request<{ related: RelatedPaper[] }>(`/api/similar/${encodeURIComponent(id)}`);
  },
  getBookmarks() {
    return request<{ bookmarks: Paper[] }>("/api/library/bookmarks", { method: "GET" }, { useActiveSignal: false });
  },
  toggleBookmark(paperId: string) {
    return request<{ bookmarks: Paper[]; bookmarked: boolean }>(
      `/api/library/bookmarks/${encodeURIComponent(paperId)}`,
      { method: "PUT" },
      { useActiveSignal: false }
    );
  },
  syncBookmarks(paperIds: string[]) {
    return request<{ bookmarks: Paper[] }>(
      "/api/library/bookmarks/sync",
      { method: "POST", body: JSON.stringify({ paperIds }) },
      { useActiveSignal: false }
    );
  },
};
