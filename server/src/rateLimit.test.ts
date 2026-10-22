import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { analysisRateKey } from "./rateLimit";

describe("analysis rate keys", () => {
  it("counts a signed-in account ahead of the network address", () => {
    const req = {
      authUser: { id: "user-1", authProviderId: "email:user-1" },
      anonymousSession: { id: "session-1" },
      ip: "203.0.113.8",
    } as Request;
    expect(analysisRateKey(req)).toBe("user:user-1");
  });

  it("counts an anonymous session on its own", () => {
    const req = { anonymousSession: { id: "session-9" }, ip: "203.0.113.8" } as Request;
    expect(analysisRateKey(req)).toBe("session:session-9");
  });

  it("falls back to the visitor address when no account exists", () => {
    const req = { ip: "203.0.113.8" } as Request;
    expect(analysisRateKey(req)).toBe("203.0.113.8");
  });
});
