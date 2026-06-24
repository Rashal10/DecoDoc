import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("isAllowedOrigin", () => {
  beforeEach(() => {
    vi.stubEnv("CLIENT_ORIGIN", "http://localhost:5173");
    vi.stubEnv("CLIENT_ORIGINS", "https://decodoc-preview.vercel.app");
    vi.stubEnv("ALLOW_VERCEL_PREVIEWS", "false");
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows requests without an Origin header", async () => {
    const { isAllowedOrigin } = await import("./config");
    expect(isAllowedOrigin(undefined)).toBe(true);
  });

  it("allows the configured primary client origin", async () => {
    const { isAllowedOrigin } = await import("./config");
    expect(isAllowedOrigin("http://localhost:5173")).toBe(true);
  });

  it("allows extra origins from CLIENT_ORIGINS", async () => {
    const { isAllowedOrigin } = await import("./config");
    expect(isAllowedOrigin("https://decodoc-preview.vercel.app")).toBe(true);
  });

  it("rejects unknown origins when preview mode is off", async () => {
    const { isAllowedOrigin } = await import("./config");
    expect(isAllowedOrigin("https://evil.example.com")).toBe(false);
  });

  it("allows vercel.app preview URLs when enabled", async () => {
    vi.stubEnv("ALLOW_VERCEL_PREVIEWS", "true");
    vi.resetModules();
    const { isAllowedOrigin } = await import("./config");
    expect(isAllowedOrigin("https://decodoc-git-main-user.vercel.app")).toBe(true);
  });
});
