import { useState } from "react";
import { ArrowLeft, Bookmark, Check, ClipboardCopy, Download, Sparkles } from "lucide-react";
import type { AnalyzeResponse } from "@decodoc/shared";
import { HeadlineBanner } from "../components/analysis/AnalysisViews";
import { DomainBadge } from "../components/paper/DomainBadge";
import { ResultsTabs } from "../components/paper/ResultsTabs";
import type { ResultsTab } from "../lib/app-utils";
import { downloadAnalysisJson, downloadAnalysisMarkdown } from "../lib/export";

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
  isBookmarked: boolean;
  onBack: () => void;
  onToggleBookmark: () => void;
};

export function PaperDetailPage({ result, isBookmarked, onBack, onToggleBookmark }: PaperDetailPageProps) {
  const [activeTab, setActiveTab] = useState<ResultsTab>("summary");
  const [copied, setCopied] = useState(false);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(result.analysis.tldr);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context or denied permission).
    }
  };

  return (
    <div className="mx-auto flex min-w-0 max-w-6xl flex-col gap-8 px-4 py-12 md:py-20">
      <div className="paper-toolbar">
        <button type="button" className="paper-toolbar-btn" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span>Library</span>
        </button>
        <div className="paper-toolbar-actions">
          <button type="button" className="paper-toolbar-btn" onClick={() => void copySummary()} aria-label="Copy TL;DR">
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <ClipboardCopy className="h-4 w-4" aria-hidden />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <button
            type="button"
            className="paper-toolbar-btn"
            onClick={() => downloadAnalysisJson(result)}
            aria-label="Export JSON"
          >
            <Download className="h-4 w-4" aria-hidden />
            <span>JSON</span>
          </button>
          <button
            type="button"
            className="paper-toolbar-btn"
            onClick={() => downloadAnalysisMarkdown(result)}
            aria-label="Export Markdown"
          >
            <Download className="h-4 w-4" aria-hidden />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            className={`paper-toolbar-btn ${isBookmarked ? "is-active" : ""}`}
            onClick={onToggleBookmark}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark paper"}
            aria-pressed={isBookmarked}
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
        <p className="mt-3 text-caption text-[var(--color-fossil-gray)]">
          Difficulty, hype, impact, and reproducibility are model estimates from the paper text.
        </p>
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

      <ResultsTabs result={result} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
