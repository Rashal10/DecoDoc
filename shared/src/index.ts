export type InputKind = "arxiv" | "doi" | "pdf" | "abstract";
export type StudentMode = "beginner" | "intermediate" | "research";
export type SubjectDomain = "cs" | "math" | "biology" | "chemistry" | "physics" | "general";
export type HypeLevel = "HIGH" | "MODERATE" | "LOW";
export type CitationNodeType = "current" | "reference" | "citation";
export type RoadmapDifficulty = "Beginner" | "Intermediate" | "Advanced";

export const ANALYSIS_SCHEMA_VERSION = 5;

/** Curated arXiv examples shown in the UI — IDs verified against arXiv metadata. */
export const EXAMPLE_ARXIV_PAPERS = [
  { arxivId: "1810.04805", label: "BERT", titleIncludes: "BERT" },
  { arxivId: "1706.03762", label: "Attention", titleIncludes: "Attention" },
  { arxivId: "2412.19437", label: "DeepSeek-V3", titleIncludes: "DeepSeek" },
  { arxivId: "2304.02643", label: "SAM", titleIncludes: "Segment Anything" }
] as const;

export type ExampleArxivPaper = (typeof EXAMPLE_ARXIV_PAPERS)[number];

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year?: number;
  venue?: string;
  arxivId?: string;
  doi?: string;
  url?: string;
  citationCount?: number;
  createdAt?: string;
}

export interface AnalysisSection {
  lead: string;
  bullets: string[];
  detail?: string;
}

export interface HypeClaim {
  claim: string;
  hypeLevel: HypeLevel;
  realityCheck: string;
  rating: number;
}

export interface GenealogyEntry {
  title: string;
  authors: string;
  year: number;
  contribution: string;
  confidence?: "confirmed" | "inferred";
}

export interface ResearchGap {
  title: string;
  category: string;
  description: string;
  evidence: string;
  opportunity: string;
  impact: string;
  difficulty: string;
}

export interface AnalysisFlashcard {
  front: string;
  back: string;
  hint?: string;
  category: string;
  difficulty: string;
}

export interface FutureDirection {
  title: string;
  description: string;
}

export interface InterviewQA {
  question: string;
  answer: string;
}

export interface RoadmapNodeSimple {
  title: string;
  description: string;
  difficulty: RoadmapDifficulty;
}

export interface StarterCodeBlock {
  lang: string;
  code: string;
  explanation: string;
}

export interface CitationNode {
  id: string;
  title: string;
  authors: string;
  year: number;
  type: CitationNodeType;
  citationCount: number;
}

export interface CitationEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface Analysis {
  schemaVersion: number;
  paperId: string;
  headline: string;
  tldr: string;
  problem: AnalysisSection;
  novelty: AnalysisSection;
  method: AnalysisSection;
  results: AnalysisSection;
  limitations: AnalysisSection;
  verdict: AnalysisSection;
  researchImpact: AnalysisSection;
  industryRelevance: AnalysisSection;
  difficulty: number;
  hypeScore: number;
  impactScore: number;
  industryScore: number;
  readingTimeMinutes: number;
  reproducibilityScore: number;
  student: {
    beginner: string;
    intermediate: string;
    research: string;
    prerequisites: string[];
  };
  quiz: Array<{ question: string; answer: string }>;
  eli5: {
    eli5: string;
    eli12: string;
    eliUndergrad: string;
    eliPhD: string;
  };
  flashcards: AnalysisFlashcard[];
  gaps: {
    gaps: ResearchGap[];
    openQuestions: string[];
    futureDirections: FutureDirection[];
  };
  citations: {
    nodes: CitationNode[];
    edges: CitationEdge[];
  };
  genealogy: {
    ancestors: GenealogyEntry[];
    descendants: GenealogyEntry[];
  };
  hypeClaims: HypeClaim[];
  roadmap: RoadmapNodeSimple[];
  interviewQA: InterviewQA[];
  starterCode: StarterCodeBlock[];
}

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  level: number;
}

export interface RelatedPaper {
  paper: Paper;
  score: number;
  reason: string;
  kind: "similar" | "foundational" | "follow-up";
}

export interface ComparisonRow {
  paperId: string;
  title: string;
  novelty: number;
  performance: number;
  efficiency: number;
  difficulty: number;
  impact: number;
  citationPotential: number;
  summary: string;
}

export interface AnalyzeRequest {
  inputType: InputKind;
  value: string;
  title?: string;
  studentMode?: StudentMode;
}

