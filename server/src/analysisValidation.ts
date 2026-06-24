import type {
  Analysis,
  AnalysisFlashcard,
  AnalysisSection,
  GenealogyEntry,
  Paper,
  StarterCodeBlock
} from "@decodoc/shared";

export function buildSourceCorpus(paper: Paper): string {
  return `${paper.title}\n${paper.abstract}`.toLowerCase();
}

function corpusContainsNumber(corpus: string, value: string): boolean {
  if (corpus.includes(value)) return true;
  const stripped = value.replace(/\.0+$/, "");
  return stripped !== value && corpus.includes(stripped);
}

function sentenceHasUngroundedClaims(sentence: string, corpus: string): boolean {
  const percentages = sentence.match(/\b\d+(?:\.\d+)?\s*%/g) ?? [];
  for (const pct of percentages) {
    const num = pct.match(/\d+(?:\.\d+)?/)?.[0];
    if (num && !corpusContainsNumber(corpus, num)) return true;
  }

  const metricNumbers = [
    ...(sentence.match(/\b(?:iou|bleu|f1|map|ap|accuracy|recall|precision)\s*(?:of|@|:|=)?\s*(\d+(?:\.\d+)?)/gi) ?? [])
  ];
  for (const match of metricNumbers) {
    const num = match.match(/(\d+(?:\.\d+)?)/)?.[1];
    if (num && !corpusContainsNumber(corpus, num)) return true;
  }

  const standaloneMetrics = sentence.match(/\b\d+(?:\.\d+)?\s*(?:iou|bleu|f1|map)\b/gi) ?? [];
  for (const match of standaloneMetrics) {
    const num = match.match(/\d+(?:\.\d+)?/)?.[0];
    if (num && !corpusContainsNumber(corpus, num)) return true;
  }

  const capsTokens = sentence.match(/\b[A-Z]{5,}\b/g) ?? [];
  for (const token of capsTokens) {
    if (!corpus.includes(token.toLowerCase())) return true;
  }

  return false;
}

export function sanitizeGroundedText(text: string, corpus: string): string {
  if (!text?.trim()) return text ?? "";

  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length === 0) return text.trim();

  const kept = sentences.filter((sentence) => !sentenceHasUngroundedClaims(sentence, corpus));
  if (kept.length === 0) {
    const first = sentences[0] ?? "";
    return sentenceHasUngroundedClaims(first, corpus)
      ? first.replace(/\b\d+(?:\.\d+)?\s*%/g, "").replace(/\b[A-Z]{5,}\b/g, "").replace(/\s{2,}/g, " ").trim()
      : first;
  }
  return kept.join(" ").trim();
}

export function sanitizeSection(section: AnalysisSection, corpus: string): AnalysisSection {
  const bullets = section.bullets
    .map((bullet) => sanitizeGroundedText(bullet, corpus))
    .filter((bullet) => bullet.length > 0);

  const lead = sanitizeGroundedText(section.lead, corpus);
  const detail = section.detail ? sanitizeGroundedText(section.detail, corpus) : undefined;

  return {
    lead: lead || section.lead,
    bullets: bullets.length > 0 ? bullets : section.bullets.map((b) => sanitizeGroundedText(b, corpus)).slice(0, 1),
    detail: detail || undefined
  };
}

export function sanitizeFlashcards(cards: AnalysisFlashcard[], corpus: string): AnalysisFlashcard[] {
  return cards.filter((card) => {
    const back = card.back ?? "";
    if (!back.trim()) return false;
    if (card.category === "Results" && sentenceHasUngroundedClaims(back, corpus)) return false;
    return !sentenceHasUngroundedClaims(back, corpus);
  }).map((card) => ({
    ...card,
    back: sanitizeGroundedText(card.back, corpus),
    front: sanitizeGroundedText(card.front, corpus)
  }));
}

export function sanitizeQaPairs<T extends { question: string; answer: string }>(pairs: T[], corpus: string): T[] {
  return pairs
    .map((pair) => ({
      ...pair,
      question: sanitizeGroundedText(pair.question, corpus),
      answer: sanitizeGroundedText(pair.answer, corpus)
    }))
    .filter((pair) => pair.question.length > 0 && pair.answer.length > 0);
}

