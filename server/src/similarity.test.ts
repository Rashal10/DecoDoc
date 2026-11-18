import { describe, expect, it } from "vitest";
import { relationKind, toRelated, toSearchResults } from "./similarity";

const paper = (id: string, year?: number, abstract = "A short abstract.") => ({
  id,
  title: `Paper ${id}`,
  authors: ["A. Author"],
  abstract,
  year,
  score: 0.9,
  embedding: [1, 2, 3],
});

describe("similarity helpers", () => {
  it("labels related papers by publication year", () => {
    expect(relationKind(2020, 2017)).toBe("foundational");
    expect(relationKind(2020, 2023)).toBe("follow-up");
    expect(relationKind(2020, 2020)).toBe("similar");
    expect(relationKind(undefined, 2020)).toBe("similar");
  });

  it("strips embeddings from related and search results", () => {
    const [related] = toRelated([paper("a", 2015)], 2020);
    expect(related?.kind).toBe("foundational");
    expect(related?.paper).not.toHaveProperty("embedding");

    const [result] = toSearchResults([paper("b", 2021, "word ".repeat(100))]);
    expect(result?.paper).not.toHaveProperty("embedding");
    expect(result?.highlights[0]?.length).toBeLessThanOrEqual(221);
    expect(result?.highlights[0]?.endsWith("…")).toBe(true);
  });
});
