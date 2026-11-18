import type { Paper, SubjectDomain } from "@decodoc/shared";
import { detectDomain } from "@decodoc/shared";

export type LibrarySort = "recent" | "title" | "year-desc" | "year-asc";
export type DomainFilter = SubjectDomain | "all";

export type LibraryFilter = {
  query: string;
  sort: LibrarySort;
  domain: DomainFilter;
};

export const DEFAULT_FILTER: LibraryFilter = { query: "", sort: "recent", domain: "all" };

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

function matchesQuery(paper: Paper, query: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalize(
    [paper.title, paper.authors.join(" "), paper.venue ?? "", paper.arxivId ?? "", paper.doi ?? "", String(paper.year ?? "")].join(
      " "
    )
  );
  return terms.every((term) => haystack.includes(term));
}

/** Filters and sorts papers. "recent" keeps the incoming order (newest first). */
export function filterPapers(papers: Paper[], filter: LibraryFilter): Paper[] {
  const filtered = papers.filter(
    (paper) =>
      matchesQuery(paper, filter.query) &&
      (filter.domain === "all" || detectDomain(paper.title, paper.abstract ?? "") === filter.domain)
  );

  if (filter.sort === "recent") return filtered;
  const sorted = [...filtered];
  if (filter.sort === "title") {
    sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  } else {
    const dir = filter.sort === "year-desc" ? -1 : 1;
    sorted.sort((a, b) => {
      // Papers without a year always go last.
      if (a.year == null && b.year == null) return 0;
      if (a.year == null) return 1;
      if (b.year == null) return -1;
      return (a.year - b.year) * dir;
    });
  }
  return sorted;
}

/** Domains present in the list, for the filter chips. */
export function domainsIn(papers: Paper[]): SubjectDomain[] {
  const seen = new Set<SubjectDomain>();
  for (const paper of papers) seen.add(detectDomain(paper.title, paper.abstract ?? ""));
  return [...seen].sort();
}
