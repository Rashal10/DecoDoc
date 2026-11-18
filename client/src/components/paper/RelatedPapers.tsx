import { useEffect, useState } from "react";
import { ArrowUpRight, Network, RefreshCw } from "lucide-react";
import type { Paper, RelatedPaper } from "@decodoc/shared";
import { api } from "../../lib/api";
import { matchPercent } from "../../lib/app-utils";
import { navigatePaper } from "../../lib/routes";

const KIND_LABEL: Record<RelatedPaper["kind"], string> = {
  similar: "Same era",
  foundational: "Earlier work",
  "follow-up": "Later work",
};

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; related: RelatedPaper[] };

export function RelatedPapers({ paper }: { paper: Paper }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    api
      .similar(paper.id, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) setState({ status: "done", related: res.related ?? [] });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Could not load related papers.",
        });
      });
    return () => controller.abort();
  }, [paper.id, attempt]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-subheading font-semibold mb-1">Papers like this</h3>
        <p className="text-caption text-[var(--color-fossil-gray)]">
          Found by meaning, not keywords: other analyzed papers whose content is closest to this one.
        </p>
      </div>

      {state.status === "loading" && (
        <div className="grid gap-3 md:grid-cols-2" aria-busy="true" aria-label="Loading related papers">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="related-skeleton" />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <div className="related-empty">
          <p>Related papers aren't available right now.</p>
          <button type="button" className="glass-button" onClick={() => setAttempt((n) => n + 1)}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </button>
        </div>
      )}

      {state.status === "done" && state.related.length === 0 && (
        <div className="related-empty">
          <Network className="h-8 w-8 text-[var(--color-fossil-gray)]" aria-hidden />
          <p>
            No close matches yet. Related papers come from public papers people have analyzed, so this list grows as more
            papers are decoded. Uploaded PDFs and pasted abstracts stay private and aren't matched.
          </p>
        </div>
      )}

      {state.status === "done" && state.related.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {state.related.map((item) => (
            <li key={item.paper.id}>
              <button type="button" className="related-card" onClick={() => navigatePaper(item.paper.id)}>
                <span className="related-card-top">
                  <span className="related-kind">{KIND_LABEL[item.kind]}</span>
                  <span className="related-match">{matchPercent(item.score)}% match</span>
                </span>
                <span className="related-title">{item.paper.title}</span>
                <span className="related-meta">
                  {[item.paper.authors.slice(0, 3).join(", ") + (item.paper.authors.length > 3 ? " et al." : ""), item.paper.year]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="related-open">
                  Open analysis <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
