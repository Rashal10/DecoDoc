import { useCallback, useEffect, useState } from "react";
import type { AnalyzeResponse, Paper } from "@decodoc/shared";
import { getRecents, getSaved, mergeBookmarksOnLogin, saveRecent, toggleSaved } from "../lib/storage";

/** Bookmarks and recently viewed analyses. Bookmarks sync to the account when signed in. */
export function useLibrary(isSignedIn: boolean) {
  const [saved, setSaved] = useState<Paper[]>([]);
  const [recents, setRecents] = useState<AnalyzeResponse[]>([]);

  const refresh = useCallback(async () => {
    const [nextSaved, nextRecents] = await Promise.all([getSaved(), getRecents()]);
    setSaved(nextSaved);
    setRecents(nextRecents);
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    if (!isSignedIn) return;
    void mergeBookmarksOnLogin()
      .then(setSaved)
      .catch(() => {
        // Bookmark sync failed; the local library still works.
      });
  }, [isSignedIn]);

  const rememberRecent = useCallback(
    async (response: AnalyzeResponse) => {
      await saveRecent(response);
      await refresh();
    },
    [refresh]
  );

  const toggleBookmark = useCallback(
    async (paper: Paper) => {
      setSaved(await toggleSaved(paper, { syncServer: isSignedIn }));
    },
    [isSignedIn]
  );

  return { saved, recents, rememberRecent, toggleBookmark };
}
