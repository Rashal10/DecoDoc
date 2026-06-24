import { Bookmark, ChevronRight, Clock } from "lucide-react";
import type { AnalyzeResponse, Paper } from "@decodoc/shared";
import { PaperCard } from "../components/library/PaperCard";

type EmptyStateProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  action?: React.ReactNode;
};

function EmptyState({ icon: Icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-blush-paper)]/40 p-10 text-center">
      <Icon className="mb-4 h-10 w-10 text-[var(--color-fossil-gray)]" aria-hidden />
      <h3 className="text-body-lg font-semibold mb-1">{title}</h3>
      <p className="text-caption text-[var(--color-fossil-gray)] leading-relaxed max-w-xs mb-4">{text}</p>
      {action}
    </div>
  );
}

type LibraryPageProps = {
  saved: Paper[];
  recents: AnalyzeResponse[];
  isSignedIn: boolean;
  onOpenPaper: (paper: Paper) => void;
  onNavigateHome: () => void;
};

export function LibraryPage({ saved, recents, isSignedIn, onOpenPaper, onNavigateHome }: LibraryPageProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 flex flex-col gap-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-caption text-[var(--color-fossil-gray)]">
            <button type="button" onClick={onNavigateHome} className="hover:text-[var(--color-carbon-ink)] transition-colors">
              Home
            </button>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="text-[var(--color-carbon-ink)] font-medium">Library</span>
          </nav>
          <h1 className="text-heading font-semibold tracking-tight">Researcher Library</h1>
          <p className="mt-2 text-body text-[var(--color-fossil-gray)] max-w-lg">
            {isSignedIn
              ? "Bookmarked papers sync to your account. Recents stay in this browser."
              : "Bookmarked papers and recents are stored in this browser. Sign in to sync bookmarks across devices."}
          </p>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <h2 className="text-subheading font-semibold mb-6 flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-[var(--color-pumpkin-orange)]" aria-hidden />
            Bookmarked Papers
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
          ) : (
            <div className="space-y-4">
              {saved.map((paper) => (
                <PaperCard key={paper.id} paper={paper} onOpen={onOpenPaper} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-subheading font-semibold mb-6 flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--color-signal-blue)]" aria-hidden />
            Recently Viewed
          </h2>
          {recents.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No recents yet"
              text="Papers you analyze will appear here for quick access."
            />
          ) : (
            <div className="space-y-4">
              {recents.slice(0, 10).map((item) => (
                <PaperCard key={item.paper.id} paper={item.paper} onOpen={onOpenPaper} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
