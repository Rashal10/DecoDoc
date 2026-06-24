import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Brain, Sparkles, Square } from "lucide-react";
import { DecoDocLogo } from "./decodoc-logo";
import { useReducedMotion } from "../../hooks/use-reduced-motion";

export type LoadingStage =
  | "idle"
  | "fetching"
  | "embedding"
  | "analyzing"
  | "saving"
  | "extracting";

const STAGE_STEPS = [
  { id: "read", label: "Read", icon: BookOpen, stages: ["fetching", "extracting", "embedding"] as LoadingStage[] },
  { id: "analyze", label: "Analyze", icon: Brain, stages: ["analyzing"] as LoadingStage[] },
  { id: "finalize", label: "Finalize", icon: Sparkles, stages: ["saving"] as LoadingStage[] },
];

function stageStepIndex(stage: LoadingStage): number {
  const idx = STAGE_STEPS.findIndex((s) => s.stages.includes(stage));
  return idx === -1 ? 0 : idx;
}

export function AnalysisLoadingOverlay({
  visible,
  messages,
  msgIdx,
  stage,
  onCancel,
}: {
  visible: boolean;
  messages: string[];
  msgIdx: number;
  stage: LoadingStage;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const activeStep = stageStepIndex(stage);
  const message = messages[msgIdx] ?? messages[0] ?? "Processing…";

  useEffect(() => {
    if (!visible) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prev?.focus();
    };
  }, [visible, onCancel]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.3 }}
          className="analysis-loading-overlay fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Analyzing paper"
          aria-live="polite"
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={reduced ? false : { opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="analysis-loading-card w-full max-w-[480px] outline-none"
          >
            <div className="p-7 sm:p-8">
              <div className="mb-8 flex items-center justify-between gap-4">
                <DecoDocLogo compact showTagline />
                <p className="shrink-0 text-caption font-semibold text-[var(--color-fossil-gray)]">
                  Analyzing
                </p>
              </div>

              <div className="analysis-loading-quote">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={msgIdx}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                    className="analysis-loading-quote-text"
                  >
                    {message}
                  </motion.p>
                </AnimatePresence>
                <div className="analysis-loading-progress" aria-hidden />
              </div>

              <div className="mt-8">
                <div className="relative flex items-start justify-between">
                  <div className="analysis-loading-step-track" aria-hidden>
                    <div
                      className="analysis-loading-step-fill"
                      style={{
                        width: `${(activeStep / Math.max(STAGE_STEPS.length - 1, 1)) * 100}%`,
                      }}
                    />
                  </div>
                  {STAGE_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const isActive = i === activeStep;
                    const isDone = i < activeStep;
                    return (
                      <div
                        key={step.id}
                        className={`relative z-[1] flex w-[33%] flex-col items-center gap-2 transition-opacity duration-500 ${
                          isActive || isDone ? "opacity-100" : "opacity-40"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-500 ${
                            isActive
                              ? "analysis-loading-step-active"
                              : isDone
                                ? "analysis-loading-step-done"
                                : "analysis-loading-step-idle"
                          }`}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </div>
                        <span
                          className={`text-nano font-bold uppercase tracking-wider ${
                            isActive ? "text-[var(--color-pumpkin-orange)]" : "text-[var(--color-fossil-gray)]"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-2 text-[var(--color-fossil-gray)] hover:text-[var(--color-carbon-ink)]"
                  onClick={onCancel}
                >
                  <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
                  Stop analysis
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
