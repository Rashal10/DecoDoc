import { describe, expect, it } from "vitest";
import { parseAppRoute } from "./routes";

describe("parseAppRoute", () => {
  it("maps known paths to pages", () => {
    expect(parseAppRoute("/")).toEqual({ page: "home" });
    expect(parseAppRoute("/library")).toEqual({ page: "library" });
    expect(parseAppRoute("/library/")).toEqual({ page: "library" });
    expect(parseAppRoute("/search")).toEqual({ page: "search" });
    expect(parseAppRoute("/review")).toEqual({ page: "review" });
  });

  it("decodes paper ids", () => {
    expect(parseAppRoute("/paper/arxiv%3A1706.03762")).toEqual({ page: "paper", paperId: "arxiv:1706.03762" });
  });

  it("falls back to home for unknown paths", () => {
    expect(parseAppRoute("/nope")).toEqual({ page: "home" });
  });
});
