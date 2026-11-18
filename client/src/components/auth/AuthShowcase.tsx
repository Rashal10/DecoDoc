import { useEffect, useState } from "react";
import { Layers, Network, Repeat, Sparkles } from "lucide-react";
import { useReducedMotion } from "../../hooks/use-reduced-motion";

type DemoPaper = {
  title: string;
  byline: string;
  tldr: string;
  scores: Array<{ label: string; value: number }>;
  card: { front: string; back: string };
};

/** Short, original summaries written for this demo. */
const DEMO_PAPERS: DemoPaper[] = [
  {
    title: "Attention Is All You Need",
    byline: "Vaswani et al. · 2017",
    tldr: "Drops recurrence entirely and builds a translation model from attention layers alone, so training parallelises and quality goes up.",
    scores: [
      { label: "Impact", value: 98 },
      { label: "Difficulty", value: 72 },
      { label: "Reproducibility", value: 84 },
    ],
    card: { front: "Why scale dot-product attention by √dₖ?", back: "To keep softmax gradients from vanishing at large key sizes." },
  },
  {
    title: "BERT: Pre-training of Deep Bidirectional Transformers",
    byline: "Devlin et al. · 2018",
    tldr: "Pre-trains a Transformer encoder by hiding words and predicting them from both sides, then fine-tunes it for many tasks.",
    scores: [
      { label: "Impact", value: 96 },
      { label: "Difficulty", value: 61 },
      { label: "Reproducibility", value: 88 },
    ],
    card: { front: "What does the masked LM objective predict?", back: "Randomly hidden tokens, using context on both sides." },
  },
  {
    title: "Segment Anything",
    byline: "Kirillov et al. · 2023",
    tldr: "A promptable segmentation model trained on a billion masks that cuts out objects it has never seen from a click or a box.",
    scores: [
      { label: "Impact", value: 91 },
      { label: "Difficulty", value: 58 },
      { label: "Reproducibility", value: 76 },
    ],
    card: { front: "What can prompt the model?", back: "Points, boxes, rough masks, or text." },
  },
];

const CYCLE_MS = 7000;

const VALUE_POINTS = [
  { icon: Sparkles, text: "10 free analyses a day" },
  { icon: Repeat, text: "Flashcards with spaced repetition" },
  { icon: Network, text: "Related papers & citation maps" },
] as const;

export function AuthShowcase() {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const paper = DEMO_PAPERS[index] ?? DEMO_PAPERS[0]!;

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % DEMO_PAPERS.length), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  return (
    <div className="auth-showcase">
      <div className="auth-showcase-glow" aria-hidden />

      <div className="auth-showcase-top">
        <p className="auth-showcase-pill">
          <Layers className="h-3.5 w-3.5" aria-hidden />
          Research papers, decoded
        </p>
        <h2 className="auth-showcase-title">
          Forty pages in.
          <br />
          <span>Five minutes out.</span>
        </h2>
      </div>

      <div className="auth-demo" aria-label={`Example analysis of ${paper.title}`} role="img">
        <div key={`paper-${index}`} className="auth-demo-paper">
          <p className="auth-demo-kicker">Input · arXiv</p>
          <p className="auth-demo-paper-title">{paper.title}</p>
          <p className="auth-demo-byline">{paper.byline}</p>
          <div className="auth-demo-lines" aria-hidden>
            {[92, 100, 86, 97, 70, 94, 81].map((w, i) => (
              <span key={i} style={{ width: `${w}%` }} />
            ))}
          </div>
          <span className="auth-demo-scan" aria-hidden />
        </div>

        <div key={`out-${index}`} className="auth-demo-output">
          <div className="auth-demo-card auth-demo-card--tldr">
            <p className="auth-demo-kicker">TL;DR</p>
            <p className="auth-demo-tldr">{paper.tldr}</p>
          </div>

          <div className="auth-demo-card auth-demo-card--scores">
            {paper.scores.map((s) => (
              <div key={s.label} className="auth-demo-score">
                <span>{s.label}</span>
                <span className="auth-demo-bar">
                  <span style={{ ["--w" as string]: `${s.value}%` }} />
                </span>
                <span className="auth-demo-score-value">{s.value}</span>
              </div>
            ))}
          </div>

          <div className="auth-demo-card auth-demo-card--flash">
            <p className="auth-demo-kicker">Flashcard</p>
            <p className="auth-demo-front">{paper.card.front}</p>
            <p className="auth-demo-back">{paper.card.back}</p>
          </div>
        </div>
      </div>

      <div className="auth-showcase-dots" aria-hidden>
        {DEMO_PAPERS.map((p, i) => (
          <span key={p.title} className={i === index ? "is-active" : undefined} />
        ))}
      </div>

      <ul className="auth-showcase-values">
        {VALUE_POINTS.map(({ icon: Icon, text }) => (
          <li key={text}>
            <Icon className="h-4 w-4" aria-hidden />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
