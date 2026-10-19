import { describe, expect, it } from "vitest";
import { CITATION_TTL_MS, citationsAreFresh } from "./citationFreshness";

describe("citationsAreFresh", () => {
  it("treats a missing timestamp as stale", () => {
    expect(citationsAreFresh(null, 1_000)).toBe(false);
  });

  it("stays fresh inside the week and expires after it", () => {
    const now = 10_000_000;
    expect(citationsAreFresh(new Date(now - CITATION_TTL_MS + 1_000), now)).toBe(true);
    expect(citationsAreFresh(new Date(now - CITATION_TTL_MS - 1), now)).toBe(false);
  });
});
