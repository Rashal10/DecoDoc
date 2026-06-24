import type { AnalysisFlashcard, AnalysisSection, CitationNode, FutureDirection, HypeClaim, HypeLevel, InterviewQA, ResearchGap } from "@decodoc/shared";
import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { HypeMeter } from "../ui/hype-meter";
import {
  AlertTriangle,
  Beaker,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  Compass,
  FlaskConical,
  Lightbulb,
  Microscope,
  Rocket,
  Target,
  TrendingUp,
  Zap
} from "lucide-react";

const SECTION_ICONS: Record<string, typeof Brain> = {
  Problem: Target,
  Novelty: Lightbulb,
  Method: Beaker,
  Results: TrendingUp,
  Limitations: AlertTriangle,
  Verdict: CheckCircle2,
  "Research Impact": Zap,
  "Industry Relevance": FlaskConical
};

export function AnalysisSectionView({
  title,
  section,
  highlight = false,
  accent
}: {
  title: string;
  section: AnalysisSection;
  highlight?: boolean;
  accent?: string;
}) {
  const Icon = SECTION_ICONS[title] ?? BookOpen;
  const borderColor = highlight
    ? "border-[var(--color-pumpkin-orange)]"
    : accent ?? "border-[var(--color-carbon-ink)]/10";
  const bgColor = highlight ? "bg-[var(--color-pumpkin-orange)]/5" : "bg-[var(--color-surface-solid)]";

  return (
    <div className={`surface-card p-5 transition-shadow duration-200 hover:shadow-md border ${borderColor} ${bgColor}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${highlight ? "bg-[var(--color-pumpkin-orange)]/15" : "bg-[var(--color-signal-blue)]/10"}`}>
          <Icon className={`h-4 w-4 ${highlight ? "text-[var(--color-pumpkin-orange)]" : "text-[var(--color-signal-blue)]"}`} />
        </div>
        <h4 className="text-caption font-bold text-[var(--color-fossil-gray)] uppercase tracking-wider">{title}</h4>
      </div>
      <p className="text-body-lg font-medium leading-relaxed text-[var(--color-carbon-ink)] mb-3">
        {renderInlineText(section.lead, "lead-")}
      </p>
      {section.bullets.length > 0 && (
        <ul className="analysis-section-bullets space-y-2 mb-3">
          {section.bullets.map((bullet, idx) => (
            <li key={idx} className="flex gap-2.5 text-body leading-relaxed text-[var(--color-carbon-ink)]/85">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-pumpkin-orange)]" />
              <span>{renderInlineText(bullet, `bullet-${idx}-`)}</span>
            </li>
          ))}
        </ul>
      )}
      {section.detail && (
        <p className="analysis-section-detail border-t border-[var(--color-carbon-ink)]/8 pt-3">
          {renderInlineText(section.detail, "detail-")}
        </p>
      )}
    </div>
  );
}

export function HeadlineBanner({ headline }: { headline: string }) {
  if (!headline) return null;
  return (
    <div className="analysis-headline-banner relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(202,81,0,0.06),transparent_60%)]" />
      <p className="analysis-section-lead relative text-center">
        &ldquo;{headline}&rdquo;
      </p>
    </div>
  );
}

export function VerdictBadge({ lead }: { lead: string }) {
  const upper = lead.toUpperCase();
  let color = "bg-neutral-100 text-neutral-700";
  let label = "REVIEW";
  if (upper.startsWith("READ NOW")) {
    color = "bg-emerald-50 text-emerald-700 border-emerald-200";
    label = "READ NOW";
  } else if (upper.startsWith("SKIM")) {
    color = "bg-amber-50 text-amber-700 border-amber-200";
    label = "SKIM";
  } else if (upper.startsWith("SKIP")) {
    color = "bg-red-50 text-red-700 border-red-200";
    label = "SKIP";
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${color}`}>
      {label}
    </span>
  );
}

export function HypeClaimCard({ claim, index = 0 }: { claim: HypeClaim; index?: number }) {
  const levelStyles: Record<HypeLevel, string> = {
    HIGH: "text-red-600 bg-red-50 border-red-100",
    MODERATE: "text-amber-600 bg-amber-50 border-amber-100",
    LOW: "text-emerald-600 bg-emerald-50 border-emerald-100"
  };
  const style = levelStyles[claim.hypeLevel] ?? levelStyles.MODERATE;

  return (
    <div className="border border-[var(--color-carbon-ink)]/10 rounded-xl p-4 bg-white/50 hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start gap-3 mb-2">
        <span className="font-bold text-body leading-snug">{claim.claim}</span>
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 border ${style}`}>
          {claim.hypeLevel}
        </span>
      </div>
      <HypeMeter rating={claim.rating} level={claim.hypeLevel} index={index} />
      <p className="text-caption italic text-[var(--color-carbon-ink)]/90">
        <span className="font-bold not-italic">Reality check:</span> {claim.realityCheck}
      </p>
    </div>
  );
}

