import { useCallback, useEffect, useState } from "react";
import type { AnalyzeResponse } from "@decodoc/shared";
import { api, type UsageStatus } from "./lib/api";
import { useAuth } from "./lib/auth-context";
import { usePathname } from "./lib/auth-nav";
import { LOADING_MESSAGES } from "./lib/app-utils";
import { navigatePage, navigatePaper, parseAppRoute } from "./lib/routes";
import { useAnalysis } from "./hooks/use-analysis";
import { useLibrary } from "./hooks/use-library";
import { LoginRequiredModal } from "./components/auth/LoginRequiredModal";
import { AnalysisLoadingOverlay } from "./components/ui/analysis-loading-overlay";
import { AppShell } from "./layouts/AppShell";
import { HomePage } from "./pages/HomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { PaperDetailPage } from "./pages/PaperDetailPage";
import { ReviewPage } from "./pages/ReviewPage";
import { SearchPage } from "./pages/SearchPage";

export function App() {
  const { isSignedIn } = useAuth();
  const route = parseAppRoute(usePathname());
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const library = useLibrary(isSignedIn);

  const refreshUsage = useCallback(async () => {
    try {
      setUsage(await api.usage());
    } catch {
      // API may be offline during local dev without Postgres.
    }
  }, []);

  useEffect(() => {
    void refreshUsage();
  }, [refreshUsage, isSignedIn]);

  const { rememberRecent } = library;
  const onResult = useCallback(
    async (response: AnalyzeResponse) => {
      await rememberRecent(response);
    },
    [rememberRecent]
  );

  const analysis = useAnalysis({
    isSignedIn,
    onResult,
    onUsageChange: refreshUsage,
    onLoginRequired: () => setLoginModalOpen(true),
  });

  const { result, busy, openPaper } = analysis;
  const routePaperId = route.page === "paper" ? route.paperId : null;

  // Load the paper named in the URL (deep links, back/forward, library clicks).
  useEffect(() => {
    if (!routePaperId || busy) return;
    if (result?.paper.id === routePaperId) return;
    void openPaper(routePaperId);
    // `busy` and `result` are read as guards only, so they are left out of the deps on purpose.
  }, [routePaperId, openPaper]);

  const activeResult = result && routePaperId === result.paper.id ? result : null;

  return (
    <div className="relative min-h-screen bg-[var(--color-blush-paper)] font-sans text-[var(--color-carbon-ink)]">
      <AppShell activePage={route.page} usage={usage}>
        {route.page === "home" && (
          <HomePage
            {...analysis.form}
            busy={busy}
            error={analysis.error}
            usage={usage}
            isSignedIn={isSignedIn}
            onAnalyze={() => void analysis.analyze()}
          />
        )}

        {route.page === "library" && (
          <LibraryPage
            saved={library.saved}
            recents={library.recents}
            isSignedIn={isSignedIn}
            onOpenPaper={(paper) => navigatePaper(paper.id)}
            onNavigateHome={() => navigatePage("home")}
          />
        )}

        {route.page === "search" && <SearchPage />}

        {route.page === "review" && <ReviewPage />}

        {route.page === "paper" && activeResult && (
          <PaperDetailPage
            key={activeResult.paper.id}
            result={activeResult}
            isBookmarked={library.saved.some((p) => p.id === activeResult.paper.id)}
            onToggleBookmark={() => void library.toggleBookmark(activeResult.paper)}
            onBack={() => navigatePage("library")}
          />
        )}
      </AppShell>

      <LoginRequiredModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      <AnalysisLoadingOverlay
        visible={busy}
        messages={LOADING_MESSAGES}
        msgIdx={analysis.msgIdx}
        stage={analysis.stage}
        onCancel={analysis.stop}
      />
    </div>
  );
}
