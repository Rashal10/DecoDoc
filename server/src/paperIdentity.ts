import type { Analysis, Paper } from "@decodoc/shared";
import { EXAMPLE_ARXIV_PAPERS } from "@decodoc/shared";

export function normalizeArxivId(value: string): string | null {
  const raw = value.trim().replace(/^arxiv:/i, "");
  const match = raw.match(/^([0-9]{4}\.[0-9]{4,5}|[a-z-]+\/[0-9]{7})(?:v\d+)?$/i);
  return match?.[1] ?? null;
}

export function normalizeDoi(value: string): string | null {
  const raw = value.trim().replace(/^doi:/i, "");
  if (!raw.includes("/") && !raw.startsWith("10.")) return null;
  return raw.toLowerCase();
}

export function papersMatchIdentity(a: Paper, b: Paper): boolean {
  if (a.id === b.id) return true;

  const aArxiv = a.arxivId ? normalizeArxivId(a.arxivId) : null;
  const bArxiv = b.arxivId ? normalizeArxivId(b.arxivId) : null;
  if (aArxiv && bArxiv && aArxiv === bArxiv) return true;

  const aDoi = a.doi ? normalizeDoi(a.doi) : null;
  const bDoi = b.doi ? normalizeDoi(b.doi) : null;
  if (aDoi && bDoi && aDoi === bDoi) return true;

  return false;
}

export function assertAnalyzePairing(paper: Paper, analysis: Analysis): void {
  if (analysis.paperId !== paper.id) {
    throw new Error(
      `Analysis belongs to ${analysis.paperId}, but the resolved paper is ${paper.id} (${paper.title}).`
    );
  }
}

export function lookupMatchesPaper(lookup: string, paper: Paper): boolean {
  const trimmed = lookup.trim();
  if (trimmed === paper.id) return true;

  const arxiv = normalizeArxivId(trimmed);
  if (arxiv && paper.arxivId && normalizeArxivId(paper.arxivId) === arxiv) return true;
  if (arxiv && paper.id === `arxiv:${arxiv}`) return true;

  const doi = normalizeDoi(trimmed);
  if (doi && paper.doi && normalizeDoi(paper.doi) === doi) return true;
  if (doi && paper.id === `doi:${doi}`) return true;

  return false;
}

export function validateResolvedArxivPaper(paper: Paper): void {
  const arxivId = paper.arxivId ? normalizeArxivId(paper.arxivId) : null;
  if (!arxivId) return;

  const example = EXAMPLE_ARXIV_PAPERS.find((entry) => entry.arxivId === arxivId);
  if (!example) return;

  const title = paper.title.toLowerCase();
  const needle = example.titleIncludes.toLowerCase();
  if (!title.includes(needle)) {
    throw new Error(
      `arXiv:${arxivId} resolved to "${paper.title}", but the "${example.label}" example expects a title containing "${example.titleIncludes}".`
    );
  }
}
