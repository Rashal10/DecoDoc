import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Loader2, Search, Sparkles } from "lucide-react";
import type { SearchResult } from "@decodoc/shared";
import { api, ApiError } from "../lib/api";
import { matchPercent } from "../lib/app-utils";
import { navigatePage, navigatePaper } from "../lib/routes";

const SUGGESTIONS = [
  "attention without recurrence",
  "self-supervised image representations",
  "aligning language models with human feedback",
  "diffusion models for image generation",
];

const MIN_QUERY = 2;

type State =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "error"; query: string; message: string }
  | { status: "done"; query: string; results: SearchResult[] };

function readQuery(): string {
  return new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
}

function searchErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "RATE_LIMIT") return "That's a lot of searches. Wait a minute and try again.";
    return err.message;
  }
  return "Search isn't available right now. Try again in a moment.";
}

export function SearchPage() {
  const [input, setInput] = useState(readQuery);
  const [state, setState] = useState<State>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async (raw: string) => {
    const query = raw.trim();
    if (query.length < MIN_QUERY) return;
    const url = `${window.location.pathname}?q=${encodeURIComponent(query)}`;
    window.history.replaceState(window.history.state, "", url);

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "loading", query });
    try {
      const { results } = await api.search(query, controller.signal);
      if (!controller.signal.aborted) setState({ status: "done", query, results: results ?? [] });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({ status: "error", query, message: searchErrorMessage(err) });
    }
  }, []);

  useEffect(() => {
    const initial = readQuery();
    if (initial) void run(initial);
    else inputRef.current?.focus();
    return () => controllerRef.current?.abort();
  }, [run]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(input);
  };

  const pick = (suggestion: string) => {
    setInput(suggestion);
    void run(suggestion);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 md:py-24">
      <p className="text-eyebrow mb-3">Semantic search</p>
      <h1 className="text-heading font-semibold tracking-tight">Find papers by idea, not keyword</h1>
      <p className="mt-2 max-w-xl text-body text-[var(--color-fossil-gray)]">
        Describe what you're looking for in plain words. DecoDoc compares meaning across every public paper that's been
        analyzed.
      </p>

      <form className="search-bar" onSubmit={onSubmit} role="search">
        <Search className="h-5 w-5 shrink-0 text-[var(--color-fossil-gray)]" aria-hidden />
        <label htmlFor="semantic-search" className="sr-only">
          Search analyzed papers
        </label>
        <input
          id="semantic-search"
          ref={inputRef}
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. models that segment any object from a click"
          maxLength={300}
          autoComplete="off"
        />
        <button type="submit" className="btn-primary" disabled={input.trim().length < MIN_QUERY || state.status === "loading"}>
          {state.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Search
        </button>
      </form>

      {state.status === "idle" && (
        <div className="mt-8">
          <p className="mb-3 text-caption font-semibold text-[var(--color-fossil-gray)]">Try one of these</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="library-chip" onClick={() => pick(s)}>
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10" aria-live="polite">
        {state.status === "loading" && (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="related-skeleton" />
            ))}
          </div>
        )}

        {state.status === "error" && (
          <div className="related-empty">
            <p>{state.message}</p>
            <button type="button" className="glass-button" onClick={() => void run(state.query)}>
              Try again
            </button>
          </div>
        )}

        {state.status === "done" && state.results.length === 0 && (
          <div className="related-empty">
            <p>
              No analyzed papers match “{state.query}” yet. Search only covers public papers that have been decoded, so
              analyzing a paper adds it here for everyone.
            </p>
            <button type="button" className="btn-ghost" onClick={() => navigatePage("home")}>
              Analyze a paper
            </button>
          </div>
        )}

        {state.status === "done" && state.results.length > 0 && (
          <>
            <p className="mb-4 text-caption text-[var(--color-fossil-gray)]">
              {state.results.length} {state.results.length === 1 ? "paper" : "papers"} closest to “{state.query}”
            </p>
            <ol className="space-y-3">
              {state.results.map((r) => (
                <li key={r.paper.id}>
                  <button type="button" className="search-result" onClick={() => navigatePaper(r.paper.id)}>
                    <span className="search-result-head">
                      <span className="search-result-title">{r.paper.title}</span>
                      <span className="related-match">{matchPercent(r.score)}%</span>
                    </span>
                    <span className="related-meta">
                      {[
                        r.paper.authors.slice(0, 3).join(", ") + (r.paper.authors.length > 3 ? " et al." : ""),
                        r.paper.year,
                        r.paper.venue,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {r.highlights[0] ? <span className="search-result-snippet">{r.highlights[0]}</span> : null}
                    <span className="related-open">
                      Open analysis <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
