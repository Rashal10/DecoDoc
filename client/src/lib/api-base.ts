/** Shared API base URL for production (Vercel → Render) and dev (Vite proxy). */
export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (import.meta.env.DEV) return "";
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "";
  }
  return "";
}

export function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}