const STARTER_CODE_TYPO_FIXES: Array<[RegExp, string]> = [
  [/sam_model_ized_registry/g, "sam_model_registry"],
  [/torch\.from_numpy\(/g, "torch.from_numpy("]
];

export function sanitizeStarterCode(blocks: StarterCodeBlock[]): StarterCodeBlock[] {
  return blocks
    .map((block) => {
      let code = block.code ?? "";
      for (const [pattern, replacement] of STARTER_CODE_TYPO_FIXES) {
        code = code.replace(pattern, replacement);
      }
      return { ...block, code };
    })
    .filter((block) => {
      const code = block.code ?? "";
      if (!code.trim()) return false;
      if (/ized_registry|_ized_/.test(code)) return false;
      if (/import\s+\w+\s+from\s+['"][^'"]+['"]/.test(code) === false && code.includes("import ")) {
        return true;
      }
      return true;
    });
}

function isVagueGenealogyEntry(entry: GenealogyEntry): boolean {
  const authors = entry.authors?.trim() ?? "";
  return (
    !entry.title?.trim() ||
    /^various$/i.test(authors) ||
    /^unknown$/i.test(authors) ||
    /^n\/?a$/i.test(authors)
  );
}

export function sanitizeGenealogy(
  genealogy: Analysis["genealogy"],
  paperYear?: number
): Analysis["genealogy"] {
  const referenceYear = paperYear ?? new Date().getFullYear();

  const ancestors = (genealogy?.ancestors ?? [])
    .filter((entry) => !isVagueGenealogyEntry(entry))
    .filter((entry) => !entry.year || entry.year < referenceYear);

  // Descendants are almost always hallucinated — especially for recent papers.
  // Only keep chronologically valid entries for papers at least 2 years old.
  const currentYear = new Date().getFullYear();
  const descendants =
    referenceYear <= currentYear - 2
      ? (genealogy?.descendants ?? [])
          .filter((entry) => !isVagueGenealogyEntry(entry))
          .filter((entry) => entry.year > referenceYear)
      : [];

  return { ancestors, descendants };
}

export function validateAnalysis(analysis: Analysis, paper: Paper): Analysis {
  const corpus = buildSourceCorpus(paper);

  return {
    ...analysis,
    problem: sanitizeSection(analysis.problem, corpus),
    novelty: sanitizeSection(analysis.novelty, corpus),
    method: sanitizeSection(analysis.method, corpus),
    results: sanitizeSection(analysis.results, corpus),
    limitations: sanitizeSection(analysis.limitations, corpus),
    verdict: sanitizeSection(analysis.verdict, corpus),
    researchImpact: sanitizeSection(analysis.researchImpact, corpus),
    industryRelevance: sanitizeSection(analysis.industryRelevance, corpus),
    tldr: sanitizeGroundedText(analysis.tldr, corpus) || analysis.tldr,
    headline: sanitizeGroundedText(analysis.headline, corpus) || analysis.headline,
    student: {
      ...analysis.student,
      beginner: sanitizeGroundedText(analysis.student.beginner, corpus),
      intermediate: sanitizeGroundedText(analysis.student.intermediate, corpus),
      research: sanitizeGroundedText(analysis.student.research, corpus)
    },
    eli5: {
      eli5: sanitizeGroundedText(analysis.eli5.eli5, corpus),
      eli12: sanitizeGroundedText(analysis.eli5.eli12, corpus),
      eliUndergrad: sanitizeGroundedText(analysis.eli5.eliUndergrad, corpus),
      eliPhD: sanitizeGroundedText(analysis.eli5.eliPhD, corpus)
    },
    flashcards: sanitizeFlashcards(analysis.flashcards, corpus),
    quiz: sanitizeQaPairs(analysis.quiz, corpus),
    interviewQA: sanitizeQaPairs(analysis.interviewQA, corpus),
    hypeClaims: analysis.hypeClaims.map((claim) => ({
      ...claim,
      claim: sanitizeGroundedText(claim.claim, corpus),
      realityCheck: sanitizeGroundedText(claim.realityCheck, corpus)
    })),
    gaps: {
      ...analysis.gaps,
      gaps: analysis.gaps.gaps.map((gap) => ({
        ...gap,
        description: sanitizeGroundedText(gap.description, corpus),
        evidence: sanitizeGroundedText(gap.evidence, corpus)
      }))
    },
    genealogy: sanitizeGenealogy(analysis.genealogy, paper.year),
    starterCode: sanitizeStarterCode(analysis.starterCode)
  };
}