export interface AnalyzeResponse {
  paper: Paper;
  analysis: Analysis;
}

export type AnalysisExport = AnalyzeResponse;

export function toAnalysisExport({ paper, analysis }: AnalyzeResponse): AnalysisExport {
  const { createdAt: _createdAt, ...publicPaper } = paper;
  return { paper: publicPaper, analysis };
}

export interface SearchResult {
  paper: Paper;
  score: number;
  highlights: string[];
}

export const ANALYSIS_SCORE_KEYS = [
  "difficulty",
  "hypeScore",
  "readingTimeMinutes",
  "reproducibilityScore",
  "impactScore",
  "industryScore"
] as const;

export function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function estimatePaperReadingMinutes(paper: Paper): number {
  const abstractMinutes = readingTime(paper.abstract);
  const isPublished = Boolean(paper.arxivId || paper.doi || paper.id.startsWith("arxiv:") || paper.id.startsWith("doi:"));
  const floor = isPublished ? 12 : 8;
  return Math.max(floor, Math.ceil(abstractMinutes * 4));
}

export function isCurrentAnalysis(analysis: Analysis | null): analysis is Analysis {
  return !!analysis && analysis.schemaVersion === ANALYSIS_SCHEMA_VERSION;
}

export function detectDomain(title: string, abstract: string = ""): SubjectDomain {
  const text = `${title} ${abstract}`.toLowerCase();

  const scores: Record<Exclude<SubjectDomain, "general">, number> = {
    cs: 0,
    math: 0,
    biology: 0,
    chemistry: 0,
    physics: 0
  };

  const keywords: Record<Exclude<SubjectDomain, "general">, string[]> = {
    cs: [
      "transformer", "attention mechanism", "deep learning", "machine learning",
      "neural network", "language model", "reinforcement learning", "pytorch",
      "tensorflow", "cuda", "gpu", "nlp", "computer vision", "diffusion model",
      "autoencoder", "fine-tuning", "pretraining", "large language", "self-attention",
      "convolutional neural", "recurrent neural", "gradient descent", "backpropagation",
      "bert", "gpt", "resnet", "vit", "state space model", "mamba", "lora",
      "algorithm", "compiler", "operating system", "distributed system", "database",
      "cryptography", "graph neural", "object detection", "semantic segmentation",
      "knowledge graph", "embedding", "tokenizer", "softmax", "optimizer"
    ],
    math: [
      "theorem", "proof", "lemma", "corollary", "conjecture", "topology",
      "algebraic", "manifold", "prime number", "combinatorics", "differential equation",
      "number theory", "calculus", "geometry", "group theory", "linear algebra",
      "stochastic", "probability distribution", "optimization", "graph theory"
    ],
    biology: [
      "crispr", "dna", "rna", "gene", "cas9", "endonuclease", "pathogen", "plasmid",
      "genome", "protein", "cellular", "organism", "mitochondrial", "transcription",
      "translation", "mutation", "ecology", "evolutionary", "bioinformatics", "cloning"
    ],
    chemistry: [
      "molecule", "organic", "synthesis", "catalyst", "polymer", "chemical", "covalent",
      "molecular", "spectroscopy", "reaction", "compound", "solvent", "thermodynamics",
      "kinetics", "atom", "electrochemistry", "biochemistry", "inorganic", "peptide"
    ],
    physics: [
      "quantum", "relativity", "mechanics", "thermodynamics", "laser", "particle",
      "plasma", "galaxy", "astronomy", "cosmology", "electromagnetism", "gravity",
      "superconductivity", "optical", "fluid dynamics", "solid-state", "nuclear", "semiconductor"
    ]
  };

  Object.entries(keywords).forEach(([domain, words]) => {
    words.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "g");
      const matches = text.match(regex);
      if (matches) {
        scores[domain as Exclude<SubjectDomain, "general">] += matches.length;
      }
    });
  });

  let maxDomain: SubjectDomain = "general";
  let maxScore = 0;
  Object.entries(scores).forEach(([domain, score]) => {
    if (score > maxScore) {
      maxScore = score;
      maxDomain = domain as SubjectDomain;
    }
  });

  return maxDomain;
}

export function sectionToMarkdown(title: string, section: AnalysisSection): string {
  const lines = [`## ${title}`, "", section.lead, ""];
  if (section.bullets.length > 0) {
    lines.push(...section.bullets.map((b) => `- ${b}`), "");
  }
  if (section.detail) {
    lines.push(section.detail, "");
  }
  return lines.join("\n");
}
