import { useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardCopy, Compass } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AnalyzeResponse, StudentMode } from "@decodoc/shared";
import { detectDomain } from "@decodoc/shared";
import { AnimatedTabs } from "../ui/aceternity/animated-tabs";
import type { ResultsTab } from "../../lib/app-utils";
import {
  AnalysisSectionView,
  CitationPaperCard,
  difficultyBadgeClass,
  ExplainItPanel,
  FlashcardDeck,
  FutureDirectionsList,
  GenealogyCard,
  HypeClaimCard,
  InterviewAccordion,
  OpenQuestionsList,
  ProseBlock,
  ResearchGapCard,
  VerdictBadge,
} from "../analysis/AnalysisViews";

function TabEmpty({ icon: Icon, title, text }: { icon: typeof BookOpen; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] p-10 text-center">
      <Icon className="mb-4 h-10 w-10 text-[var(--color-fossil-gray)]" aria-hidden />
      <h3 className="text-body-lg font-semibold mb-1">{title}</h3>
      <p className="text-caption text-[var(--color-fossil-gray)]">{text}</p>
    </div>
  );
}

export type ResultsTabsProps = {
  result: AnalyzeResponse;
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
  studentMode: StudentMode;
  setStudentMode: (mode: StudentMode) => void;
  scoreData: { metric: string; value: number }[];
  readingPlan: { title: string; time: string; detail: string }[];
  eli5Level: number;
  setEli5Level: (l: number) => void;
};

