import { Bookmark, ClipboardCopy, Download, Sparkles } from "lucide-react";
import type { AnalyzeResponse, Paper, StudentMode } from "@decodoc/shared";
import { HeadlineBanner } from "../components/analysis/AnalysisViews";
import { DomainBadge } from "../components/paper/DomainBadge";
import { ResultsTabs } from "../components/paper/ResultsTabs";
import type { ResultsTab } from "../lib/app-utils";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export type PaperDetailPageProps = {
  result: AnalyzeResponse;
  saved: Paper[];
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
  studentMode: StudentMode;
  setStudentMode: (mode: StudentMode) => void;
  scoreData: { metric: string; value: number }[];
  readingPlan: { title: string; time: string; detail: string }[];
  eli5Level: number;
  setEli5Level: (l: number) => void;
  onBack: () => void;
  onCopySummary: () => void;
  onExportJson: () => void;
  onExportMd: () => void;
  onToggleBookmark: () => void;
};

export function PaperDetailPage({
  result,
  saved,
  activeTab,
  onTabChange,
  studentMode,
  setStudentMode,
  scoreData,
  readingPlan,
  eli5Level,
  setEli5Level,
  onBack,
  onCopySummary,
  onExportJson,
  onExportMd,
  onToggleBookmark,
}: PaperDetailPageProps) {
  const isBookmarked = saved.some((p) => p.id === result.paper.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-20 flex flex-col gap-8">
      <div className="paper-toolbar">
        <button type="button" className="paper-toolbar-btn" onClick={onBack}>
          ← Back
        </button>
        <div className="paper-toolbar-actions">
          <button type="button" className="paper-toolbar-btn" onClick={onCopySummary} aria-label="Copy summary">
            <ClipboardCopy className="h-4 w-4" aria-hidden />
            <span>Copy</span>
          </button>
          <button type="button" className="paper-toolbar-btn" onClick={onExportJson} aria-label="Export JSON">
            <Download className="h-4 w-4" aria-hidden />
            <span>JSON</span>
          </button>
          <button type="button" className="paper-toolbar-btn" onClick={onExportMd} aria-label="Export Markdown">
            <Download className="h-4 w-4" aria-hidden />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            className={`paper-toolbar-btn ${isBookmarked ? "is-active" : ""}`}
            onClick={onToggleBookmark}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark paper"}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} aria-hidden />
            <span>{isBookmarked ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>

      <div className="surface-panel p-6 md:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <DomainBadge title={result.paper.title} abstract={result.paper.abstract} />
          <span className="text-caption font-medium text-[var(--color-fossil-gray)]">
            {result.paper.year ?? "N/A"}
          </span>
        </div>
        <h1 className="text-heading font-semibold tracking-tight mb-4">{result.paper.title}</h1>
        <p className="text-body-lg text-[var(--color-fossil-gray)] leading-relaxed mb-6">
          {result.paper.authors.join(", ")}
        </p>
        <div className="stat-grid border-t border-[var(--color-border)] pt-6">
          <Stat label="Difficulty" value={`${result.analysis.difficulty}/100`} />
          <Stat label="Hype" value={`${result.analysis.hypeScore}/100`} />
          <Stat label="Impact" value={`${result.analysis.impactScore}/100`} />
          <Stat label="Reading" value={`${result.analysis.readingTimeMinutes} min`} />
          <Stat label="Repro" value={`${result.analysis.reproducibilityScore}/100`} />
        </div>
      </div>

      <HeadlineBanner headline={result.analysis.headline} />

      <div className="tldr-block prose-reading">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-pumpkin-orange)]" aria-hidden />
        <div className="space-y-1">
          <span className="text-nano font-bold uppercase tracking-wider text-[var(--color-pumpkin-orange)] block">
            Key TL;DR
          </span>
          <p className="text-body font-medium leading-relaxed">{result.analysis.tldr}</p>
        </div>
      </div>

      <ResultsTabs
        result={result}
        activeTab={activeTab}
        onTabChange={onTabChange}
        studentMode={studentMode}
        setStudentMode={setStudentMode}
        scoreData={scoreData}
        readingPlan={readingPlan}
        eli5Level={eli5Level}
        setEli5Level={setEli5Level}
      />
    </div>
  );
}
