import { describe, expect, it } from "vitest";
import { estimatePaperReadingMinutes } from "@decodoc/shared";
import {
  buildSourceCorpus,
  sanitizeFlashcards,
  sanitizeGenealogy,
  sanitizeGroundedText,
  sanitizeStarterCode,
  validateAnalysis
} from "./analysisValidation";
import { normalizeCitationGraph } from "./citations";
import type { Analysis, Paper } from "@decodoc/shared";

const samPaper: Paper = {
  id: "arxiv:2304.02643",
  title: "Segment Anything",
  authors: ["Alexander Kirillov"],
  abstract:
    "We introduce the Segment Anything (SA) project: a new task, model, and dataset for image segmentation. " +
    "Using our efficient model in a data collection loop, we built the largest segmentation dataset to date (by far), " +
    "with over 1 billion masks on 11M licensed and privacy respecting images."
};

describe("sanitizeGroundedText", () => {
  it("removes fabricated dataset names", () => {
    const corpus = buildSourceCorpus(samPaper);
    const cleaned = sanitizeGroundedText(
      "SAM achieved an IoU of 75.9% on the AMBITIOUS dataset.",
      corpus
    );
    expect(cleaned).not.toContain("AMBITIOUS");
    expect(cleaned).not.toContain("75.9");
  });

  it("keeps grounded claims from the abstract", () => {
    const corpus = buildSourceCorpus(samPaper);
    const cleaned = sanitizeGroundedText(
      "The SA-1B dataset contains over 1 billion masks on 11M images.",
      corpus
    );
    expect(cleaned).toContain("1 billion");
  });
});

describe("sanitizeFlashcards", () => {
  it("drops result flashcards with invented metrics", () => {
    const corpus = buildSourceCorpus(samPaper);
    const cards = sanitizeFlashcards(
      [
        {
          front: "What is SAM's performance on AMBITIOUS?",
          back: "Achieved an IoU of 75.9% in zero-shot.",
          category: "Results",
          difficulty: "Hard"
        },
        {
          front: "How large is SA-1B?",
          back: "Over 1 billion masks on 11 million images.",
          category: "Method",
          difficulty: "Easy"
        }
      ],
      corpus
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toContain("SA-1B");
  });
});

describe("sanitizeStarterCode", () => {
  it("fixes common SAM API typos", () => {
    const blocks = sanitizeStarterCode([
      {
        lang: "python",
        code: "sam = sam_model_ized_registry['vit_h'](checkpoint='x.pth')",
        explanation: "Load SAM"
      }
    ]);
    expect(blocks[0].code).toContain("sam_model_registry");
  });

  it("drops blocks with uncorrected typos", () => {
    const blocks = sanitizeStarterCode([
      {
        lang: "python",
        code: "from foo import bar_ized_registry",
        explanation: "bad"
      }
    ]);
    expect(blocks).toHaveLength(0);
  });
});

describe("normalizeCitationGraph", () => {
  it("remaps SAM alias edges to current node", () => {
    const graph = normalizeCitationGraph(
      {
        nodes: [
          {
            id: "1",
            title: "Mask R-CNN",
            authors: "He et al.",
            year: 2017,
            type: "reference",
            citationCount: 100
          },
          {
            id: "7",
            title: "Foundation models for computer vision",
            authors: "Bommasani et al.",
            year: 2021,
            type: "reference",
            citationCount: 1000
          }
        ],
        edges: [{ source: "1", target: "SAM", relationship: "builds on" }]
      },
      samPaper
    );

    expect(graph.nodes[0].type).toBe("current");
    expect(graph.nodes[0].title).toBe("Segment Anything");
    expect(graph.nodes.some((n) => n.title.includes("Foundation models"))).toBe(true);
    expect(graph.edges[0].target).toBe("current");
    expect(graph.edges.every((e) => graph.nodes.some((n) => n.id === e.source))).toBe(true);
    expect(graph.edges.every((e) => graph.nodes.some((n) => n.id === e.target))).toBe(true);
  });
});

describe("estimatePaperReadingMinutes", () => {
  it("returns a realistic minimum for arxiv papers", () => {
    expect(estimatePaperReadingMinutes(samPaper)).toBeGreaterThanOrEqual(12);
  });
});

describe("validateAnalysis", () => {
  it("sanitizes a hallucinated SAM analysis payload", () => {
    const analysis: Analysis = {
      schemaVersion: 5,
      paperId: samPaper.id,
      headline: "SAM headline",
      tldr: "SAM tldr",
      problem: { lead: "Problem", bullets: [] },
      novelty: { lead: "Novelty", bullets: [] },
      method: { lead: "Method", bullets: [] },
      results: {
        lead: "Strong on AMBITIOUS.",
        bullets: ["Achieved 75.9% IoU on AMBITIOUS."],
        detail: "Outperformed supervised baselines on AMBITIOUS."
      },
      limitations: { lead: "Limits", bullets: [] },
      verdict: { lead: "READ NOW: Yes", bullets: [] },
      researchImpact: { lead: "Impact", bullets: [] },
      industryRelevance: { lead: "Industry", bullets: [] },
      difficulty: 70,
      hypeScore: 80,
      impactScore: 90,
      industryScore: 80,
      reproducibilityScore: 70,
      readingTimeMinutes: 1,
      student: { beginner: "", intermediate: "", research: "", prerequisites: [] },
      quiz: [],
      eli5: { eli5: "", eli12: "", eliUndergrad: "", eliPhD: "" },
      flashcards: [],
      gaps: { gaps: [], openQuestions: [], futureDirections: [] },
      citations: { nodes: [], edges: [] },
      genealogy: {
        ancestors: [],
        descendants: [{ title: "Future Vision Models", authors: "Various", year: 2024, contribution: "TBD" }]
      },
      hypeClaims: [],
      roadmap: [],
      interviewQA: [],
      starterCode: []
    };

    const validated = validateAnalysis(analysis, samPaper);
    expect(validated.results.bullets.join(" ")).not.toContain("AMBITIOUS");
    expect(validated.genealogy.descendants).toHaveLength(0);
  });
});

describe("sanitizeGenealogy", () => {
  it("drops descendants for recent papers and chronologically impossible entries", () => {
    const cleaned = sanitizeGenealogy(
      {
        ancestors: [
          { title: "Attention Is All You Need", authors: "Vaswani et al.", year: 2017, contribution: "Transformers" },
          { title: "Impossible Future Paper", authors: "Someone", year: 2027, contribution: "Too new" }
        ],
        descendants: [
          { title: "AgentBench", authors: "Fini et al.", year: 2023, contribution: "Benchmark", confidence: "inferred" }
        ]
      },
      2026
    );
    expect(cleaned.ancestors).toHaveLength(1);
    expect(cleaned.ancestors[0]?.title).toContain("Attention");
    expect(cleaned.descendants).toHaveLength(0);
  });
});