export function GenealogyCard({
  entry,
  variant
}: {
  entry: { title: string; authors: string; year: number; contribution: string; confidence?: string };
  variant: "ancestor" | "descendant";
}) {
  const borderColor = variant === "ancestor" ? "border-[var(--color-signal-blue)]" : "border-[var(--color-pumpkin-orange)]";
  const yearColor = variant === "ancestor" ? "text-[var(--color-signal-blue)]" : "text-[var(--color-pumpkin-orange)]";

  return (
    <div className={`border-l-2 ${borderColor} pl-4 py-2`}>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="font-bold text-body">{entry.title}</span>
        <span className={`text-caption font-bold ${yearColor}`}>({entry.year})</span>
        {entry.confidence === "inferred" && (
          <span className="text-[9px] uppercase font-bold text-[var(--color-fossil-gray)] bg-neutral-100 px-1.5 py-0.5 rounded">
            inferred
          </span>
        )}
      </div>
      <p className="text-caption text-[var(--color-fossil-gray)] mb-2">Authors: {entry.authors}</p>
      <p className="text-body leading-relaxed text-[var(--color-carbon-ink)]/85">{entry.contribution}</p>
    </div>
  );
}

function renderInlineText(text: string, keyPrefix = ""): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}inline-${index++}`;

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-[var(--color-carbon-ink)]">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      const inner = token.startsWith("_") ? token.slice(1, -1) : token.slice(1, -1);
      nodes.push(
        <em key={key} className="italic [font-family:inherit]">
          {inner}
        </em>
      );
    }

    last = match.index + token.length;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function ProseBlock({ text }: { text: string }) {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-3 font-helvetica">
      {paragraphs.map((p, idx) => (
        <p key={idx} className="text-body leading-relaxed text-[var(--color-carbon-ink)]/85">
          {renderInlineText(p, `p-${idx}-`)}
        </p>
      ))}
    </div>
  );
}

export function FutureDirectionsList({ directions }: { directions: FutureDirection[] }) {
  if (directions.length === 0) return null;
  return (
    <div className="space-y-3">
      {directions.map((dir, idx) => (
        <div key={idx} className="gap-card flex gap-4 items-start">
          <span className="gap-index shrink-0">{idx + 1}</span>
          <div className="min-w-0">
            <h5 className="font-bold text-body-lg text-[var(--color-carbon-ink)] mb-1.5">{dir.title}</h5>
            <p className="text-body leading-relaxed text-[var(--color-carbon-ink)]/85">{dir.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CitationPaperCard({ node, accent }: { node: CitationNode; accent: "blue" | "orange" }) {
  const accentClass =
    accent === "blue"
      ? "border-l-[var(--color-signal-blue)]"
      : "border-l-[var(--color-pumpkin-orange)]";
  return (
    <div className={`gap-card border-l-[3px] ${accentClass}`}>
      <div className="flex justify-between items-start gap-3 mb-2">
        <h5 className="font-bold text-body leading-snug">{node.title}</h5>
        <span className="text-caption font-bold text-[var(--color-fossil-gray)] shrink-0">{node.year || "—"}</span>
      </div>
      <p className="text-caption text-[var(--color-fossil-gray)]">
        {node.authors}
        {node.citationCount > 0 && <> · ~{node.citationCount.toLocaleString()} citations</>}
      </p>
    </div>
  );
}

export function InterviewAccordion({ items }: { items: InterviewQA[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((qa, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index} className="overflow-hidden rounded-2xl border border-[var(--color-carbon-ink)]/10 bg-white/50 backdrop-blur-sm">
            <button
              type="button"
              className="w-full flex items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-white/70"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
            >
              <div className="flex gap-3 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-pumpkin-orange)]/12 text-[11px] font-bold text-[var(--color-pumpkin-orange)]">
                  {index + 1}
                </span>
                <span className="font-bold text-body-lg leading-snug text-[var(--color-carbon-ink)] pt-0.5">
                  {renderInlineText(qa.question, `q-${index}-`)}
                </span>
              </div>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="shrink-0 mt-1 text-[var(--color-fossil-gray)]"
              >
                <ChevronDown className="h-5 w-5" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-0 ml-10 border-t border-[var(--color-carbon-ink)]/8">
                    <div className="pt-4">
                      <ProseBlock text={qa.answer} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

const ELI5_LEVEL_META = [
  { label: "5-Year-Old", hint: "Simple analogy, no jargon" },
  { label: "12-Year-Old", hint: "Curious kid level — what & why" },
  { label: "Undergrad", hint: "Intro course background assumed" },
  { label: "PhD", hint: "Full technical depth with metrics" }
] as const;

export function ExplainItPanel({
  texts,
  level,
  onLevelChange
}: {
  texts: string[];
  level: number;
  onLevelChange: (index: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-subheading font-bold mb-1">Explain it to:</h3>
        <p className="text-caption text-[var(--color-fossil-gray)]">
          Same paper, four audiences — pick the depth that fits you.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-carbon-ink)]/10 pb-3">
        {ELI5_LEVEL_META.map((meta, index) => (
          <button
            key={meta.label}
            type="button"
            className={`glass-tab px-3 py-1.5 text-caption font-bold transition-all duration-300 active:scale-95 ${
              level === index ? "glass-tab-active" : ""
            }`}
            onClick={() => onLevelChange(index)}
          >
            {meta.label}
          </button>
        ))}
      </div>
      <div className="glass-panel p-6 space-y-3 prose-reading">
        <p className="text-nano font-bold uppercase tracking-wider text-[var(--color-pumpkin-orange)]">
          {ELI5_LEVEL_META[level]?.hint}
        </p>
        <ProseBlock text={texts[level] ?? ""} />
      </div>
    </div>
  );
}

const GAP_CATEGORY_ICONS: Record<string, typeof Brain> = {
  Methodological: Microscope,
  Scalability: TrendingUp,
  Theoretical: Brain,
  Empirical: FlaskConical,
  Application: Rocket
};

export function difficultyBadgeClass(difficulty: string): string {
  const d = difficulty.toLowerCase();
  if (d === "easy") return "gap-difficulty-easy";
  if (d === "hard") return "gap-difficulty-hard";
  return "gap-difficulty-medium";
}

function gapDifficultyStyle(difficulty: string): string {
  return difficultyBadgeClass(difficulty);
}

export function ResearchGapCard({ gap, index }: { gap: ResearchGap; index: number }) {
  const CategoryIcon = GAP_CATEGORY_ICONS[gap.category] ?? Compass;

  return (
    <article className="gap-card group">
      <div className="flex gap-4">
        <div className="flex flex-col items-center shrink-0 pt-1">
          <span className="gap-index">{index + 1}</span>
          <div className="w-px flex-1 min-h-[40px] bg-gradient-to-b from-[var(--color-pumpkin-orange)]/40 to-transparent mt-2" />
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-[var(--color-signal-blue)]/10 shrink-0">
                <CategoryIcon className="h-4 w-4 text-[var(--color-signal-blue)]" />
              </div>
              <h4 className="font-bold text-body-lg leading-snug">{gap.title}</h4>
            </div>
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {gap.category && (
                <span className="gap-category-badge">{gap.category}</span>
              )}
              <span className={`gap-difficulty-badge ${gapDifficultyStyle(gap.difficulty)}`}>
                {gap.difficulty}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-caption font-bold uppercase tracking-wider text-[var(--color-fossil-gray)]">The Gap</p>
            <p className="text-body leading-relaxed text-[var(--color-carbon-ink)]/90">{gap.description}</p>
          </div>

          {gap.evidence && (
            <div className="gap-evidence-box">
              <p className="text-caption font-bold text-[var(--color-signal-blue)] mb-1">Evidence from this paper</p>
              <p className="text-caption leading-relaxed text-[var(--color-carbon-ink)]/85 italic">&ldquo;{gap.evidence}&rdquo;</p>
            </div>
          )}

          <div className="gap-opportunity-box">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-[var(--color-pumpkin-orange)]" />
              <p className="text-caption font-bold text-[var(--color-pumpkin-orange)]">Research Opportunity</p>
            </div>
            <p className="text-body leading-relaxed text-[var(--color-carbon-ink)]/90">{gap.opportunity}</p>
          </div>

          {gap.impact && (
            <p className="text-caption text-[var(--color-fossil-gray)] border-t border-[var(--color-carbon-ink)]/8 pt-2">
              <span className="font-bold text-[var(--color-carbon-ink)]">Impact:</span> {gap.impact}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function OpenQuestionsList({ questions }: { questions: string[] }) {
  if (questions.length === 0) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {questions.map((q, idx) => (
        <div key={idx} className="gap-question-card">
          <span className="gap-question-num">{idx + 1}</span>
          <p className="text-body leading-relaxed text-[var(--color-carbon-ink)]/90">{q}</p>
        </div>
      ))}
    </div>
  );
}

function flashcardDifficultyStyle(difficulty: string) {
  return difficultyBadgeClass(difficulty);
}

function FlipFlashcard({ card, index }: { card: AnalysisFlashcard; index: number }) {
  const [flipped, setFlipped] = useState(false);

  const toggle = () => setFlipped((f) => !f);

  return (
    <button
      type="button"
      className={`flashcard-flip perspective-dramatic w-full text-left ${flipped ? "is-flipped" : ""}`}
      onClick={toggle}
      aria-pressed={flipped}
      aria-label={flipped ? `Card ${index + 1}: show question` : `Card ${index + 1}: reveal answer`}
    >
      <div className="flashcard-inner transform-3d">
        <div className="flashcard-face flashcard-front backface-hidden" aria-hidden={flipped}>
          <div className="flex justify-between items-center mb-3">
            <span className="flashcard-category-badge">{card.category}</span>
            <span className={`gap-difficulty-badge ${flashcardDifficultyStyle(card.difficulty)}`}>
              {card.difficulty}
            </span>
          </div>
          <p className="font-bold text-body-lg leading-snug text-[var(--color-carbon-ink)]">{card.front}</p>
          {card.hint && (
            <p className="mt-3 text-caption text-[var(--color-fossil-gray)] italic">
              <span className="font-bold not-italic text-[var(--color-signal-blue)]">Hint:</span> {card.hint}
            </p>
          )}
          <p className="flashcard-flip-hint mt-auto pt-4">Click to reveal answer</p>
        </div>

        <div className="flashcard-face flashcard-back backface-hidden" aria-hidden={!flipped}>
          <div className="flex justify-between items-center mb-3">
            <span className="flashcard-category-badge">{card.category}</span>
            <span className={`gap-difficulty-badge ${flashcardDifficultyStyle(card.difficulty)}`}>
              {card.difficulty}
            </span>
          </div>
          <p className="text-caption font-bold uppercase tracking-wider text-[var(--color-signal-blue)] mb-2">Answer</p>
          <ProseBlock text={card.back} />
          <p className="flashcard-flip-hint mt-auto pt-4">Click to flip back</p>
        </div>
      </div>
    </button>
  );
}

export function FlashcardDeck({ cards }: { cards: AnalysisFlashcard[] }) {
  return (
    <div className="space-y-4">
      <p className="text-caption text-[var(--color-fossil-gray)]">
        {cards.length} cards · click any card to flip between question and answer
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card, idx) => (
          <FlipFlashcard key={idx} card={card} index={idx} />
        ))}
      </div>
    </div>
  );
}
