import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema
} from "@google/generative-ai";
import type {
  Analysis,
  AnalysisSection,
  ComparisonRow,
  Paper,
  ResearchGap,
  RoadmapNode,
  SubjectDomain
} from "@decodoc/shared";
import {
  ANALYSIS_SCHEMA_VERSION,
  clampScore,
  detectDomain,
  estimatePaperReadingMinutes
} from "@decodoc/shared";
import { requireGeminiKey } from "./config";
import { generateJson, generateText } from "./llm";
import { validateAnalysis } from "./analysisValidation";
import {
  normalizeCitationGraph,
  normalizeFutureDirections,
  resolveCitationNetwork
} from "./citations";

function getDomainSystemPrompt(domain: SubjectDomain): string {
  const base =
    "You are DecoDoc, a research analyst. Write clearly and precisely. Ground every claim in the paper text.";
  switch (domain) {
    case "cs":
      return `${base} Focus on architectures, algorithms, benchmarks, training regimes, complexity, and reproducibility.`;
    case "math":
      return `${base} Focus on definitions, theorems, proofs, derivations, and theoretical implications.`;
    case "biology":
      return `${base} Focus on mechanisms, experimental setups, pathways, assays, and clinical significance.`;
    case "chemistry":
      return `${base} Focus on molecular structures, synthesis, catalysts, spectroscopy, and applications.`;
    case "physics":
      return `${base} Focus on physical models, instruments, equations, simulations, and empirical data.`;
    default:
      return `${base} Focus on hypothesis, methodology, results, limitations, and broader impact.`;
  }
}

const sectionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    lead: { type: SchemaType.STRING },
    bullets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    detail: { type: SchemaType.STRING }
  },
  required: ["lead", "bullets"]
};

const analysisSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    headline: { type: SchemaType.STRING },
    tldr: { type: SchemaType.STRING },
    problem: sectionSchema,
    novelty: sectionSchema,
    method: sectionSchema,
    results: sectionSchema,
    limitations: sectionSchema,
    verdict: sectionSchema,
    researchImpact: sectionSchema,
    industryRelevance: sectionSchema,
    difficulty: { type: SchemaType.NUMBER },
    hypeScore: { type: SchemaType.NUMBER },
    impactScore: { type: SchemaType.NUMBER },
    industryScore: { type: SchemaType.NUMBER },
    reproducibilityScore: { type: SchemaType.NUMBER },
    student: {
      type: SchemaType.OBJECT,
      properties: {
        beginner: { type: SchemaType.STRING },
        intermediate: { type: SchemaType.STRING },
        research: { type: SchemaType.STRING },
        prerequisites: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
      },
      required: ["beginner", "intermediate", "research", "prerequisites"]
    },
    quiz: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          question: { type: SchemaType.STRING },
          answer: { type: SchemaType.STRING }
        },
        required: ["question", "answer"]
      }
    },
    eli5: {
      type: SchemaType.OBJECT,
      properties: {
        eli5: { type: SchemaType.STRING },
        eli12: { type: SchemaType.STRING },
        eliUndergrad: { type: SchemaType.STRING },
        eliPhD: { type: SchemaType.STRING }
      },
      required: ["eli5", "eli12", "eliUndergrad", "eliPhD"]
    },
    flashcards: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          front: { type: SchemaType.STRING },
          back: { type: SchemaType.STRING },
          hint: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          difficulty: { type: SchemaType.STRING }
        },
        required: ["front", "back", "hint", "category", "difficulty"]
      }
    },
    gaps: {
      type: SchemaType.OBJECT,
      properties: {
        gaps: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              category: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              evidence: { type: SchemaType.STRING },
              opportunity: { type: SchemaType.STRING },
              impact: { type: SchemaType.STRING },
              difficulty: { type: SchemaType.STRING }
            },
            required: ["title", "category", "description", "evidence", "opportunity", "impact", "difficulty"]
          }
        },
        openQuestions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        futureDirections: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING }
            },
            required: ["title", "description"]
          }
        }
      },
      required: ["gaps", "openQuestions", "futureDirections"]
    },
    genealogy: {
      type: SchemaType.OBJECT,
      properties: {
        ancestors: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              authors: { type: SchemaType.STRING },
              year: { type: SchemaType.NUMBER },
              contribution: { type: SchemaType.STRING },
              confidence: { type: SchemaType.STRING }
            },
            required: ["title", "authors", "year", "contribution"]
          }
        },
        descendants: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              authors: { type: SchemaType.STRING },
              year: { type: SchemaType.NUMBER },
              contribution: { type: SchemaType.STRING },
              confidence: { type: SchemaType.STRING }
            },
            required: ["title", "authors", "year", "contribution"]
          }
        }
      },
      required: ["ancestors", "descendants"]
    },
    hypeClaims: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          claim: { type: SchemaType.STRING },
          hypeLevel: { type: SchemaType.STRING },
          realityCheck: { type: SchemaType.STRING },
          rating: { type: SchemaType.NUMBER }
        },
        required: ["claim", "hypeLevel", "realityCheck", "rating"]
      }
    },
    roadmap: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          difficulty: { type: SchemaType.STRING }
        },
        required: ["title", "description", "difficulty"]
      }
    },
    interviewQA: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          question: { type: SchemaType.STRING },
          answer: { type: SchemaType.STRING }
        },
        required: ["question", "answer"]
      }
    },
    starterCode: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          lang: { type: SchemaType.STRING },
          code: { type: SchemaType.STRING },
          explanation: { type: SchemaType.STRING }
        },
        required: ["lang", "code", "explanation"]
      }
    }
  },
  required: [
    "headline",
    "tldr",
    "problem",
    "novelty",
    "method",
    "results",
    "limitations",
    "verdict",
    "researchImpact",
    "industryRelevance",
    "difficulty",
    "hypeScore",
    "impactScore",
    "industryScore",
    "reproducibilityScore",
    "student",
    "quiz",
    "eli5",
    "flashcards",
    "gaps",
    "genealogy",
    "hypeClaims",
    "roadmap",
    "interviewQA",
    "starterCode"
  ]
};

const roadmapSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    nodes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          level: { type: SchemaType.NUMBER }
        },
        required: ["id", "title", "description", "level"]
      }
    }
  },
  required: ["nodes"]
};

const compareSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    rows: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          paperId: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          novelty: { type: SchemaType.NUMBER },
          performance: { type: SchemaType.NUMBER },
          efficiency: { type: SchemaType.NUMBER },
          difficulty: { type: SchemaType.NUMBER },
          impact: { type: SchemaType.NUMBER },
          citationPotential: { type: SchemaType.NUMBER },
          summary: { type: SchemaType.STRING }
        },
        required: ["paperId", "title", "novelty", "performance", "efficiency", "difficulty", "impact", "citationPotential", "summary"]
      }
    }
  },
  required: ["rows"]
};

const gapsSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    gaps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          evidence: { type: SchemaType.STRING },
          opportunity: { type: SchemaType.STRING },
          impact: { type: SchemaType.STRING },
          difficulty: { type: SchemaType.STRING }
        },
        required: ["title", "category", "description", "evidence", "opportunity", "impact", "difficulty"]
      }
    },
    openQuestions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    futureDirections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING }
        },
        required: ["title", "description"]
      }
    }
  },
  required: ["gaps", "openQuestions", "futureDirections"]
};

const eli5Schema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    eli5: { type: SchemaType.STRING },
    eli12: { type: SchemaType.STRING },
    eliUndergrad: { type: SchemaType.STRING },
    eliPhD: { type: SchemaType.STRING }
  },
  required: ["eli5", "eli12", "eliUndergrad", "eliPhD"]
};

const citationsSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    nodes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          authors: { type: SchemaType.STRING },
          year: { type: SchemaType.NUMBER },
          type: { type: SchemaType.STRING },
          citationCount: { type: SchemaType.NUMBER }
        },
        required: ["id", "title", "authors", "year", "type", "citationCount"]
      }
    },
    edges: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          source: { type: SchemaType.STRING },
          target: { type: SchemaType.STRING },
          relationship: { type: SchemaType.STRING }
        },
        required: ["source", "target", "relationship"]
      }
    }
  },
  required: ["nodes", "edges"]
};

const flashcardsSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    flashcards: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          front: { type: SchemaType.STRING },
          back: { type: SchemaType.STRING },
          hint: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          difficulty: { type: SchemaType.STRING }
        },
        required: ["front", "back", "hint", "category", "difficulty"]
      }
    }
  },
  required: ["flashcards"]
};

const metadataSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    authors: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    year: { type: SchemaType.NUMBER },
    venue: { type: SchemaType.STRING }
  },
  required: ["title", "authors"]
};

function normalizeGap(raw: Partial<ResearchGap> & { title: string }): ResearchGap {
  return {
    title: raw.title,
    category: raw.category ?? "Methodological",
    description: raw.description ?? "",
    evidence: raw.evidence ?? "",
    opportunity: raw.opportunity ?? "",
    impact: raw.impact ?? "",
    difficulty: raw.difficulty ?? "Medium"
  };
}

function normalizeSection(raw: Partial<AnalysisSection> | string | undefined): AnalysisSection {
  if (!raw) return { lead: "", bullets: [] };
  if (typeof raw === "string") return { lead: raw, bullets: [] };
  return {
    lead: raw.lead ?? "",
    bullets: Array.isArray(raw.bullets) ? raw.bullets : [],
    detail: raw.detail
  };
}

function buildAnalysisPrompt(paper: Paper, domain: SubjectDomain): string {
  const csNote =
    domain === "cs"
      ? "\n- starterCode: 1-2 runnable code snippets (Python/PyTorch) that illustrate the core idea. Use ONLY real, documented API and module names with correct spelling. Include brief explanation."
      : "\n- starterCode: return empty array [] (not a CS paper).";

  return `${getDomainSystemPrompt(domain)}

Produce a COMPLETE unified analysis as JSON. Ground every claim in the paper text. Name specific methods, datasets, and metrics ONLY when they appear in the abstract below. No generic filler.

CRITICAL GROUNDING RULES (content violating these will be removed):
- NEVER invent benchmark names, dataset names, baseline names, or numeric metrics (IoU, BLEU, accuracy %, F1, etc.) unless they appear in the abstract.
- If the abstract lacks specific numbers, describe results qualitatively without fabricating scores.
- Do not claim superiority over "fully supervised" methods unless the abstract explicitly states this comparison.
- Name baselines and datasets ONLY if explicitly mentioned in the abstract.
- For flashcards with category "Results": never include specific metric values unless those exact numbers appear in the abstract.
- genealogy.ancestors and genealogy.descendants: use real paper titles with real author names. Never use "Various" or "Unknown" as authors. Ancestors must predate the paper year. Always return descendants as an empty array [].
- Do not output a citations field; citation graphs are populated separately from bibliographic data.

PAPER
Title: ${paper.title}
Authors: ${paper.authors.join(", ")}
Year: ${paper.year ?? "unknown"}
Abstract: ${paper.abstract.slice(0, 16000)}

FIELD RULES
- headline: One clear hook sentence that states why the paper matters (max 20 words).
- tldr: 1-2 sentences, max 40 words, zero jargon.
- Each section (problem, novelty, method, results, limitations, verdict, researchImpact, industryRelevance):
  - lead: 1-2 crisp sentences
  - bullets: 3-5 specific points (max 25 words each). Start bullets with strong verbs or nouns.
  - detail: optional 1-2 sentence deeper insight (omit if redundant)
- verdict.lead MUST start with exactly one of: "READ NOW:", "SKIM:", or "SKIP:" followed by the reason.
- difficulty, hypeScore, impactScore, industryScore, reproducibilityScore: integers 0-100.
- student.beginner/intermediate/research: tailored explanations (2-4 sentences each).
- student.prerequisites: 4-8 specific concepts to learn first.
- quiz: 4 multiple-choice-style Q&A pairs testing comprehension.
- eli5: Explain like a 5-year-old. Use a simple analogy. 2-3 short sentences. No jargon or acronyms.
- eli12: Explain like a curious 12-year-old. Analogy + what problem it solves + one "cool fact". 3-4 sentences.
- eliUndergrad: Assume one intro course in the field. Define each technical term once. Include one concrete example from the paper. 4-5 sentences.
- eliPhD: Expert briefing. Architecture, training data scale, key benchmarks with numbers, zero-shot vs fine-tuned results, and explicit limitations. 5-7 sentences.
- flashcards: 14-16 study cards. Rules per card:
  - front: a clear, self-contained question (max 20 words). Must NOT reveal the answer.
  - hint: a subtle one-line clue without giving away the answer (max 12 words).
  - back: precise answer with specific names, numbers, or metrics from the paper (1-3 sentences).
  - category: one of "Core Concepts", "Architecture", "Method", "Results", "Limitations", "Vocabulary".
  - difficulty: Easy, Medium, or Hard.
  - Cover all major sections; no duplicate topics; mix difficulties (roughly 4 Easy, 6 Medium, 4 Hard).
- gaps.gaps: 4-5 research gaps. Each gap MUST include:
  - title: short, specific name (max 6 words)
  - category: one of "Methodological", "Scalability", "Theoretical", "Empirical", "Application"
  - description: what is missing or unresolved (2 sentences, cite paper specifics)
  - evidence: quote or paraphrase what THIS paper says/doesn't do that reveals the gap (1 sentence)
  - opportunity: concrete research project a PhD student could pursue (1-2 sentences, actionable)
  - impact: why filling this gap matters to the field (1 sentence)
  - difficulty: Easy, Medium, or Hard
- gaps.openQuestions: 5-6 precise, falsifiable questions the paper leaves open (not vague).
- gaps.futureDirections: array of exactly 3 items. Each item: title (short theme, 3-6 words, NO markdown) and description (2-3 sentences, paper-specific, actionable).
- genealogy.ancestors: 2-4 foundational papers this work builds on (must be published BEFORE ${paper.year ?? "this paper"}). genealogy.descendants: return an empty array [] — descendant papers cannot be inferred reliably from an abstract.
- hypeClaims: 3-5 paper-specific claims. hypeLevel: HIGH, MODERATE, or LOW. realityCheck must cite evidence from the abstract.
- roadmap: 6-8 prerequisite learning nodes ordered from foundational to advanced.
- interviewQA: 6 expert interview questions. Questions should be challenging and paper-specific. Answers: 3-5 substantive sentences each with evidence from the paper.${csNote}`;
}

