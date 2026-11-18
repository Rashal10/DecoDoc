import { describe, expect, it } from "vitest";
import type { Paper } from "@decodoc/shared";
import { DEFAULT_FILTER, filterPapers } from "./library-filter";

const papers: Paper[] = [
  { id: "1", title: "Attention Is All You Need", authors: ["Ashish Vaswani"], abstract: "transformer attention neural network", year: 2017 },
  { id: "2", title: "BERT", authors: ["Jacob Devlin"], abstract: "language model pre-training", year: 2018 },
  { id: "3", title: "Ångström-scale imaging", authors: ["Zoë Example"], abstract: "", year: undefined },
];

describe("filterPapers", () => {
  it("keeps the incoming order by default", () => {
    expect(filterPapers(papers, DEFAULT_FILTER).map((p) => p.id)).toEqual(["1", "2", "3"]);
  });

  it("matches every term across title, authors and year, ignoring accents", () => {
    expect(filterPapers(papers, { ...DEFAULT_FILTER, query: "vaswani attention" }).map((p) => p.id)).toEqual(["1"]);
    expect(filterPapers(papers, { ...DEFAULT_FILTER, query: "2018" }).map((p) => p.id)).toEqual(["2"]);
    expect(filterPapers(papers, { ...DEFAULT_FILTER, query: "angstrom zoe" }).map((p) => p.id)).toEqual(["3"]);
    expect(filterPapers(papers, { ...DEFAULT_FILTER, query: "nothing-here" })).toEqual([]);
  });

  it("sorts by title and by year with undated papers last", () => {
    expect(filterPapers(papers, { ...DEFAULT_FILTER, sort: "title" }).map((p) => p.id)).toEqual(["3", "1", "2"]);
    expect(filterPapers(papers, { ...DEFAULT_FILTER, sort: "year-desc" }).map((p) => p.id)).toEqual(["2", "1", "3"]);
    expect(filterPapers(papers, { ...DEFAULT_FILTER, sort: "year-asc" }).map((p) => p.id)).toEqual(["1", "2", "3"]);
  });
});
