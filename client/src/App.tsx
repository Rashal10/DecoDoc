import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AnalyzeResponse, Paper, StudentMode } from "@decodoc/shared";
import { toAnalysisExport, sectionToMarkdown } from "@decodoc/shared";
import {
  api,
  ANALYSIS_CANCELLED,
  ANALYZE_TIMEOUT_MS,
  PDF_UPLOAD_TIMEOUT_MS,
  ApiError,
  beginAnalysisSession,
  cancelActiveAnalysis,
  clearPendingAnalysis,
  endAnalysisSession,
  loadPendingAnalysis,
  savePendingAnalysis,
  type UsageStatus,
} from "./lib/api";
import { useAuth } from "./lib/auth-context";
import { extractPdfText } from "./lib/pdf";
import { getRecents, getSaved, mergeBookmarksOnLogin, saveRecent, toggleSaved } from "./lib/storage";
import { LoginRequiredModal } from "./components/auth/LoginRequiredModal";
import { AnalysisLoadingOverlay } from "./components/ui/analysis-loading-overlay";
import { AppShell } from "./layouts/AppShell";
import { HomePage } from "./pages/HomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { PaperDetailPage } from "./pages/PaperDetailPage";
import {
  LOADING_MESSAGES,
  type ActivePage,
  type BusyStage,
  type InputMode,
  type ResultsTab,
  extractRequestedArxivId,
  friendlyError,
  samePaper,
  slugify,
  waitFrame,
} from "./lib/app-utils";

function verifyAnalyzeResponse(mode: InputMode, value: string, response: AnalyzeResponse): void {
  if (mode !== "arxiv") return;
  const requested = extractRequestedArxivId(value);
  const resolved = response.paper.arxivId ? extractRequestedArxivId(response.paper.arxivId) : null;
  if (requested && resolved && requested !== resolved) {
    throw new Error(
      `Server returned a different paper (${response.paper.title}) than requested (arXiv:${requested}). Please retry.`
    );
  }
}

type AuthProps = {
  isSignedIn: boolean;
};

export function App() {
  const { isSignedIn } = useAuth();
  return <AppContent isSignedIn={isSignedIn} />;
}

