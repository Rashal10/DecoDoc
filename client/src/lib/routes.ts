import { navigateTo, paperIdFromPath, paperPath } from "./auth-nav";

export type AppRoute =
  | { page: "home" }
  | { page: "library" }
  | { page: "search" }
  | { page: "review" }
  | { page: "paper"; paperId: string };

export type NavPage = "home" | "library" | "search" | "review";

export const ROUTE_PATHS: Record<NavPage, string> = {
  home: "/",
  library: "/library",
  search: "/search",
  review: "/review",
};

export function parseAppRoute(pathname: string): AppRoute {
  const paperId = paperIdFromPath(pathname);
  if (paperId) return { page: "paper", paperId };
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === ROUTE_PATHS.library) return { page: "library" };
  if (clean === ROUTE_PATHS.search) return { page: "search" };
  if (clean === ROUTE_PATHS.review) return { page: "review" };
  return { page: "home" };
}

export function navigatePage(page: NavPage) {
  navigateTo(ROUTE_PATHS[page]);
  window.scrollTo({ top: 0 });
}

export function navigatePaper(id: string) {
  navigateTo(paperPath(id));
  window.scrollTo({ top: 0 });
}
