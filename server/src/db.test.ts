import { describe, expect, it } from "vitest";
import { ANALYSIS_SCHEMA_VERSION } from "@decodoc/shared";
import { parseCachedAnalysis } from "./analysisCache";

describe("parseCachedAnalysis", () => {
  it("returns null for v1 legacy payloads", () => {
    const legacy = JSON.stringify({
      paperId: "arxiv:1706.03762",
      tldr: "Transformers use attention.",
      problem: "Old flat string format"
    });
    expect(parseCachedAnalysis(legacy)).toBeNull();
  });

  it("returns v2 analysis when schemaVersion matches", () => {
    const v2 = JSON.stringify({
      schemaVersion: ANALYSIS_SCHEMA_VERSION,
      paperId: "arxiv:1706.03762",
      headline: "Attention rewired NLP",
      tldr: "Transformers replace recurrence with attention."
    });
    const result = parseCachedAnalysis(v2);
    expect(result).not.toBeNull();
    expect(result?.schemaVersion).toBe(ANALYSIS_SCHEMA_VERSION);
    expect(result?.headline).toBe("Attention rewired NLP");
  });

  it("returns null for invalid JSON", () => {
    expect(parseCachedAnalysis("{not json")).toBeNull();
  });
});
