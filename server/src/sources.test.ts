import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Paper } from "@decodoc/shared";
import { enrichSemanticScholar } from "./sources";

const deepSeek: Paper = {
  id: "arxiv:2412.19437",
  title: "DeepSeek-V3 Technical Report",
  authors: ["DeepSeek-AI"],
  abstract: "We present DeepSeek-V3, a strong Mixture-of-Experts language model.",
  arxivId: "2412.19437",
  year: 2024
};

describe("enrichSemanticScholar", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          title: "Nonlinear Optimal Control of Electron Dynamics within Hartree-Fock Theory",
          abstract: "Wrong abstract",
          authors: [{ name: "Harish S. Bhat" }],
          year: 2024,
          externalIds: { ArXiv: "2403.12345" }
        })
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not call Semantic Scholar for arXiv papers", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockClear();
    const enriched = await enrichSemanticScholar(deepSeek);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(enriched).toEqual(deepSeek);
  });

  it("does not replace DOI title/abstract when Semantic Scholar returns a different paper", async () => {
    const crossrefPaper: Paper = {
      id: "doi:10.5555/example",
      title: "DeepSeek-V3 Technical Report",
      authors: ["DeepSeek-AI"],
      abstract: "We present DeepSeek-V3.",
      doi: "10.5555/example",
      year: 2024
    };
    const enriched = await enrichSemanticScholar(crossrefPaper);
    expect(enriched.title).toBe(crossrefPaper.title);
    expect(enriched.abstract).toBe(crossrefPaper.abstract);
    expect(enriched.authors).toEqual(crossrefPaper.authors);
  });
});
