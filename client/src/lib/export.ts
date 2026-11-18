import type { AnalyzeResponse } from "@decodoc/shared";
import { sectionToMarkdown, toAnalysisExport } from "@decodoc/shared";
import { slugify } from "./app-utils";

export function analysisToMarkdown(result: AnalyzeResponse): string {
  const a = result.analysis;
  return `# ${result.paper.title}

**Authors:** ${result.paper.authors.join(", ")}
**Year:** ${result.paper.year ?? "N/A"} | **Venue:** ${result.paper.venue ?? "N/A"}

> ${a.headline}

## TL;DR
${a.tldr}

${sectionToMarkdown("Core Problem", a.problem)}
${sectionToMarkdown("Novelty", a.novelty)}
${sectionToMarkdown("Method", a.method)}
${sectionToMarkdown("Results", a.results)}
${sectionToMarkdown("Limitations", a.limitations)}
${sectionToMarkdown("Verdict", a.verdict)}
${sectionToMarkdown("Research Impact", a.researchImpact)}
${sectionToMarkdown("Industry Relevance", a.industryRelevance)}

## Scores
- Difficulty: ${a.difficulty}/100
- Hype: ${a.hypeScore}/100
- Impact: ${a.impactScore}/100
- Industry: ${a.industryScore}/100
- Reproducibility: ${a.reproducibilityScore}/100
- Reading Time: ${a.readingTimeMinutes} min

## Explain It
- **ELI5:** ${a.eli5.eli5}
- **Age 12:** ${a.eli5.eli12}
- **Undergrad:** ${a.eli5.eliUndergrad}
- **PhD:** ${a.eli5.eliPhD}

## Hype vs Substance
${a.hypeClaims.map((c) => `- **${c.claim}** (${c.hypeLevel}): ${c.realityCheck}`).join("\n")}

## Research Gaps
${a.gaps.gaps.map((g) => `### ${g.title} (${g.category} · ${g.difficulty})
**The gap:** ${g.description}
**Evidence:** ${g.evidence || "N/A"}
**Opportunity:** ${g.opportunity}
**Impact:** ${g.impact || "N/A"}`).join("\n\n")}

## Open Questions
${a.gaps.openQuestions.map((q) => `- ${q}`).join("\n")}

## Future Directions
${a.gaps.futureDirections.map((d) => `- **${d.title}:** ${d.description}`).join("\n")}

## Interview Q&A
${a.interviewQA.map((qa) => `**Q:** ${qa.question}\n**A:** ${qa.answer}`).join("\n\n")}

## Learning Roadmap
${a.roadmap.map((node, i) => `${i + 1}. **${node.title}** (${node.difficulty}) — ${node.description}`).join("\n")}

## Genealogy — Ancestors
${a.genealogy.ancestors.map((e) => `- **${e.title}** (${e.year}): ${e.contribution}`).join("\n")}

## Genealogy — Descendants
${a.genealogy.descendants.map((e) => `- **${e.title}** (${e.year}): ${e.contribution}`).join("\n")}

## Flashcards
${a.flashcards.map((c) => `- **${c.front}**${c.hint ? ` _(hint: ${c.hint})_` : ""} → ${c.back}`).join("\n")}

## Quiz
${a.quiz.map((q) => `**Q:** ${q.question}\n**A:** ${q.answer}`).join("\n\n")}

## For Students
- **Beginner:** ${a.student.beginner}
- **Intermediate:** ${a.student.intermediate}
- **Research:** ${a.student.research}
- **Prerequisites:** ${a.student.prerequisites.join(", ")}
`;
}

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadAnalysisJson(result: AnalyzeResponse) {
  downloadBlob(
    JSON.stringify(toAnalysisExport(result), null, 2),
    "application/json",
    `${slugify(result.paper.title)}-decodoc.json`
  );
}

export function downloadAnalysisMarkdown(result: AnalyzeResponse) {
  downloadBlob(analysisToMarkdown(result), "text/markdown", `${slugify(result.paper.title)}-analysis.md`);
}

export function downloadTextFile(content: string, filename: string, type = "text/plain") {
  downloadBlob(content, type, filename);
}
