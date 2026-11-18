import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyzeResponse } from "@decodoc/shared";
import {
  api,
  ANALYSIS_CANCELLED,
  ANALYZE_TIMEOUT_MS,
  ApiError,
  beginAnalysisSession,
  cancelActiveAnalysis,
  clearPendingAnalysis,
  endAnalysisSession,
  loadPendingAnalysis,
  PDF_UPLOAD_TIMEOUT_MS,
  savePendingAnalysis,
} from "../lib/api";
import {
  extractRequestedArxivId,
  friendlyError,
  LOADING_MESSAGES,
  waitFrame,
  type BusyStage,
  type InputMode,
} from "../lib/app-utils";
import { extractPdfText } from "../lib/pdf";
import { navigatePage, navigatePaper } from "../lib/routes";

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

type Options = {
  isSignedIn: boolean;
  onResult: (response: AnalyzeResponse) => Promise<void>;
  onUsageChange: () => Promise<void>;
  onLoginRequired: () => void;
};

/** Form state, the analysis request lifecycle, and loading saved papers by id. */
export function useAnalysis({ isSignedIn, onResult, onUsageChange, onLoginRequired }: Options) {
  const [mode, setMode] = useState<InputMode>("arxiv");
  const [value, setValue] = useState("1706.03762");
  const [pdf, setPdf] = useState<File | null>(null);
  const [abstractTitle, setAbstractTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<BusyStage>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const requestSeq = useRef(0);
  const pendingRetryRef = useRef(false);

  // Keep the latest callbacks without re-running effects.
  const callbacks = useRef({ onResult, onUsageChange, onLoginRequired });
  callbacks.current = { onResult, onUsageChange, onLoginRequired };

  useEffect(() => {
    if (!busy) return;
    setMsgIdx(0);
    const id = window.setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 3200);
    return () => window.clearInterval(id);
  }, [busy]);

  const finish = useCallback(async (response: AnalyzeResponse) => {
    setResult(response);
    navigatePaper(response.paper.id);
    await callbacks.current.onResult(response);
  }, []);

  const runAnalysis = useCallback(
    async (analyzeMode: InputMode, analyzeValue: string, analyzeTitle?: string, analyzePdf?: File | null) => {
      const seq = ++requestSeq.current;
      setBusy(true);
      setError("");
      const timeout = analyzeMode === "pdf" ? PDF_UPLOAD_TIMEOUT_MS : ANALYZE_TIMEOUT_MS;
      const signal = beginAnalysisSession(timeout);
      try {
        let response: AnalyzeResponse;
        if (analyzeMode === "pdf" && analyzePdf) {
          setStage("extracting");
          let text = "";
          try {
            text = await extractPdfText(analyzePdf, signal);
          } catch (err) {
            if (signal.aborted || (err instanceof Error && err.message === ANALYSIS_CANCELLED)) throw err;
            console.warn("Browser PDF text extraction failed. The server will read the file.", err);
          }
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
            analyzeMode === "abstract" ? analyzeTitle || undefined : undefined
          );
        }
        if (seq !== requestSeq.current) return;
        verifyAnalyzeResponse(analyzeMode, analyzeValue, response);
        setStage("saving");
        await finish(response);
        await callbacks.current.onUsageChange();
      } catch (err) {
        if (seq !== requestSeq.current) return;
        if (err instanceof Error && err.message === ANALYSIS_CANCELLED) return;
        if (err instanceof ApiError && err.code === "LOGIN_REQUIRED") {
          savePendingAnalysis({ mode: analyzeMode, value: analyzeValue, abstractTitle: analyzeTitle });
          pendingRetryRef.current = true;
          setError(friendlyError(err.message));
          callbacks.current.onLoginRequired();
          return;
        }
        setError(err instanceof Error ? friendlyError(err.message) : "Analysis failed");
      } finally {
        endAnalysisSession();
        if (seq === requestSeq.current) {
          setBusy(false);
          setStage("idle");
        }
      }
    },
    [finish]
  );

  /** Loads a stored analysis. Returns false when it couldn't be opened. */
  const openPaper = useCallback(
    async (id: string) => {
      const seq = ++requestSeq.current;
      setBusy(true);
      setError("");
      beginAnalysisSession(ANALYZE_TIMEOUT_MS);
      try {
        const res = await api.paper(id);
        if (seq !== requestSeq.current) return;
        if (!res.analysis) {
          setError("Analysis not found for this paper.");
          setResult(null);
          navigatePage("home");
          return;
        }
        const response: AnalyzeResponse = { paper: res.paper, analysis: res.analysis };
        setResult(response);
        await callbacks.current.onResult(response);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        if (err instanceof Error && err.message === ANALYSIS_CANCELLED) return;
        setError(err instanceof Error ? friendlyError(err.message) : "Failed to load paper details");
        setResult(null);
        navigatePage("home");
      } finally {
        endAnalysisSession();
        if (seq === requestSeq.current) setBusy(false);
      }
    },
    []
  );

  const stop = useCallback(() => {
    ++requestSeq.current;
    cancelActiveAnalysis();
    endAnalysisSession();
    setBusy(false);
    setStage("idle");
  }, []);

  // After signing in from the "login required" prompt, resume the analysis that triggered it.
  useEffect(() => {
    if (!isSignedIn || !pendingRetryRef.current) return;
    pendingRetryRef.current = false;
    const pending = loadPendingAnalysis();
    if (!pending) return;
    clearPendingAnalysis();
    const pendingMode = pending.mode as InputMode;
    setMode(pendingMode);
    setValue(pending.value);
    if (pending.abstractTitle) setAbstractTitle(pending.abstractTitle);
    void callbacks.current.onUsageChange();
    void runAnalysis(pendingMode, pending.value, pending.abstractTitle);
  }, [isSignedIn, runAnalysis]);

  const analyze = useCallback(
    () => runAnalysis(mode, value, abstractTitle, pdf),
    [runAnalysis, mode, value, abstractTitle, pdf]
  );

  return {
    form: { mode, setMode, value, setValue, pdf, setPdf, abstractTitle, setAbstractTitle },
    busy,
    stage,
    error,
    result,
    msgIdx,
    analyze,
    openPaper,
    stop,
  };
}
