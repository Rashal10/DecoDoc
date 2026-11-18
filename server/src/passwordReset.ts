import { createHash, randomBytes } from "node:crypto";

/** How long a reset link stays valid. */
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export type ResetTokenRecord = {
  expiresAt: Date;
  usedAt: Date | null;
};

/** Random token sent to the user. Only its hash is stored. */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function resetTokenExpiry(now = new Date()): Date {
  return new Date(now.getTime() + RESET_TOKEN_TTL_MS);
}

export function isResetTokenUsable(record: ResetTokenRecord | null | undefined, now = new Date()): boolean {
  if (!record) return false;
  if (record.usedAt) return false;
  return record.expiresAt.getTime() > now.getTime();
}

/** Tokens are base64url and 43 characters long; reject anything else before touching the database. */
export function looksLikeResetToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

export function resetPasswordLink(clientOrigin: string, token: string): string {
  const base = clientOrigin.replace(/\/+$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
