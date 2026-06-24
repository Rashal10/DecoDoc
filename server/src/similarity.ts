import type { RelatedPaper, SearchResult } from "@decodoc/shared";
import type { Paper } from "@decodoc/shared";

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

export function rankPapers<T extends Paper & { embedding: number[] }>(
  embedding: number[],
  papers: T[],
  excludeId?: string,
  limit = 8
): Array<T & { score: number }> {
  return papers
    .filter((paper) => paper.id !== excludeId)
    .map((paper) => ({ ...paper, score: cosine(embedding, paper.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function publicPaper(row: Paper & { embedding?: number[] }): Paper {
  const { embedding, ...paper } = row;
  void embedding;
  return paper;
}

export function toSearchResults(rows: Array<Paper & { score: number; embedding?: number[] }>): SearchResult[] {
  return rows.map(({ score, ...paper }) => ({
    paper: publicPaper(paper),
    score,
    highlights: [paper.abstract.slice(0, 180)]
  }));
}

export function toRelated(rows: Array<Paper & { score: number; embedding?: number[] }>): RelatedPaper[] {
  return rows.map(({ score, ...paper }, index) => ({
    paper: publicPaper(paper),
    score,
    reason: score > 0.82 ? "Strong embedding overlap in methods and concepts." : "Shares topic-level semantic structure.",
    kind: index === 0 ? "similar" : index % 3 === 0 ? "foundational" : "follow-up"
  }));
}
