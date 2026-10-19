import { describe, expect, it } from "vitest";
import { keepConfirmedAncestors, titlesLooselyMatch } from "./genealogyCheck";
import type { GenealogyEntry } from "@decodoc/shared";

const entry = (title: string): GenealogyEntry => ({
  title,
  authors: "Vaswani",
  year: 2017,
  contribution: "Introduced attention.",
});

describe("genealogy checks", () => {
  it("matches titles after punctuation and case changes", () => {
    expect(titlesLooselyMatch("Attention Is All You Need", "attention is all you need")).toBe(true);
    expect(titlesLooselyMatch("BERT", "GPT-2")).toBe(false);
  });

  it("drops misses, keeps network failures, and confirms hits", () => {
    const result = keepConfirmedAncestors(
      [entry("Real Paper"), entry("Unknown Paper"), entry("Offline Paper")],
      [true, false, null]
    );
    expect(result.map((item) => item.title)).toEqual(["Real Paper", "Offline Paper"]);
    expect(result[0]?.confidence).toBe("confirmed");
    expect(result[1]?.confidence).toBe("inferred");
  });
});
