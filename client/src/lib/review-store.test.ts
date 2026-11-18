import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyzeResponse } from "@decodoc/shared";

const memory = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (key: string) => memory.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    memory.set(key, value);
  }),
}));

const store = await import("./review-store");

function result(paperId: string, fronts: string[]): AnalyzeResponse {
  return {
    paper: { id: paperId, title: `Paper ${paperId}`, authors: [], abstract: "" },
    analysis: {
      flashcards: fronts.map((front) => ({ front, back: `${front} answer`, category: "core", difficulty: "easy" })),
    },
  } as unknown as AnalyzeResponse;
}

async function readCards() {
  await store.loadReviewCards();
  return (memory.get("decodoc:review-cards") as Array<{ id: string; paperId: string; reps: number }>) ?? [];
}

describe("review store", () => {
  beforeEach(() => {
    memory.clear();
    store.__resetReviewStoreForTests();
  });

  it("adds a paper's cards once and keeps progress on re-add", async () => {
    expect(await store.addPaperToReview(result("p1", ["A", "B", "B", " "]))).toBe(2);
    const [first] = await readCards();
    await store.rateReviewCard(first!.id, "good");
    expect(await store.addPaperToReview(result("p1", ["A", "B", "C"]))).toBe(1);
    const cards = await readCards();
    expect(cards).toHaveLength(3);
    expect(cards.find((c) => c.id === first!.id)?.reps).toBe(1);
  });

  it("removes every card for a paper", async () => {
    await store.addPaperToReview(result("p1", ["A"]));
    await store.addPaperToReview(result("p2", ["B"]));
    await store.removePaperFromReview("p1");
    expect((await readCards()).map((c) => c.paperId)).toEqual(["p2"]);
  });
});