function AppContent({ isSignedIn }: AuthProps) {
  const [mode, setMode] = useState<InputMode>("arxiv");
  const [value, setValue] = useState("1706.03762");
  const [pdf, setPdf] = useState<File | null>(null);
  const [abstractTitle, setAbstractTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<BusyStage>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [studentMode, setStudentMode] = useState<StudentMode>("beginner");
  const [saved, setSaved] = useState<Paper[]>([]);
  const [recents, setRecents] = useState<AnalyzeResponse[]>([]);
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>("summary");
  const [msgIdx, setMsgIdx] = useState(0);
  const [activePage, setActivePage] = useState<ActivePage>("home");
  const [eli5Level, setEli5Level] = useState(0);
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const requestSeq = useRef(0);
  const pendingRetryRef = useRef(false);

  const refreshUsage = useCallback(async () => {
    try {
      setUsage(await api.usage());
    } catch {
      // API may be offline during local dev without Postgres
    }
  }, []);

  useEffect(() => {
    void refreshLocal();
    void refreshUsage();
  }, [refreshUsage]);

  useEffect(() => {
    if (!isSignedIn) return;
    void (async () => {
      try {
        const bookmarks = await mergeBookmarksOnLogin();
        setSaved(bookmarks);
        await refreshUsage();
        if (pendingRetryRef.current) {
          pendingRetryRef.current = false;
          const pending = loadPendingAnalysis();
          if (pending) {
            clearPendingAnalysis();
            setMode(pending.mode as InputMode);
            setValue(pending.value);
            if (pending.abstractTitle) setAbstractTitle(pending.abstractTitle);
            void analyzeInternal(pending.mode as InputMode, pending.value, pending.abstractTitle);
          }
        }
      } catch {
        // Bookmark sync failed — local library still works
      }
    })();
  }, [isSignedIn]);

  useEffect(() => {
    if (!busy) return;
    setMsgIdx(0);
    const id = setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3200);
    return () => clearInterval(id);
  }, [busy]);

  async function refreshLocal() {
    setSaved(await getSaved());
    setRecents(await getRecents());
  }

  async function openPaperDetail(paper: Paper) {
    const seq = ++requestSeq.current;
    setBusy(true);
    setError("");
    setResult(null);
    beginAnalysisSession(ANALYZE_TIMEOUT_MS);
    try {
      const res = await api.paper(paper.id);
      if (seq !== requestSeq.current) return;
      if (!samePaper(res.paper, paper)) {
        throw new Error(`Loaded the wrong paper (${res.paper.title}). Please retry.`);
      }
      if (!res.analysis) {
        setError("Analysis not found for this paper.");
        return;
      }
      const fullResponse: AnalyzeResponse = { paper: res.paper, analysis: res.analysis };
      setResult(fullResponse);
      setActivePage("paper-detail");
      setActiveResultsTab("summary");
      await saveRecent(fullResponse);
      await refreshLocal();
    } catch (err) {
      if (seq !== requestSeq.current) return;
      if (err instanceof Error && err.message === ANALYSIS_CANCELLED) return;
      setError(err instanceof Error ? friendlyError(err.message) : "Failed to load paper details");
    } finally {
      endAnalysisSession();
      if (seq === requestSeq.current) setBusy(false);
    }
  }

  function stopAnalysis() {
    ++requestSeq.current;
    cancelActiveAnalysis();
    endAnalysisSession();
    setBusy(false);
    setStage("idle");
  }

  async function analyzeInternal(
    analyzeMode: InputMode,
    analyzeValue: string,
    analyzeAbstractTitle?: string,
    analyzePdf?: File | null
  ) {
    const seq = ++requestSeq.current;
    setBusy(true);
    setError("");
    setResult(null);
    const timeout = analyzeMode === "pdf" ? PDF_UPLOAD_TIMEOUT_MS : ANALYZE_TIMEOUT_MS;
    const signal = beginAnalysisSession(timeout);
    try {
      let response: AnalyzeResponse;
      if (analyzeMode === "pdf" && analyzePdf) {
        setStage("extracting");
        const text = await extractPdfText(analyzePdf, signal);
        if (seq !== requestSeq.current) return;
        setStage("analyzing");
        response = await api.uploadPdf(analyzePdf, text);
      } else {
        setStage(analyzeMode === "abstract" ? "embedding" : "fetching");
        await waitFrame();
        if (seq !== requestSeq.current) return;
        setStage("analyzing");
        response = await api.analyze(
          analyzeMode,
          analyzeValue,
          analyzeMode === "abstract" ? analyzeAbstractTitle || undefined : undefined
        );
      }
      if (seq !== requestSeq.current) return;
      verifyAnalyzeResponse(analyzeMode, analyzeValue, response);
      setStage("saving");
      setResult(response);
      await saveRecent(response);
      await refreshLocal();
      await refreshUsage();
      setActivePage("paper-detail");
      setActiveResultsTab("summary");
    } catch (err) {
      if (seq !== requestSeq.current) return;
      if (err instanceof Error && err.message === ANALYSIS_CANCELLED) return;
      if (err instanceof ApiError && err.code === "LOGIN_REQUIRED") {
        savePendingAnalysis({
          mode: analyzeMode,
          value: analyzeValue,
          abstractTitle: analyzeAbstractTitle,
        });
        pendingRetryRef.current = true;
        setLoginModalOpen(true);
        setError(friendlyError(err.message));
        setActivePage("home");
        return;
      }
      setError(err instanceof Error ? friendlyError(err.message) : "Analysis failed");
      setActivePage("home");
    } finally {
      endAnalysisSession();
      if (seq === requestSeq.current) {
        setBusy(false);
        setStage("idle");
      }
    }
  }

  async function analyze() {
    await analyzeInternal(mode, value, abstractTitle, pdf);
  }

  function copySummary() {
    if (!result) return;
    void navigator.clipboard.writeText(result.analysis.tldr);
  }

  function downloadAnalysis() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(toAnalysisExport(result), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(result.paper.title)}-decodoc.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportMarkdown() {
    if (!result) return;
    const a = result.analysis;
    const content = `# ${result.paper.title}

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
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(result.paper.title)}-analysis.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const scoreData = useMemo(() => {
    if (!result) return [];
    return [
      { metric: "Difficulty", value: result.analysis.difficulty },
      { metric: "Hype", value: result.analysis.hypeScore },
      { metric: "Reading Time", value: result.analysis.readingTimeMinutes },
      { metric: "Repro", value: result.analysis.reproducibilityScore },
      { metric: "Industry", value: result.analysis.industryScore },
      { metric: "Impact", value: result.analysis.impactScore },
    ];
  }, [result]);

  const readingPlan = useMemo(() => {
    if (!result) return [];
    const t = result.analysis.readingTimeMinutes;
    const difficulty = result.analysis.difficulty;
    const reproducibilityScore = result.analysis.reproducibilityScore;
    return [
      { title: "Skim", time: `${Math.max(2, Math.round(t * 0.15))} min`, detail: "Read TLDR, problem, novelty, and verdict first." },
      { title: "Deep read", time: `${Math.max(10, Math.round(t * (1.2 + (difficulty / 100) * 1.5)))} min`, detail: "Focus on method, assumptions, evaluation, and limitations." },
      { title: "Validate", time: `${Math.max(5, Math.round(10 + (100 - reproducibilityScore) * 0.2))} min`, detail: "Check datasets, baselines, code availability, and reproducibility risk." },
      { title: "Apply", time: `${Math.max(10, Math.round(15 + difficulty * 0.25))} min`, detail: "Translate the method into implementation notes or an experiment plan." },
    ];
  }, [result]);

  return (
    <div className="relative min-h-screen bg-[var(--color-blush-paper)] font-sans text-[var(--color-carbon-ink)]">
      <AppShell activePage={activePage} onNavigate={setActivePage} usage={usage}>
        {activePage === "home" && (
          <HomePage
            mode={mode}
            setMode={setMode}
            value={value}
            setValue={setValue}
            pdf={pdf}
            setPdf={setPdf}
            abstractTitle={abstractTitle}
            setAbstractTitle={setAbstractTitle}
            busy={busy}
            error={error}
            usage={usage}
            isSignedIn={isSignedIn}
            onAnalyze={analyze}
          />
        )}

        {activePage === "library" && (
          <LibraryPage
            saved={saved}
            recents={recents}
            isSignedIn={!!isSignedIn}
            onOpenPaper={openPaperDetail}
            onNavigateHome={() => setActivePage("home")}
          />
        )}

        {activePage === "paper-detail" && result && (
          <PaperDetailPage
            result={result}
            saved={saved}
            activeTab={activeResultsTab}
            onTabChange={setActiveResultsTab}
            studentMode={studentMode}
            setStudentMode={setStudentMode}
            scoreData={scoreData}
            readingPlan={readingPlan}
            eli5Level={eli5Level}
            setEli5Level={setEli5Level}
            onBack={() => setActivePage("library")}
            onCopySummary={copySummary}
            onExportJson={downloadAnalysis}
            onExportMd={exportMarkdown}
            onToggleBookmark={async () =>
              setSaved(await toggleSaved(result.paper, { syncServer: !!isSignedIn }))
            }
          />
        )}
      </AppShell>

      <LoginRequiredModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      <AnalysisLoadingOverlay
        visible={busy}
        messages={LOADING_MESSAGES}
        msgIdx={msgIdx}
        stage={stage}
        onCancel={stopAnalysis}
      />
    </div>
  );
}
