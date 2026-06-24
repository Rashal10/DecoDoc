import { describe, expect, it } from "vitest";
import type { Analysis, Paper } from "@decodoc/shared";
import { ANALYSIS_SCHEMA_VERSION } from "@decodoc/shared";
import {
  assertAnalyzePairing,
  lookupMatchesPaper,
  normalizeArxivId,
  papersMatchIdentity,
  validateResolvedArxivPaper
} from "./paperIdentity";

const deepSeek: Paper = {
  id: "arxiv:2412.19437",
  title: "DeepSeek-V3 Technical Report",
  authors: ["DeepSeek-AI"],
  abstract: "We present DeepSeek-V3.",
  arxivId: "2412.19437",
  year: 2024
};

const hartreeFock: Paper = {
  id: "arxiv:2412.03672",
  title: "Nonlinear Optimal Control of Electron Dynamics within Hartree-Fock Theory",
  authors: ["Harish S. Bhat"],
  abstract: "Quantum control.",
  arxivId: "2412.03672",
  year: 2024
};

describe("normalizeArxivId", () => {
  it("strips arxiv prefix and version suffix", () => {
    expect(normalizeArxivId("arxiv:2412.03672v2")).toBe("2412.03672");
    expect(normalizeArxivId("2412.03672")).toBe("2412.03672");
  });
});

describe("papersMatchIdentity", () => {
  it("matches equivalent arxiv identifiers", () => {
    expect(
      papersMatchIdentity(deepSeek, { ...deepSeek, id: "arxiv:2412.19437", arxivId: "2412.19437" })
    ).toBe(true);
  });

  it("does not match different papers", () => {
    expect(papersMatchIdentity(deepSeek, hartreeFock)).toBe(false);
  });
});

describe("lookupMatchesPaper", () => {
  it("matches bare arxiv id lookups", () => {
    expect(lookupMatchesPaper("2412.19437", deepSeek)).toBe(true);
    expect(lookupMatchesPaper("arxiv:2412.19437", deepSeek)).toBe(true);
  });

  it("matches the correct paper for each arxiv id", () => {
    expect(lookupMatchesPaper("2412.03672", hartreeFock)).toBe(true);
    expect(lookupMatchesPaper("2412.03672", deepSeek)).toBe(false);
    expect(lookupMatchesPaper("2412.19437", deepSeek)).toBe(true);
  });
});

describe("validateResolvedArxivPaper", () => {
  it("accepts a matching curated example paper", () => {
    expect(() => validateResolvedArxivPaper(deepSeek)).not.toThrow();
  });

  it("rejects a curated example id that resolves to the wrong title", () => {
    const mismatched: Paper = {
      id: "arxiv:2412.19437",
      title: "Nonlinear Optimal Control of Electron Dynamics within Hartree-Fock Theory",
      authors: ["Harish S. Bhat"],
      abstract: "Quantum control.",
      arxivId: "2412.19437",
      year: 2024
    };
    expect(() => validateResolvedArxivPaper(mismatched)).toThrow(/DeepSeek/i);
  });
});

describe("assertAnalyzePairing", () => {
  it("throws when analysis paper id does not match", () => {
    const analysis = {
      schemaVersion: ANALYSIS_SCHEMA_VERSION,
      paperId: "arxiv:2403.12345",
      headline: "Wrong",
      tldr: "Wrong"
    } as Analysis;

    expect(() => assertAnalyzePairing(deepSeek, analysis)).toThrow(/mismatch|belongs/i);
  });
});
