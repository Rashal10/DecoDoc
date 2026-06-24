import fetch from "node-fetch";
import type { CitationEdge, CitationNode, CitationNodeType, FutureDirection, Paper } from "@decodoc/shared";
import { config } from "./config";
import { normalizeArxivId } from "./paperIdentity";

function s2Headers(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.semanticScholarApiKey) {
    headers["x-api-key"] = config.semanticScholarApiKey;
  }
  return headers;
}

function titlesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function paperQuery(paper: Paper): string | null {
  if (paper.doi) return `DOI:${paper.doi}`;
  if (paper.arxivId) return `ARXIV:${normalizeArxivId(paper.arxivId) ?? paper.arxivId}`;
  return null;
}

function openAlexShortId(openAlexUrl: string): string {
  return openAlexUrl.replace("https://openalex.org/", "");
}

function formatOpenAlexAuthors(authorships: unknown): string {
  if (!Array.isArray(authorships)) return "Unknown";
  return authorships
    .map((entry) => (entry as { author?: { display_name?: string } }).author?.display_name)
    .filter(Boolean)
    .slice(0, 4)
    .join(", ") || "Unknown";
}

function assembleCitationGraph(
  paper: Paper,
  references: CitationNode[],
  citations: CitationNode[],
  citedByCount?: number
): { nodes: CitationNode[]; edges: CitationEdge[] } {
  const currentId = "current";
  const current: CitationNode = {
    id: currentId,
    title: paper.title,
    authors: paper.authors.slice(0, 4).join(", "),
    year: paper.year ?? new Date().getFullYear(),
    type: "current",
    citationCount: citedByCount ?? paper.citationCount ?? 0
  };

  const nodes = [current, ...references, ...citations];
  const edges: CitationEdge[] = [
    ...references.map((r) => ({ source: currentId, target: r.id, relationship: "builds on" })),
    ...citations.map((c) => ({ source: c.id, target: currentId, relationship: "cites" }))
  ];

  return { nodes, edges };
}

function formatAuthors(authors: unknown): string {
  if (typeof authors === "string") return authors;
  if (Array.isArray(authors)) {
    return authors
      .map((a) => (typeof a === "string" ? a : (a as { name?: string }).name))
      .filter(Boolean)
      .slice(0, 4)
      .join(", ");
  }
  return "Unknown";
}

export function normalizeCitationType(type: string): CitationNodeType {
  const t = type.toLowerCase().trim();
  if (t === "current") return "current";
  if (
    t === "reference" ||
    t === "references" ||
    t.includes("reference") ||
    t.includes("ancestor") ||
    t.includes("foundational") ||
    t.includes("prior")
  ) {
    return "reference";
  }
  if (
    t === "citation" ||
    t === "citations" ||
    t.includes("citation") ||
    t.includes("descendant") ||
    t.includes("influenced") ||
    t.includes("citing") ||
    t.includes("follow")
  ) {
    return "citation";
  }
  return "reference";
}

export function normalizeFutureDirections(raw: unknown): FutureDirection[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => ({
        title: String((item as FutureDirection).title ?? "").trim(),
        description: String((item as FutureDirection).description ?? "").trim()
      }))
      .filter((d) => d.title && d.description);
  }
  if (typeof raw === "string" && raw.trim()) {
    const chunks = raw
      .split(/\*\*\d+\.\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (chunks.length > 1) {
      return chunks.map((chunk) => {
        const [titleLine, ...rest] = chunk.split(/\*\*/);
        const title = (titleLine ?? chunk).replace(/[:：]\s*$/, "").trim();
        const description = rest.join("").replace(/^\s*[:：]?\s*/, "").trim() || chunk;
        return { title, description };
      });
    }
    return [{ title: "Research Directions", description: raw.replace(/\*\*/g, "").trim() }];
  }
  return [];
}

async function fetchS2PaperList(
  paperKey: string,
  endpoint: "references" | "citations",
  limit: number
): Promise<CitationNode[]> {
  const paperField = endpoint === "citations" ? "citingPaper" : "citedPaper";
  const fields = `${paperField}.paperId,${paperField}.title,${paperField}.authors,${paperField}.year,${paperField}.citationCount`;
  const url = `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperKey)}/${endpoint}?fields=${fields}&limit=${limit}`;

  try {
    const res = await fetch(url, {
      headers: s2Headers(),
      signal: AbortSignal.timeout(12000)
    });
    if (res.status === 429) {
      console.warn(`Semantic Scholar rate limited for ${endpoint}; set SEMANTIC_SCHOLAR_API_KEY or retry later.`);
      return [];
    }
    if (!res.ok) return [];

    const data = (await res.json()) as { data?: Array<Record<string, unknown>> };
    const nodes: CitationNode[] = [];
    for (const [idx, item] of (data.data ?? []).entries()) {
      const p = (item[paperField] ?? item) as Record<string, unknown>;
      if (!p?.title) continue;
      nodes.push({
        id: String(p.paperId ?? `${endpoint}-${idx}`),
        title: String(p.title),
        authors: formatAuthors(p.authors),
        year: Number(p.year ?? 0),
        type: endpoint === "citations" ? "citation" : "reference",
        citationCount: Number(p.citationCount ?? 0)
      });
    }
    return nodes;
  } catch (error) {
    console.warn(`Semantic Scholar citation/reference fetch failed for ${endpoint}:`, error);
    return [];
  }
}

