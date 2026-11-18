import { describe, expect, it } from "vitest";
import {
  RESET_TOKEN_TTL_MS,
  generateResetToken,
  hashResetToken,
  isResetTokenUsable,
  looksLikeResetToken,
  resetPasswordLink,
  resetTokenExpiry,
} from "./passwordReset";

describe("password reset tokens", () => {
  it("generates unique tokens that pass the shape check", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a).not.toBe(b);
    expect(looksLikeResetToken(a)).toBe(true);
    expect(looksLikeResetToken("short")).toBe(false);
    expect(looksLikeResetToken(`${a}<script>`)).toBe(false);
  });

  it("hashes tokens deterministically without storing the raw value", () => {
    const token = generateResetToken();
    expect(hashResetToken(token)).toBe(hashResetToken(token));
    expect(hashResetToken(token)).not.toContain(token);
    expect(hashResetToken(token)).toHaveLength(64);
  });

  it("accepts fresh unused tokens and rejects used or expired ones", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const expiresAt = resetTokenExpiry(now);
    expect(expiresAt.getTime() - now.getTime()).toBe(RESET_TOKEN_TTL_MS);
    expect(isResetTokenUsable({ expiresAt, usedAt: null }, now)).toBe(true);
    expect(isResetTokenUsable({ expiresAt, usedAt: now }, now)).toBe(false);
    expect(isResetTokenUsable({ expiresAt, usedAt: null }, new Date(expiresAt.getTime() + 1))).toBe(false);
    expect(isResetTokenUsable(null, now)).toBe(false);
  });

  it("builds a reset link on the client origin", () => {
    expect(resetPasswordLink("https://deco-doc.vercel.app/", "abc_-1")).toBe(
      "https://deco-doc.vercel.app/reset-password?token=abc_-1"
    );
  });
});
