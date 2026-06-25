import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Paper } from "@decodoc/shared";
import { normalizeCitationType, normalizeCitationGraph, normalizeFutureDirections, resolveCitationNetwork } from "./citations";

describe("normalizeCitationType", () => {
  it("maps descendant types to citation", () => {
    expect(normalizeCitationType("descendant")).toBe("citation");
    expect(normalizeCitationType("influenced")).toBe("citation");
  });

  it("maps ancestor types to reference", () => {
    expect(normalizeCitationType("foundational")).toBe("reference");
  });
});

describe("normalizeFutureDirections", () => {
  it("parses structured array", () => {
    const result = normalizeFutureDirections([
      { title: "Semantic Models", description: "Integrate language understanding." }
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Semantic Models");
  });

  it("parses legacy markdown string", () => {
    const result = normalizeFutureDirections(
      "**1. Semantic Foundation Models:** Integrate semantics. **2. Continual Learning:** Learn from users."
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).toContain("Semantic");
  });
});

describe("normalizeCitationGraph", () => {
  it("keeps only the analyzed paper as current", () => {
    const paper: Paper = {
      id: "arxiv:1",
      title: "Test Paper",
      authors: ["A Author"],
      abstract: "An abstract."
    };
    const graph = normalizeCitationGraph(
      {
        nodes: [
          { id: "x", title: "Wrong Current", authors: "X", year: 2020, type: "current", citationCount: 1 },
          { id: "1", title: "Prior Art", authors: "Y", year: 2019, type: "reference", citationCount: 2 }
        ],
        edges: [{ source: "1", target: "Test Paper", relationship: "builds on" }]
      },
      paper
    );
    expect(graph.nodes.filter((n) => n.type === "current")).toHaveLength(1);
    expect(graph.nodes[0].title).toBe("Test Paper");
  });
});

describe("resolveCitationNetwork", () => {
  const deepSeek: Paper = {
    id: "arxiv:2412.19437",
    title: "DeepSeek-V3 Technical Report",
    authors: ["DeepSeek-AI"],
    abstract: "We present DeepSeek-V3.",
    arxivId: "2412.19437",
    year: 2024
  };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("semanticscholar.org")) {
          return { ok: true, json: async () => ({ data: [] }) };
        }
        if (url.includes("api.openalex.org/works?filter=doi")) {
          return {
            ok: true,
            json: async () => ({
              results: [
                {
                  id: "https://openalex.org/W4405903187",
                  cited_by_count: 228,
                  referenced_works: []
                }
              ]
            })
          };
        }
        if (url.includes("filter=cites:")) {
          return {
            ok: true,
            json: async () => ({
              results: [
                {
                  id: "https://openalex.org/W4414281281",
                  title: "DeepSeek-R1 incentivizes reasoning in LLMs through reinforcement learning",
                  publication_year: 2025,
                  cited_by_count: 553,
                  authorships: [{ author: { display_name: "DeepSeek-AI" } }]
                }
              ]
            })
          };
        }
        return { ok: false, json: async () => ({}) };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to OpenAlex when Semantic Scholar returns no citation graph", async () => {
    const graph = await resolveCitationNetwork(deepSeek);
    expect(graph.nodes.find((n) => n.type === "current")?.citationCount).toBe(228);
    expect(graph.nodes.some((n) => n.type === "citation" && n.title.includes("DeepSeek-R1"))).toBe(true);
  }, 10_000);
});
