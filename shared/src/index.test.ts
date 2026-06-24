import { describe, expect, it } from "vitest";
import {
  ANALYSIS_SCHEMA_VERSION,
  clampScore,
  detectDomain,
  EXAMPLE_ARXIV_PAPERS,
  isCurrentAnalysis,
  readingTime,
  sectionToMarkdown
} from "./index";

describe("detectDomain", () => {
  it("classifies transformer papers as cs", () => {
    expect(
      detectDomain(
        "Attention Is All You Need",
        "We present the Transformer based solely on attention mechanisms."
      )
    ).toBe("cs");
  });

  it("classifies CRISPR papers as biology", () => {
    expect(
      detectDomain(
        "CRISPR-Cas9 gene editing",
        "Cas9 endonuclease uses RNA guides to cleave DNA in bacterial immunity."
      )
    ).toBe("biology");
  });
});

describe("isCurrentAnalysis", () => {
  it("rejects legacy v1 payloads without schemaVersion", () => {
    expect(isCurrentAnalysis({ paperId: "x", tldr: "old" } as any)).toBe(false);
  });

  it("accepts v2 payloads", () => {
    expect(isCurrentAnalysis({ schemaVersion: ANALYSIS_SCHEMA_VERSION, paperId: "x" } as any)).toBe(true);
  });

  it("rejects null", () => {
    expect(isCurrentAnalysis(null)).toBe(false);
  });
});

describe("sectionToMarkdown", () => {
  it("formats lead, bullets, and detail", () => {
    const md = sectionToMarkdown("Problem", {
      lead: "Gap in scalable training.",
      bullets: ["Point A", "Point B"],
      detail: "Extra context."
    });
    expect(md).toContain("## Problem");
    expect(md).toContain("Gap in scalable training.");
    expect(md).toContain("- Point A");
    expect(md).toContain("Extra context.");
  });
});

describe("clampScore", () => {
  it("clamps values to 0-100", () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(42.7)).toBe(43);
  });
});

describe("readingTime", () => {
  it("estimates minutes from word count", () => {
    const words = Array.from({ length: 440 }, () => "word").join(" ");
    expect(readingTime(words)).toBe(2);
  });
});

describe("EXAMPLE_ARXIV_PAPERS", () => {
  it("uses unique arxiv ids", () => {
    const ids = EXAMPLE_ARXIV_PAPERS.map((p) => p.arxivId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("maps DeepSeek-V3 to the correct technical report id", () => {
    const deepSeek = EXAMPLE_ARXIV_PAPERS.find((p) => p.label === "DeepSeek-V3");
    expect(deepSeek?.arxivId).toBe("2412.19437");
    expect(deepSeek?.arxivId).not.toBe("2412.03672");
  });
});
