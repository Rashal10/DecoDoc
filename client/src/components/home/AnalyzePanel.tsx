import { motion } from "framer-motion";
import { FileText, SearchCheck, Upload } from "lucide-react";
import { AnimatedTabs } from "../ui/aceternity/animated-tabs";
import { EXAMPLE_PAPERS, type InputMode } from "../../lib/app-utils";
import { navigateTo, SIGN_IN_PATH } from "../../lib/auth-nav";
import { useScrollReveal } from "../../hooks/use-scroll-reveal";

const INPUT_TABS: { id: InputMode; label: string }[] = [
  { id: "arxiv", label: "arXiv ID" },
  { id: "doi", label: "DOI" },
  { id: "pdf", label: "Upload PDF" },
  { id: "abstract", label: "Paste Abstract" },
];

type AnalyzePanelProps = {
  mode: InputMode;
  setMode: (mode: InputMode) => void;
  value: string;
  setValue: (v: string) => void;
  pdf: File | null;
  setPdf: (f: File | null) => void;
  abstractTitle: string;
  setAbstractTitle: (v: string) => void;
  busy: boolean;
  error: string;
  usage?: import("../../lib/api").UsageStatus | null;
  onAnalyze: () => void;
};

export function AnalyzePanel({
  mode,
  setMode,
  value,
  setValue,
  pdf,
  setPdf,
  abstractTitle,
  setAbstractTitle,
  busy,
  error,
  usage,
  onAnalyze,
}: AnalyzePanelProps) {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section ref={ref} id="analyze" className="reveal-on-scroll scroll-mt-28 w-full">
      <p className="text-eyebrow mb-3">Get started</p>
      <h2 className="font-dialogue text-subheading font-semibold mb-8 text-[var(--color-carbon-ink)]">
        Analyze a paper
      </h2>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="surface-panel p-6 md:p-8"
      >
        <AnimatedTabs
          tabs={INPUT_TABS}
          activeTab={mode}
          onTabChange={(tab) => {
            setMode(tab);
            if (tab === "arxiv") setValue("1706.03762");
            else if (tab === "doi" || tab === "abstract") setValue("");
          }}
          ariaLabel="Input method"
          className="mb-6"
        />

        <div className="space-y-6">
          {mode === "pdf" ? (
            <div>
              <label htmlFor="pdf-upload" className="sr-only">
                Upload research PDF
              </label>
              <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-blush-paper)]/50 p-8 transition-colors hover:border-[var(--color-signal-blue)]/40">
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
                />
                <Upload className="mb-4 h-10 w-10 text-[var(--color-signal-blue)]" aria-hidden />
                <span className="text-body-lg font-semibold text-[var(--color-carbon-ink)]">
                  {pdf ? pdf.name : "Select a research PDF"}
                </span>
                <span className="mt-1 text-caption text-[var(--color-fossil-gray)]">
                  Drag and drop or browse files (up to 30 MB)
                </span>
              </div>
            </div>
          ) : mode === "abstract" ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="abstract-input" className="mb-2 block text-caption font-medium text-[var(--color-carbon-ink)]">
                  Abstract
                </label>
                <div className="input-field items-start">
                  <textarea
                    id="abstract-input"
                    className="min-h-[160px] py-2"
                    placeholder="Paste the research paper abstract here (at least 10 characters)..."
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    aria-describedby={error ? "analyze-error" : undefined}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="abstract-title" className="mb-2 block text-caption font-medium text-[var(--color-carbon-ink)]">
                  Paper title (optional)
                </label>
                <div className="input-field">
                  <FileText className="h-5 w-5 shrink-0 text-[var(--color-fossil-gray)]" aria-hidden />
                  <input
                    id="abstract-title"
                    placeholder="e.g. Attention Is All You Need"
                    value={abstractTitle}
                    onChange={(e) => setAbstractTitle(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="paper-input" className="mb-2 block text-caption font-medium text-[var(--color-carbon-ink)]">
                {mode === "arxiv" ? "arXiv URL or ID" : "DOI"}
              </label>
              <div className="input-field">
                <SearchCheck className="h-5 w-5 shrink-0 text-[var(--color-fossil-gray)]" aria-hidden />
                <input
                  id="paper-input"
                  placeholder={
                    mode === "arxiv"
                      ? "Enter arXiv URL or ID (e.g. 1706.03762)"
                      : "Enter DOI number (e.g. 10.1145/...)"
                  }
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
                  aria-describedby={error ? "analyze-error" : undefined}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-6">
              <button
              type="button"
              onClick={onAnalyze}
              disabled={busy || (mode === "pdf" && !pdf) || (mode === "abstract" && !value.trim())}
              className="btn-primary font-dialogue italic"
            >
              {busy ? "Processing…" : "Analyze"}
            </button>
            </div>
            {usage && !usage.authenticated && (
              <p className="text-caption text-[var(--color-fossil-gray)]">
                {usage.remaining > 0 ? (
                  usage.remaining === usage.limit
                    ? `${usage.limit} free analyses — no account needed`
                    : `${usage.remaining} free ${usage.remaining === 1 ? "analysis" : "analyses"} left`
                ) : (
                  <>
                    Free limit reached.{" "}
                    <button
                      type="button"
                      className="border-0 bg-transparent p-0 font-semibold text-[var(--color-pumpkin-orange)] cursor-pointer hover:underline"
                      onClick={() => navigateTo(SIGN_IN_PATH)}
                    >
                      Sign in
                    </button>{" "}
                    to continue.
                  </>
                )}
              </p>
            )}
            {usage && usage.authenticated && (
              <p className="text-caption text-[var(--color-fossil-gray)]">
                {usage.remaining} of {usage.limit} analyses remaining today
              </p>
            )}
          </div>

          {mode !== "pdf" && mode !== "abstract" && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-caption font-medium text-[var(--color-fossil-gray)]">Try:</span>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PAPERS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-caption font-semibold transition-colors hover:border-[var(--color-signal-blue)] hover:text-[var(--color-signal-blue)]"
                    onClick={() => {
                      setMode("arxiv");
                      setValue(id);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div
            id="analyze-error"
            role="alert"
            aria-live="polite"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body font-medium text-red-700"
          >
            {error}
          </div>
        )}
      </motion.div>
    </section>
  );
}
