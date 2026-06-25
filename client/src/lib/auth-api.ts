export type UsageStatus = {
  authenticated: boolean;
  used: number;
  limit: number;
  remaining: number;
};

export type ApiErrorCode = "LOGIN_REQUIRED" | "DAILY_LIMIT" | "AUTH_REQUIRED";

export class ApiError extends Error {
  code?: string;
  used?: number;
  limit?: number;
  remaining?: number;

  constructor(message: string, data?: { error?: string; used?: number; limit?: number; remaining?: number }) {
    super(message);
    this.name = "ApiError";
    this.code = data?.error;
    this.used = data?.used;
    this.limit = data?.limit;
    this.remaining = data?.remaining;
  }
}

export async function authHeaders(contentType = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (contentType) headers["Content-Type"] = "application/json";
  return headers;
}
