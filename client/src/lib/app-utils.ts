import type { Paper } from "@decodoc/shared";
import { EXAMPLE_ARXIV_PAPERS } from "@decodoc/shared";

export const HERO_IMAGES = [
  "/images/screenshot-235651.png",
  "/images/screenshot-011613.png",
  "/images/screenshot-010954.png",
  "/images/screenshot-011015.png",
  "/images/screenshot-011206.png",
  "/images/screenshot-011348.png",
];

export const LOADING_MESSAGES = [
  "Reading the paper structure…",
  "Extracting methods and claims…",
  "Cross-referencing citations…",
  "Building your research brief…",
];

export const EXAMPLE_PAPERS = EXAMPLE_ARXIV_PAPERS.map((paper) => [paper.arxivId, paper.label] as const);

export type InputMode = "arxiv" | "doi" | "abstract" | "pdf";
export type ActivePage = "home" | "library" | "paper-detail";
export type BusyStage = "idle" | "fetching" | "embedding" | "analyzing" | "saving" | "extracting";
export type ResultsTab =
  | "summary"
  | "genealogy"
  | "code"
  | "hype"
  | "roadmap"
  | "interview"
  | "flashcards"
  | "gaps"
  | "citations"
  | "eli5";

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function waitFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function friendlyError(msg: string): string {
  if (msg.includes("API_KEY") || msg.includes("LLM provider")) {
    return "The analysis service is not configured. Try again later.";
  }
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg === "fetch failed") {
    if (import.meta.env.DEV || isLocalHost()) {
      return "Cannot reach the API server. From the project root run npm run dev.";
    }
    if (!import.meta.env.VITE_API_BASE_URL) {
      return "Cannot reach the API. Set VITE_API_BASE_URL to your deployed backend URL.";
    }
    return "Cannot reach the API server. Check that the backend is running and CORS allows this origin.";
  }
  if (msg.includes("high demand") || msg.includes("503") || msg.includes("rate limit") || msg.includes("overloaded") || msg.includes("429")) {
    return "The analysis service is busy. Wait a moment and try again.";
  }
  if (msg.includes("DAILY_LIMIT") || msg.includes("daily limit")) {
    return "You've reached your daily analysis limit (10/day). Try again tomorrow.";
  }
  if (msg.includes("LOGIN_REQUIRED") || msg.includes("3 free analyses")) {
    return "You've used your 3 free analyses. Sign in to continue.";
  }
  if (msg.includes("CORS")) {
    return "The API blocked this request. Set CLIENT_ORIGIN on the server to match this site URL.";
  }
  return msg;
}

function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export function normalizeArxivId(value: string): string | null {
  const raw = value.trim().replace(/^arxiv:/i, "");
  const match = raw.match(/^([0-9]{4}\.[0-9]{4,5}|[a-z-]+\/[0-9]{7})(?:v\d+)?$/i);
  return match?.[1] ?? null;
}

export function extractRequestedArxivId(value: string): string | null {
  const match = value.trim().match(/(?:arxiv\.org\/(?:abs|pdf)\/)?([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?|[a-z-]+\/[0-9]{7})/i);
  return match?.[1] ? normalizeArxivId(match[1]) : null;
}

export function samePaper(a: Paper, b: Paper): boolean {
  if (a.id === b.id) return true;
  const aArxiv = a.arxivId ? normalizeArxivId(a.arxivId) : normalizeArxivId(a.id);
  const bArxiv = b.arxivId ? normalizeArxivId(b.arxivId) : normalizeArxivId(b.id);
  if (aArxiv && bArxiv && aArxiv === bArxiv) return true;
  if (a.doi && b.doi && a.doi.toLowerCase() === b.doi.toLowerCase()) return true;
  return false;
}
