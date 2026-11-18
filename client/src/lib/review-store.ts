import { useEffect, useState, useSyncExternalStore } from "react";
import { get, set } from "idb-keyval";
import type { AnalyzeResponse } from "@decodoc/shared";
import { createReviewCard, isDue, scheduleCard, type Rating, type ReviewCard } from "./srs";

const STORE_KEY = "decodoc:review-cards";

let cards: ReviewCard[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function isReviewCard(value: unknown): value is ReviewCard {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<ReviewCard>;
  return (
    typeof c.id === "string" &&
    typeof c.paperId === "string" &&
    typeof c.front === "string" &&
    typeof c.back === "string" &&
    typeof c.due === "string" &&
    typeof c.ease === "number" &&
    typeof c.interval === "number"
  );
}

export function loadReviewCards(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (!loading) {
    loading = get<unknown>(STORE_KEY)
      .then((stored) => {
        cards = Array.isArray(stored) ? stored.filter(isReviewCard) : [];
      })
      .catch(() => {
        cards = [];
      })
      .finally(() => {
        loaded = true;
        emit();
      });
  }
  return loading;
}

async function commit(next: ReviewCard[]) {
  cards = next;
  emit();
  try {
    await set(STORE_KEY, next);
  } catch {
    // Storage unavailable (private mode). The deck still works for this tab.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  return cards;
}

/** Adds every flashcard from an analysis. Cards already in the deck keep their progress. */
export async function addPaperToReview(result: AnalyzeResponse): Promise<number> {
  await loadReviewCards();
  const existing = new Set(cards.map((c) => c.id));
  const now = new Date();
  const added = result.analysis.flashcards
    .filter((fc) => fc.front.trim() && fc.back.trim())
    .map((fc) => createReviewCard(result.paper.id, result.paper.title, fc, now))
    .filter((card) => {
      if (existing.has(card.id)) return false;
      existing.add(card.id);
      return true;
    });
  if (added.length) await commit([...cards, ...added]);
  return added.length;
}

export async function removePaperFromReview(paperId: string): Promise<void> {
  await loadReviewCards();
  await commit(cards.filter((c) => c.paperId !== paperId));
}

export async function rateReviewCard(id: string, rating: Rating): Promise<void> {
  await loadReviewCards();
  const now = new Date();
  await commit(cards.map((c) => (c.id === id ? scheduleCard(c, rating, now) : c)));
}

export function useReviewCards(): { cards: ReviewCard[]; ready: boolean } {
  const all = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    void loadReviewCards();
  }, []);
  return { cards: all, ready: loaded };
}

/** Number of due cards, re-checked every minute so the badge updates without a reload. */
export function useDueCount(): number {
  const { cards: all } = useReviewCards();
  // The tick only forces a re-render; "now" is read fresh on every render so new cards count immediately.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const now = new Date();
  return all.filter((c) => isDue(c, now)).length;
}

/** For tests. */
export function __resetReviewStoreForTests() {
  cards = [];
  loaded = false;
  loading = null;
  emit();
}
