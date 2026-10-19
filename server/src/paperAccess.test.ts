import { describe, expect, it } from "vitest";
import { canReadPaper } from "./paperAccess";

const privatePaper = {
  visibility: "private" as const,
  ownerUserId: "user-1",
  ownerSessionId: null,
};

describe("canReadPaper", () => {
  it("allows every reader to open a public paper", () => {
    expect(
      canReadPaper({ visibility: "public", ownerUserId: null, ownerSessionId: null }, {})
    ).toBe(true);
  });

  it("allows the owning user to open a private paper", () => {
    expect(canReadPaper(privatePaper, { userId: "user-1" })).toBe(true);
  });

  it("hides a private paper from a different user", () => {
    expect(canReadPaper(privatePaper, { userId: "user-2", sessionId: "session-9" })).toBe(false);
  });

  it("allows the anonymous session that created the paper", () => {
    expect(
      canReadPaper(
        { visibility: "private", ownerUserId: null, ownerSessionId: "session-1" },
        { sessionId: "session-1" }
      )
    ).toBe(true);
  });
});
