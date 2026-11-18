import { useMemo, useState } from "react";
import { Bookmark, ChevronRight, Clock, Search, X } from "lucide-react";
import type { AnalyzeResponse, Paper, SubjectDomain } from "@decodoc/shared";
import { PaperCard } from "../components/library/PaperCard";
import { DEFAULT_FILTER, domainsIn, filterPapers, type LibraryFilter, type LibrarySort } from "../lib/library-filter";
import { cn } from "../lib/utils";

type EmptyStateProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  action?: React.ReactNode;
};

function EmptyState({ icon: Icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-strong)] p-10 text-center">
      <Icon className="mb-4 h-10 w-10 text-[var(--color-fossil-gray)]" aria-hidden />
      <h3 className="text-body-lg font-semibold mb-1">{title}</h3>
      <p className="text-caption text-[var(--color-fossil-gray)] leading-relaxed max-w-xs mb-4">{text}</p>
      {action}
    </div>
  );
}

const SORT_LABELS: Record<LibrarySort, string> = {
  recent: "Most recent",
  title: "Title A–Z",
  "year-desc": "Newest paper",
  "year-asc": "Oldest paper",
};

const DOMAIN_LABELS: Record<SubjectDomain, string> = {
  cs: "Computer science",
  math: "Math",
  biology: "Biology",
  chemistry: "Chemistry",
  physics: "Physics",
  general: "General",
};

const RECENTS_PAGE = 10;

type LibraryPageProps = {
  saved: Paper[];
  recents: AnalyzeResponse[];
  isSignedIn: boolean;
  onOpenPaper: (paper: Paper) => void;
  onNavigateHome: () => void;
};

export function LibraryPage({ saved, recents, isSignedIn, onOpenPaper, onNavigateHome }: LibraryPageProps) {
  const [filter, setFilter] = useState<LibraryFilter>(DEFAULT_FILTER);
  const [recentLimit, setRecentLimit] = useState(RECENTS_PAGE);

  const recentPapers = useMemo(() => recents.map((r) => r.paper), [recents]);
  const domains = useMemo(() => domainsIn([...saved, ...recentPapers]), [saved, recentPapers]);
  const shownSaved = useMemo(() => filterPapers(saved, filter), [saved, filter]);
  const shownRecents = useMemo(() => filterPapers(recentPapers, filter), [recentPapers, filter]);
  const isFiltering = filter.query.trim() !== "" || filter.domain !== "all";
  const hasAnything = saved.length > 0 || recentPapers.length > 0;

  const update = (patch: Partial<LibraryFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setRecentLimit(RECENTS_PAGE);
  };

  const noMatches = (
    <EmptyState
      icon={Search}
      title="No matches"
      text="Nothing in this list matches your search or filter."
      action={
        <button type="button" className="btn-ghost" onClick={() => update(DEFAULT_FILTER)}>
          Clear filters
        </button>
      }
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 flex flex-col gap-10">
      <div>
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-caption text-[var(--color-fossil-gray)]">
          <button type="button" onClick={onNavigateHome} className="hover:text-[var(--color-carbon-ink)] transition-colors">
            Home
          </button>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <span className="text-[var(--color-carbon-ink)] font-medium">Library</span>
        </nav>
        <h1 className="text-heading font-semibold tracking-tight">Research Library</h1>
        <p className="mt-2 text-body text-[var(--color-fossil-gray)] max-w-lg">
          {isSignedIn
            ? "Bookmarks sync to your account. Recently viewed papers stay in this browser."
            : "Bookmarks and recents are stored in this browser. Sign in to sync bookmarks across devices."}
        </p>
      </div>

      {hasAnything && (
        <div className="library-toolbar">
          <label className="library-search">
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="sr-only">Search your library</span>
            <input
              type="search"
              value={filter.query}
              onChange={(e) => update({ query: e.target.value })}
              placeholder="Search by title, author, year…"
            />
            {filter.query ? (
              <button type="button" onClick={() => update({ query: "" })} aria-label="Clear search">
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </label>

          <label className="library-sort">
            <span className="sr-only">Sort papers</span>
            <select value={filter.sort} onChange={(e) => update({ sort: e.target.value as LibrarySort })}>
              {(Object.keys(SORT_LABELS) as LibrarySort[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          {domains.length > 1 && (
            <div className="library-chips" role="group" aria-label="Filter by subject">
              <button
                type="button"
                className={cn("library-chip", filter.domain === "all" && "is-active")}
                aria-pressed={filter.domain === "all"}
                onClick={() => update({ domain: "all" })}
              >
                All
              </button>
              {domains.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={cn("library-chip", filter.domain === d && "is-active")}
                  aria-pressed={filter.domain === d}
                  onClick={() => update({ domain: d })}
                >
                  {DOMAIN_LABELS[d]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="library-saved">
          <h2 id="library-saved" className="text-subheading font-semibold mb-6 flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-[var(--color-pumpkin-orange)]" aria-hidden />
            Bookmarked
            <span className="library-count">{isFiltering && saved.length > 0 ? `${shownSaved.length} of ${saved.length}` : saved.length}</span>
          </h2>
          {saved.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="No bookmarks yet"
              text="Save any analyzed paper to build your personal research library."
              action={
                <button type="button" className="btn-ghost" onClick={onNavigateHome}>
                  Analyze your first paper
                </button>
              }
            />
          ) : shownSaved.length === 0 ? (
            noMatches
          ) : (
            <div className="space-y-4">
              {shownSaved.map((paper) => (
                <PaperCard key={paper.id} paper={paper} onOpen={onOpenPaper} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="library-recent">
          <h2 id="library-recent" className="text-subheading font-semibold mb-6 flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--color-signal-blue)]" aria-hidden />
            Recently viewed
            <span className="library-count">
              {isFiltering && recentPapers.length > 0
                ? `${shownRecents.length} of ${recentPapers.length}`
                : recentPapers.length}
            </span>
          </h2>
          {recentPapers.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No recents yet"
              text="Papers you analyze will appear here for quick access."
            />
          ) : shownRecents.length === 0 ? (
            noMatches
          ) : (
            <div className="space-y-4">
              {shownRecents.slice(0, recentLimit).map((paper) => (
                <PaperCard key={paper.id} paper={paper} onOpen={onOpenPaper} />
              ))}
              {shownRecents.length > recentLimit && (
                <button
                  type="button"
                  className="btn-ghost w-full justify-center"
                  onClick={() => setRecentLimit((n) => n + RECENTS_PAGE)}
                >
                  Show {Math.min(RECENTS_PAGE, shownRecents.length - recentLimit)} more
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