export function ResultsTabs({
  result,
  activeTab,
  onTabChange,
  studentMode,
  setStudentMode,
  scoreData,
  readingPlan,
  eli5Level,
  setEli5Level,
}: ResultsTabsProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const analysis = result.analysis;
  const domain = detectDomain(result.paper.title, result.paper.abstract ?? "");
  const isCS = domain === "cs" && analysis.starterCode.length > 0;

  const tabs = useMemo(() => {
    const base = [
      { id: "summary" as const, label: "Summary & Plan" },
      { id: "eli5" as const, label: "Explain It" },
      { id: "flashcards" as const, label: "Flashcards" },
      { id: "gaps" as const, label: "Gap Finder" },
      { id: "citations" as const, label: "Citation Map" },
      { id: "genealogy" as const, label: "Prior Work" },
      ...(isCS ? [{ id: "code" as const, label: "Starter Code" }] : []),
      { id: "hype" as const, label: "Hype Radar" },
      { id: "roadmap" as const, label: "Roadmap" },
      { id: "interview" as const, label: "Interview Q&A" },
    ];
    return base;
  }, [isCS]);

  useEffect(() => {
    if (!isCS && activeTab === "code") onTabChange("summary");
  }, [isCS, activeTab, onTabChange]);

  const eli5Texts = [analysis.eli5.eli5, analysis.eli5.eli12, analysis.eli5.eliUndergrad, analysis.eli5.eliPhD];
  const starterCode = analysis.starterCode[0];

  const studentText =
    studentMode === "beginner"
      ? analysis.student.beginner
      : studentMode === "intermediate"
        ? analysis.student.intermediate
        : analysis.student.research;

  return (
    <div className="surface-panel p-6 md:p-8">
      <AnimatedTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        ariaLabel="Analysis results"
        className="results-tabs-sticky mb-8"
      />

      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === "summary" && (
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <AnalysisSectionView title="Problem" section={analysis.problem} />
              <AnalysisSectionView title="Novelty" section={analysis.novelty} />
              <AnalysisSectionView title="Method" section={analysis.method} />
              <AnalysisSectionView title="Results" section={analysis.results} />
              <AnalysisSectionView title="Limitations" section={analysis.limitations} />
              <div className="relative">
                <div className="absolute top-4 right-4 z-10">
                  <VerdictBadge lead={analysis.verdict.lead} />
                </div>
                <AnalysisSectionView title="Verdict" section={analysis.verdict} highlight />
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <AnalysisSectionView title="Research Impact" section={analysis.researchImpact} accent="border-[var(--color-signal-blue)]/30" />
              <AnalysisSectionView title="Industry Relevance" section={analysis.industryRelevance} accent="border-emerald-300/40" />
            </div>
            <div className="border-t border-[var(--color-border)] pt-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-subheading font-semibold">For Students</h3>
                <div className="flex gap-2" role="group" aria-label="Student level">
                  {(["beginner", "intermediate", "research"] as StudentMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`glass-tab px-3 py-1.5 text-caption font-semibold capitalize ${studentMode === mode ? "glass-tab-active" : ""}`}
                      onClick={() => setStudentMode(mode)}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div className="surface-card mb-4 p-5 prose-reading">
                <ProseBlock text={studentText} />
              </div>
              {analysis.student.prerequisites.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {analysis.student.prerequisites.map((prereq, idx) => (
                    <span key={idx} className="rounded-full bg-[var(--color-signal-blue)]/10 px-3 py-1 text-caption font-medium text-[var(--color-signal-blue)]">
                      {prereq}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {analysis.quiz.length > 0 && (
              <div className="border-t border-[var(--color-border)] pt-6">
                <h3 className="text-subheading font-semibold mb-4">Quick Quiz</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {analysis.quiz.map((item, idx) => (
                    <div key={idx} className="surface-card p-4">
                      <p className="font-semibold text-body mb-2">{item.question}</p>
                      <p className="text-caption text-[var(--color-fossil-gray)]">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-[var(--color-border)] pt-6">
              <h3 className="text-subheading font-semibold mb-4">Expert Reading Plan</h3>
              <div className="grid gap-4 md:grid-cols-4">
                {readingPlan.map((step, idx) => (
                  <div key={idx} className="surface-card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold text-body">{step.title}</span>
                      <span className="text-caption font-semibold text-[var(--color-signal-blue)]">{step.time}</span>
                    </div>
                    <p className="text-caption text-[var(--color-fossil-gray)] leading-relaxed">{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "genealogy" && (
          <div className="space-y-6">
            <p className="text-body text-[var(--color-fossil-gray)]">
              Foundational papers this work builds on. For related follow-up work, use the Citation Map tab.
            </p>
            {analysis.genealogy.ancestors.length === 0 ? (
              <p className="text-body italic text-[var(--color-fossil-gray)]">No prior work identified from the abstract.</p>
            ) : (
              <div className="space-y-4">
                {analysis.genealogy.ancestors.map((anc, idx) => (
                  <GenealogyCard key={idx} entry={anc} variant="ancestor" />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "eli5" && <ExplainItPanel texts={eli5Texts} level={eli5Level} onLevelChange={setEli5Level} />}

        {activeTab === "flashcards" && (
          <div className="space-y-6">
            <h3 className="text-subheading font-semibold">Interactive Flashcards</h3>
            {analysis.flashcards.length === 0 ? (
              <TabEmpty icon={BookOpen} title="No flashcards" text="Flashcards will appear here after analysis." />
            ) : (
              <FlashcardDeck cards={analysis.flashcards} />
            )}
          </div>
        )}

        {activeTab === "gaps" && (
          <div className="space-y-8">
            <div>
              <h3 className="text-subheading font-semibold mb-1">Research Gaps</h3>
              <p className="text-caption text-[var(--color-fossil-gray)] mb-6">
                Unresolved limitations and concrete projects worth pursuing.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 font-semibold text-body-lg text-[var(--color-pumpkin-orange)]">
                <Compass className="h-5 w-5" aria-hidden /> Key Gaps
              </h4>
              {analysis.gaps.gaps.map((gap, idx) => (
                <ResearchGapCard key={idx} gap={gap} index={idx} />
              ))}
            </div>
            {analysis.gaps.openQuestions.length > 0 && (
              <div className="border-t border-[var(--color-border)] pt-8">
                <h4 className="font-semibold text-body-lg text-[var(--color-signal-blue)] mb-4">Open Questions</h4>
                <OpenQuestionsList questions={analysis.gaps.openQuestions} />
              </div>
            )}
            {analysis.gaps.futureDirections.length > 0 && (
              <div className="border-t border-[var(--color-border)] pt-8">
                <h4 className="font-semibold text-body-lg mb-4">Future Directions</h4>
                <FutureDirectionsList directions={analysis.gaps.futureDirections} />
              </div>
            )}
          </div>
        )}

        {activeTab === "citations" && (
          <div className="space-y-8">
            <div>
              <h3 className="text-subheading font-semibold mb-1">Citation Network</h3>
              <p className="text-caption text-[var(--color-fossil-gray)]">
                References and citing works from Semantic Scholar and OpenAlex.
              </p>
            </div>
            {!result.paper.doi && !result.paper.arxivId && (
              <p className="text-caption text-[var(--color-fossil-gray)] rounded-xl border border-[var(--color-border)] bg-[var(--color-blush-paper)] px-4 py-3">
                This paper was uploaded without a DOI or arXiv ID, so bibliographic databases cannot build a citation map.
                Re-analyze using an arXiv ID or DOI for full citation data.
              </p>
            )}
            <div>
              <h4 className="font-semibold text-body-lg text-[var(--color-signal-blue)] mb-4">Foundational References</h4>
              <div className="space-y-3">
                {analysis.citations.nodes.filter((n) => n.type === "reference").length === 0 ? (
                  <p className="text-caption italic text-[var(--color-fossil-gray)]">
                    {result.paper.doi || result.paper.arxivId
                      ? "No references found in Semantic Scholar or OpenAlex for this paper."
                      : "Bibliography not indexed yet."}
                  </p>
                ) : (
                  analysis.citations.nodes
                    .filter((n) => n.type === "reference")
                    .map((node) => <CitationPaperCard key={node.id} node={node} accent="blue" />)
                )}
              </div>
            </div>
            <div className="border-t border-[var(--color-border)] pt-6">
              <h4 className="font-semibold text-body-lg text-[var(--color-pumpkin-orange)] mb-4">Influenced Works</h4>
              <div className="space-y-3">
                {analysis.citations.nodes.filter((n) => n.type === "citation").length === 0 ? (
                  <p className="text-caption italic text-[var(--color-fossil-gray)]">
                    {result.paper.doi || result.paper.arxivId
                      ? "No citing papers found in Semantic Scholar or OpenAlex yet."
                      : "No citing papers found yet."}
                  </p>
                ) : (
                  analysis.citations.nodes
                    .filter((n) => n.type === "citation")
                    .map((node) => <CitationPaperCard key={node.id} node={node} accent="orange" />)
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "code" && starterCode && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-subheading font-semibold">Starter Code ({starterCode.lang})</h3>
              <button
                type="button"
                className="glass-button"
                onClick={() => {
                  navigator.clipboard.writeText(starterCode.code);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 3500);
                }}
                aria-label="Copy code"
              >
                <ClipboardCopy className="h-4 w-4" aria-hidden />
                {codeCopied ? "Copied!" : "Copy Code"}
              </button>
            </div>
            <p className="text-body text-[var(--color-fossil-gray)]">{starterCode.explanation}</p>
            <pre className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-5 font-mono text-xs text-slate-100">
              <code>{starterCode.code}</code>
            </pre>
          </div>
        )}

        {activeTab === "hype" && (
          <div className="space-y-6">
            <h3 className="text-subheading font-semibold">Hype vs Substance</h3>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                {analysis.hypeClaims.map((claim, idx) => (
                  <HypeClaimCard key={idx} claim={claim} index={idx} />
                ))}
              </div>
              <div className="surface-card flex flex-col items-center p-6">
                <h4 className="mb-4 self-start font-semibold text-body-lg">Credibility Compass</h4>
                <div className="aspect-square w-full max-w-[min(100%,320px)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={scoreData}>
                      <PolarGrid stroke="rgba(0,0,0,0.08)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--color-carbon-ink)", fontSize: 11, fontWeight: 600 }} />
                      <Radar name="Score" dataKey="value" stroke="var(--color-pumpkin-orange)" fill="var(--color-pumpkin-orange)" fillOpacity={0.25} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "roadmap" && (
          <div className="space-y-6">
            <h3 className="text-subheading font-semibold">Prerequisite Learning Roadmap</h3>
            {analysis.roadmap.map((node, index) => (
              <div key={index} className="flex gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-carbon-ink)] text-caption font-bold text-white">
                    {index + 1}
                  </div>
                  {index < analysis.roadmap.length - 1 && <div className="mt-2 w-0.5 flex-1 bg-[var(--color-border-strong)]" />}
                </div>
                <div className="surface-card mb-2 flex-1 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-semibold text-body">{node.title}</span>
                    <span className={`gap-difficulty-badge ${difficultyBadgeClass(node.difficulty)}`}>
                      {node.difficulty}
                    </span>
                  </div>
                  <p className="text-caption text-[var(--color-fossil-gray)]">{node.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "interview" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-subheading font-semibold mb-1">Expert Interview Q&A</h3>
              <p className="text-caption text-[var(--color-fossil-gray)]">
                Tough questions a reviewer might ask — tap to reveal each answer.
              </p>
            </div>
            <InterviewAccordion items={analysis.interviewQA} />
          </div>
        )}
      </div>
    </div>
  );
}