export async function buildCitationsFromSemanticScholar(
  paper: Paper
): Promise<{ nodes: CitationNode[]; edges: CitationEdge[] } | null> {
  const key = paperQuery(paper);
  if (!key) return null;

  const [references, citations] = await Promise.all([
    fetchS2PaperList(key, "references", 6),
    fetchS2PaperList(key, "citations", 8)
  ]);

  if (references.length === 0 && citations.length === 0) return null;

  return assembleCitationGraph(paper, references, citations);
}

async function fetchOpenAlexWork(
  paper: Paper
): Promise<{ id: string; cited_by_count: number; referenced_works: string[] } | null> {
  type OpenAlexRow = {
    id: string;
    cited_by_count?: number;
    referenced_works?: string[];
    title?: string;
    ids?: { arxiv?: string };
  };

  async function queryList(url: string): Promise<OpenAlexRow | null> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) return null;
      const data = (await res.json()) as { results?: OpenAlexRow[] };
      return data.results?.[0] ?? null;
    } catch (error) {
      console.warn("OpenAlex list lookup failed:", error);
      return null;
    }
  }

  const listUrls: string[] = [];
  if (paper.doi) {
    listUrls.push(
      `https://api.openalex.org/works?filter=doi:${encodeURIComponent(paper.doi)}&select=id,cited_by_count,referenced_works,title&per_page=1`
    );
  }
  if (paper.arxivId) {
    const bare = normalizeArxivId(paper.arxivId) ?? paper.arxivId.replace(/^arxiv:/i, "");
    listUrls.push(
      `https://api.openalex.org/works?filter=ids.arxiv:${encodeURIComponent(bare)}&select=id,cited_by_count,referenced_works,title&per_page=1`
    );
  }

  for (const url of listUrls) {
    const work = await queryList(url);
    if (work?.id) {
      return {
        id: work.id,
        cited_by_count: work.cited_by_count ?? 0,
        referenced_works: work.referenced_works ?? []
      };
    }
  }

  // Title search — arXiv DOI filters often miss OpenAlex records (e.g. Attention Is All You Need).
  try {
    const searchUrl = `https://api.openalex.org/works?search=${encodeURIComponent(paper.title)}&select=id,cited_by_count,referenced_works,title,ids&per_page=5`;
    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: OpenAlexRow[] };
    const bareArxiv = paper.arxivId ? normalizeArxivId(paper.arxivId) : null;
    const match = (data.results ?? []).find((work) => {
      if (bareArxiv && work.ids?.arxiv?.includes(bareArxiv)) return true;
      return work.title ? titlesMatch(work.title, paper.title) : false;
    });
    if (!match?.id) return null;
    return {
      id: match.id,
      cited_by_count: match.cited_by_count ?? 0,
      referenced_works: match.referenced_works ?? []
    };
  } catch (error) {
    console.warn("OpenAlex title search failed:", error);
    return null;
  }
}

async function fetchOpenAlexCitations(openAlexShortId: string): Promise<CitationNode[]> {
  try {
    const res = await fetch(
      `https://api.openalex.org/works?filter=cites:${encodeURIComponent(openAlexShortId)}&per_page=8&select=title,publication_year,cited_by_count,authorships`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) return [];

    const data = (await res.json()) as {
      results?: Array<{
        id?: string;
        title?: string;
        publication_year?: number;
        cited_by_count?: number;
        authorships?: unknown;
      }>;
    };

    return (data.results ?? []).map((work, idx) => ({
      id: String(work.id ?? `openalex-citation-${idx}`),
      title: String(work.title ?? "Unknown"),
      authors: formatOpenAlexAuthors(work.authorships),
      year: Number(work.publication_year ?? 0),
      type: "citation" as CitationNodeType,
      citationCount: Number(work.cited_by_count ?? 0)
    }));
  } catch (error) {
    console.warn("OpenAlex citing-papers fetch failed:", error);
    return [];
  }
}