export async function embedText(text: string): Promise<number[]> {
  const ai = new GoogleGenerativeAI(requireGeminiKey());
  const model = ai.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function analyzePaper(paper: Paper, modelName?: string): Promise<Analysis> {
  const domain = detectDomain(paper.title, paper.abstract);
  const prompt = buildAnalysisPrompt(paper, domain);
  const json = await generateJson(analysisSchema, prompt, modelName);
  const raw = JSON.parse(json);

  const citations = { nodes: [], edges: [] };

  const analysis: Analysis = {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    paperId: paper.id,
    headline: raw.headline ?? "",
    tldr: raw.tldr ?? "",
    problem: normalizeSection(raw.problem),
    novelty: normalizeSection(raw.novelty),
    method: normalizeSection(raw.method),
    results: normalizeSection(raw.results),
    limitations: normalizeSection(raw.limitations),
    verdict: normalizeSection(raw.verdict),
    researchImpact: normalizeSection(raw.researchImpact),
    industryRelevance: normalizeSection(raw.industryRelevance),
    difficulty: clampScore(raw.difficulty),
    hypeScore: clampScore(raw.hypeScore),
    impactScore: clampScore(raw.impactScore),
    industryScore: clampScore(raw.industryScore),
    reproducibilityScore: clampScore(raw.reproducibilityScore),
    readingTimeMinutes: estimatePaperReadingMinutes(paper),
    student: {
      beginner: raw.student?.beginner ?? "",
      intermediate: raw.student?.intermediate ?? "",
      research: raw.student?.research ?? "",
      prerequisites: raw.student?.prerequisites ?? []
    },
    quiz: raw.quiz ?? [],
    eli5: raw.eli5 ?? { eli5: "", eli12: "", eliUndergrad: "", eliPhD: "" },
    flashcards: (raw.flashcards ?? []).map((c: any) => ({
      front: c.front ?? "",
      back: c.back ?? "",
      hint: c.hint,
      category: c.category ?? "Core Concepts",
      difficulty: c.difficulty ?? "Medium"
    })),
    gaps: {
      gaps: (raw.gaps?.gaps ?? []).map((g: Partial<ResearchGap> & { title: string }) => normalizeGap(g)),
      openQuestions: raw.gaps?.openQuestions ?? [],
      futureDirections: normalizeFutureDirections(raw.gaps?.futureDirections)
    },
    citations,
    genealogy: raw.genealogy ?? { ancestors: [], descendants: [] },
    hypeClaims: (raw.hypeClaims ?? []).map((c: any) => ({
      ...c,
      rating: clampScore(c.rating)
    })),
    roadmap: raw.roadmap ?? [],
    interviewQA: raw.interviewQA ?? [],
    starterCode: raw.starterCode ?? []
  };

  return validateAnalysis(analysis, paper);
}

export async function buildRoadmap(paper: Paper): Promise<RoadmapNode[]> {
  const json = await generateJson(roadmapSchema, `Create a prerequisite learning roadmap for understanding this paper. Use 6-10 ordered nodes. Each node should be a specific, named concept — not vague topics. Include the core mathematical/algorithmic building blocks.
Title: ${paper.title}
Abstract: ${paper.abstract.slice(0, 12000)}`);
  return (JSON.parse(json) as { nodes: RoadmapNode[] }).nodes;
}

export async function comparePapers(papers: Paper[]): Promise<ComparisonRow[]> {
  const json = await generateJson(compareSchema, `Compare these papers side-by-side on specific technical dimensions. Use score values from 0-100.
${papers.map((paper) => `ID: ${paper.id}\nTitle: ${paper.title}\nAbstract: ${paper.abstract.slice(0, 6000)}`).join("\n\n")}`);
  return (JSON.parse(json) as { rows: ComparisonRow[] }).rows.map((row) => ({
    ...row,
    novelty: clampScore(row.novelty),
    performance: clampScore(row.performance),
    efficiency: clampScore(row.efficiency),
    difficulty: clampScore(row.difficulty),
    impact: clampScore(row.impact),
    citationPotential: clampScore(row.citationPotential)
  }));
}

export async function answerPaperQuestion(paper: Paper, question: string): Promise<string> {
  const prompt = `You are a research analyst. Answer the user's question about this paper with technical precision. Reference specific details from the paper's content.

Paper Title: ${paper.title}
Abstract/Content:
${paper.abstract}

User Question: ${question}

Provide a detailed, helpful, and technically accurate answer based on the paper's details. If you cannot answer from the abstract/content provided, use your broader knowledge of the paper if it is a well-known scientific work, but clearly state if you are relying on external knowledge.`;

  return generateText(prompt);
}

export async function findResearchGaps(paper: Paper): Promise<{ gaps: any[]; openQuestions: string[]; futureDirections: import("@decodoc/shared").FutureDirection[] }> {
  const domain = detectDomain(paper.title, paper.abstract);
  const systemPrompt = getDomainSystemPrompt(domain);
  const json = await generateJson(gapsSchema, `${systemPrompt}

Identify potential research gaps, open questions, and future directions for this research paper.

Title: ${paper.title}
Abstract: ${paper.abstract.slice(0, 12000)}`);
  const parsed = JSON.parse(json);
  return {
    ...parsed,
    futureDirections: normalizeFutureDirections(parsed.futureDirections)
  };
}

export async function generateELI5(paper: Paper): Promise<{ eli5: string; eli12: string; eliUndergrad: string; eliPhD: string }> {
  const domain = detectDomain(paper.title, paper.abstract);
  const systemPrompt = getDomainSystemPrompt(domain);
  const json = await generateJson(eli5Schema, `${systemPrompt}

Explain this research paper at 4 different levels of complexity.

Title: ${paper.title}
Abstract: ${paper.abstract.slice(0, 12000)}

Levels:
- eli5: Explain Like I'm 5. Use a simple real-world analogy a child would understand. 2-3 sentences. NO technical jargon whatsoever.
- eli12: Explain Like I'm 12. A middle schooler who knows basic science. Use simple analogies but can include some structure. 3-4 sentences.
- eliUndergrad: Explain to an undergraduate student familiar with the field's basics. 4-5 sentences covering the key method and result.
- eliPhD: Full technical summary for a PhD researcher. Include specific details, evaluation metrics, and limitations. 5-6 sentences.

Make each explanation genuinely appropriate for its target audience.`);
  return JSON.parse(json);
}

export async function buildCitationNetwork(paper: Paper): Promise<{
  nodes: Array<{ id: string; title: string; authors: string; year: number; type: string; citationCount: number }>;
  edges: Array<{ source: string; target: string; relationship: string }>;
}> {
  const resolved = await resolveCitationNetwork(paper);
  if (resolved.nodes.some((node) => node.type !== "current")) return resolved;

  const domain = detectDomain(paper.title, paper.abstract);
  const systemPrompt = getDomainSystemPrompt(domain);
  const json = await generateJson(citationsSchema, `${systemPrompt}

Generate a citation network graph for this paper. Based on the abstract and title, infer the most likely foundational papers (references) and influenced works (citations).

Title: ${paper.title}
Authors: ${paper.authors.join(", ")}
Year: ${paper.year ?? "unknown"}
Abstract: ${paper.abstract.slice(0, 12000)}

Generate:
- nodes: 8-14 papers total including:
  - The current paper itself (type: "current")
  - 4-6 foundational papers it builds on (type: "reference") — use real paper names from the domain
  - 3-5 papers it influenced or that cite it (type: "citation") — use real or plausible papers
  - citationCount should be realistic estimates
- edges: connections between nodes showing citation relationships
  - relationship: brief label like "builds on", "extends", "contrasts with", "applied by"

Use the paper's actual domain and methods to infer realistic related works.`);
  return normalizeCitationGraph(JSON.parse(json), paper);
}

export async function generateFlashcards(paper: Paper): Promise<Array<{
  front: string;
  back: string;
  category: string;
  difficulty: string;
}>> {
  const domain = detectDomain(paper.title, paper.abstract);
  const systemPrompt = getDomainSystemPrompt(domain);
  const json = await generateJson(flashcardsSchema, `${systemPrompt}

Generate comprehensive study flashcards for this research paper.

Title: ${paper.title}
Authors: ${paper.authors.join(", ")}
Abstract: ${paper.abstract.slice(0, 16000)}

Create 14-16 flashcards covering key definitions, methodologies, results, and limitations.

Rules per card:
- front: clear question, max 20 words, no answer leakage
- hint: subtle one-line clue, max 12 words
- back: precise answer with paper-specific details, 1-3 sentences
- category: Core Concepts | Architecture | Method | Results | Limitations | Vocabulary
- difficulty: Easy | Medium | Hard

Return a JSON matching the schema.`);
  return (JSON.parse(json) as { flashcards: Array<{ front: string; back: string; category: string; difficulty: string }> }).flashcards;
}

export async function extractMetadataFromText(text: string, fallbackTitle: string): Promise<{ title: string; authors: string[]; year?: number; venue?: string }> {
  try {
    const prompt = `You are a high-precision academic metadata extractor. Analyze the start of this research paper text (which might be extracted from a PDF) and extract the exact title, authors, publication year, and venue/journal. Correct any scanning, OCR, spacing, or hyphenation errors.
    
Fallback Title (from filename): ${fallbackTitle}

Text Sample (first 4000 characters):
${text.slice(0, 4000)}

Return a JSON object matching the schema. If you cannot determine authors, use ["Unknown"]. If you cannot determine the year or venue, omit them. Ensure the title is the clean, official paper title, using proper capitalization (Title Case).`;

    const json = await generateJson(metadataSchema, prompt);
    const parsed = JSON.parse(json) as { title: string; authors: string[]; year?: number; venue?: string };

    if (!parsed.title || parsed.title.trim().length < 5) {
      parsed.title = fallbackTitle;
    }
    if (!parsed.authors || parsed.authors.length === 0) {
      parsed.authors = ["Unknown"];
    }
    return parsed;
  } catch (error) {
    console.error("Failed to extract metadata:", error);
    return {
      title: fallbackTitle,
      authors: ["Unknown"]
    };
  }
}
