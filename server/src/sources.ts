import fetch from "node-fetch";
import { nanoid } from "nanoid";
import type { Paper } from "@decodoc/shared";
import { normalizeArxivId } from "./paperIdentity";

export function extractArxivId(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/(?:arxiv\.org\/(?:abs|pdf)\/)?([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?|[a-z-]+\/[0-9]{7})(?:\.pdf)?/i);
  return match?.[1] ? normalizeArxivId(match[1]) : null;
}

function xmlText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

export async function fetchArxiv(value: string): Promise<Paper> {
  const arxivId = extractArxivId(value);
  if (!arxivId) throw new Error("Could not read an arXiv ID from that input.");
  const res = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`, {
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`arXiv returned ${res.status}`);
  const xml = await res.text();
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/i)?.[1];
  if (!entry) throw new Error("No arXiv paper found.");

  const returnedId = extractArxivId(xmlText(entry, "id"));
  if (returnedId && returnedId !== arxivId) {
    throw new Error(`arXiv returned ${returnedId} instead of the requested ${arxivId}.`);
  }

  const authors = [...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/gi)].map((m) => (m[1] ?? "").trim());
  const published = xmlText(entry, "published");
  return {
    id: `arxiv:${arxivId}`,
    title: xmlText(entry, "title"),
    authors,
    abstract: xmlText(entry, "summary"),
    year: published ? Number(published.slice(0, 4)) : undefined,
    arxivId,
    url: `https://arxiv.org/abs/${arxivId}`
  };
}

export async function fetchDoi(doi: string): Promise<Paper> {
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi.trim())}`, {
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`Crossref returned ${res.status}`);
  const data = (await res.json()) as any;
  const item = data.message;
  return {
    id: `doi:${doi.trim().toLowerCase()}`,
    title: item.title?.[0] ?? doi,
    authors: (item.author ?? []).map((a: any) => [a.given, a.family].filter(Boolean).join(" ")).filter(Boolean),
    abstract: (item.abstract ?? "No abstract available from Crossref. Paste an abstract for deeper analysis.").replace(/<[^>]+>/g, ""),
    year: item.issued?.["date-parts"]?.[0]?.[0],
    venue: item["container-title"]?.[0],
    doi: doi.trim(),
    url: item.URL
  };
}

export async function enrichSemanticScholar(paper: Paper): Promise<Paper> {
  // arXiv metadata from export.arxiv.org is authoritative. S2 has returned unrelated papers.
  if (paper.arxivId) return paper;

  try {
    const hasAuthoritativeId = Boolean(paper.doi);
    const query = paper.doi ? `DOI:${paper.doi}` : paper.title;
    if (!query) return paper;

    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(query)}?fields=title,abstract,year,venue,citationCount,authors,url,externalIds`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) return paper;
    const data = (await res.json()) as any;

    if (hasAuthoritativeId) {
      return {
        ...paper,
        venue: data.venue ?? paper.venue,
        citationCount: data.citationCount ?? paper.citationCount,
        url: data.url ?? paper.url,
        year: paper.year ?? data.year
      };
    }

    return {
      ...paper,
      title: data.title ?? paper.title,
      authors: data.authors?.map((a: any) => a.name).filter(Boolean) ?? paper.authors,
      abstract: data.abstract ?? paper.abstract,
      year: data.year ?? paper.year,
      venue: data.venue ?? paper.venue,
      citationCount: data.citationCount ?? paper.citationCount,
      url: data.url ?? paper.url
    };
  } catch (error) {
    console.warn("Semantic Scholar enrichment failed/timed out, returning original metadata:", error);
    return paper;
  }
}

export function paperFromText(text: string, title = "Pasted abstract"): Paper {
  return {
    id: `local:${nanoid(10)}`,
    title,
    authors: ["Unknown"],
    abstract: text,
    venue: "User provided"
  };
}