async function fetchOpenAlexReferences(referencedWorks: string[]): Promise<CitationNode[]> {
  const ids = referencedWorks.slice(0, 6).map(openAlexShortId).filter(Boolean);
  if (ids.length === 0) return [];

  try {
    const res = await fetch(
      `https://api.openalex.org/works?filter=openalex:${ids.join("|")}&per_page=6&select=title,publication_year,cited_by_count,authorships`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) return [];

    const data = (await res.json()) as {
      results?: Array<{
        id?: string;
        title?: string;
        publication_year?: number;
        cited_by_count?: number;
        authorships?: unknown;
      }>;
    };

    return (data.results ?? []).map((work, idx) => ({
      id: String(work.id ?? `openalex-reference-${idx}`),
      title: String(work.title ?? "Unknown"),
      authors: formatOpenAlexAuthors(work.authorships),
      year: Number(work.publication_year ?? 0),
      type: "reference" as CitationNodeType,
      citationCount: Number(work.cited_by_count ?? 0)
    }));
  } catch (error) {
    console.warn("OpenAlex references fetch failed:", error);
    return [];
  }
}

export async function buildCitationsFromOpenAlex(
  paper: Paper
): Promise<{ nodes: CitationNode[]; edges: CitationEdge[] } | null> {
  const work = await fetchOpenAlexWork(paper);
  if (!work) return null;

  const shortId = openAlexShortId(work.id);
  const [references, citations] = await Promise.all([
    fetchOpenAlexReferences(work.referenced_works),
    fetchOpenAlexCitations(shortId)
  ]);

  if (references.length === 0 && citations.length === 0) return null;

  return assembleCitationGraph(paper, references, citations, work.cited_by_count);
}

export async function resolveCitationNetwork(
  paper: Paper
): Promise<{ nodes: CitationNode[]; edges: CitationEdge[] }> {
  const semanticScholar = await buildCitationsFromSemanticScholar(paper);
  if (semanticScholar && semanticScholar.nodes.some((node) => node.type !== "current")) {
    return semanticScholar;
  }

  const openAlex = await buildCitationsFromOpenAlex(paper);
  if (openAlex) return openAlex;

  return semanticScholar ?? assembleCitationGraph(paper, [], []);
}

export function normalizeCitationGraph(
  raw: { nodes?: unknown[]; edges?: unknown[] },
  paper?: Paper
): { nodes: CitationNode[]; edges: CitationEdge[] } {
  const currentId = "current";
  const aliases = new Set<string>([currentId]);
  if (paper) {
    aliases.add(paper.id.toLowerCase());
    aliases.add(paper.title.toLowerCase());
    const acronym = paper.title
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .map((w) => w[0])
      .join("")
      .toLowerCase();
    if (acronym.length >= 2) aliases.add(acronym);
    if (paper.title.toLowerCase().includes("segment anything")) aliases.add("sam");
  }

  const resolveId = (id: string): string => {
    const norm = id.trim().toLowerCase();
    if (aliases.has(norm)) return currentId;
    if (paper && norm === paper.title.trim().toLowerCase()) return currentId;
    return id.trim();
  };

  const nodes = (raw.nodes ?? [])
    .map((n, idx) => {
      const node = n as Record<string, unknown>;
      const title = String(node.title ?? "Unknown");
      const isPaperNode =
        paper && title.trim().toLowerCase() === paper.title.trim().toLowerCase();
      return {
        id: String(node.id ?? `node-${idx}`),
        title,
        authors: formatAuthors(node.authors),
        year: Number(node.year ?? 0),
        type: isPaperNode ? ("current" as CitationNodeType) : normalizeCitationType(String(node.type ?? "reference")),
        citationCount: Number(node.citationCount ?? 0)
      };
    })
    .filter((n) => n.title !== "Unknown" || n.authors !== "Unknown")
    .filter((n) => n.type !== "current" || !paper || n.title.trim().toLowerCase() === paper.title.trim().toLowerCase());

  const deduped = new Map<string, CitationNode>();
  for (const node of nodes) {
    if (node.type === "current") continue;
    deduped.set(node.id, node);
  }

  const finalNodes: CitationNode[] = [];
  if (paper) {
    finalNodes.push({
      id: currentId,
      title: paper.title,
      authors: paper.authors.slice(0, 4).join(", "),
      year: paper.year ?? new Date().getFullYear(),
      type: "current",
      citationCount: paper.citationCount ?? 0
    });
  }
  finalNodes.push(...deduped.values());

  const validIds = new Set(finalNodes.map((n) => n.id));
  const edges = (raw.edges ?? [])
    .map((e) => {
      const edge = e as Record<string, unknown>;
      return {
        source: resolveId(String(edge.source ?? "")),
        target: resolveId(String(edge.target ?? "")),
        relationship: String(edge.relationship ?? "related")
      };
    })
    .filter((e) => validIds.has(e.source) && validIds.has(e.target) && e.source !== e.target);

  return { nodes: finalNodes, edges };
}
