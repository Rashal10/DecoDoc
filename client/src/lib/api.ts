import type { Analysis, AnalyzeResponse, Paper, RelatedPaper, SearchResult } from "@decodoc/shared";
import { ApiError, type UsageStatus, authHeaders, setAuthTokenGetter } from "./auth-api";
import { apiUrl, getApiBaseUrl } from "./api-base";

export { setAuthTokenGetter, ApiError, getApiBaseUrl, apiUrl };
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
    return request<AnalyzeResponse>("/api/analyze", {
      method: "POST",
      body: JSON.stringify({ inputType, value, title, model }),
    });
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
          return data as AnalyzeResponse;
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
  gaps(paperId: string) {
    return request<{
      gaps: Array<{ title: string; description: string; opportunity: string; difficulty: string }>;
      openQuestions: string[];
      futureDirections: Array<{ title: string; description: string }>;
    }>("/api/gaps", { method: "POST", body: JSON.stringify({ paperId }) });
  },
  eli5(paperId: string) {
    return request<{ eli5: string; eli12: string; eliUndergrad: string; eliPhD: string }>(
      "/api/eli5",
      { method: "POST", body: JSON.stringify({ paperId }) }
    );
  },
  citations(paperId: string) {
    return request<{
      nodes: Array<{ id: string; title: string; authors: string; year: number; type: string; citationCount: number }>;
      edges: Array<{ source: string; target: string; relationship: string }>;
    }>("/api/citations", { method: "POST", body: JSON.stringify({ paperId }) });
  },
  flashcards(paperId: string) {
    return request<{ flashcards: Array<{ front: string; back: string; category: string; difficulty: string }> }>(
      "/api/flashcards",
      { method: "POST", body: JSON.stringify({ paperId }) }
    );
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
