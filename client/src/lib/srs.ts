import type { AnalysisFlashcard } from "@decodoc/shared";

/** One flashcard in the review deck, with its SM-2 scheduling state. */
export type ReviewCard = {
  id: string;
  paperId: string;
  paperTitle: string;
  front: string;
  back: string;
  hint?: string;
  /** SM-2 ease factor (minimum 1.3). */
  ease: number;
  /** Current interval in days (0 while still learning). */
  interval: number;
  /** Successful reviews in a row. */
  reps: number;
  lapses: number;
  /** ISO timestamp of when the card is next due. */
  due: string;
  addedAt: string;
  lastReviewedAt?: string;
};

export type Rating = "again" | "hard" | "good" | "easy";

export const RATINGS: Rating[] = ["again", "hard", "good", "easy"];

const DAY_MS = 24 * 60 * 60 * 1000;
const RELEARN_MS = 10 * 60 * 1000;
const MIN_EASE = 1.3;
const START_EASE = 2.5;
const MAX_INTERVAL_DAYS = 365 * 3;

function hashText(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function cardId(paperId: string, front: string): string {
  return `${paperId}::${hashText(front.trim().toLowerCase())}`;
}

export function createReviewCard(
  paperId: string,
  paperTitle: string,
  card: Pick<AnalysisFlashcard, "front" | "back" | "hint">,
  now = new Date()
): ReviewCard {
  return {
    id: cardId(paperId, card.front),
    paperId,
    paperTitle,
    front: card.front,
    back: card.back,
    hint: card.hint || undefined,
    ease: START_EASE,
    interval: 0,
    reps: 0,
    lapses: 0,
    due: now.toISOString(),
    addedAt: now.toISOString(),
  };
}

function clampInterval(days: number): number {
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(days)));
}

/** SM-2 style scheduling. Pure: returns a new card. */
export function scheduleCard(card: ReviewCard, rating: Rating, now = new Date()): ReviewCard {
  const reviewed = { ...card, lastReviewedAt: now.toISOString() };

  if (rating === "again") {
    return {
      ...reviewed,
      reps: 0,
      interval: 0,
      lapses: card.lapses + 1,
      ease: Math.max(MIN_EASE, card.ease - 0.2),
      due: new Date(now.getTime() + RELEARN_MS).toISOString(),
    };
  }

  let interval: number;
  let ease = card.ease;
  if (rating === "hard") {
    interval = card.reps === 0 ? 1 : clampInterval(card.interval * 1.2);
    ease = Math.max(MIN_EASE, ease - 0.15);
  } else if (rating === "good") {
    interval = card.reps === 0 ? 1 : card.reps === 1 ? 3 : clampInterval(card.interval * ease);
  } else {
    interval = card.reps === 0 ? 4 : clampInterval(card.interval * ease * 1.3);
    ease += 0.15;
  }

  return {
    ...reviewed,
    reps: card.reps + 1,
    interval,
    ease: Math.round(ease * 100) / 100,
    due: new Date(now.getTime() + interval * DAY_MS).toISOString(),
  };
}

export function isDue(card: ReviewCard, now = new Date()): boolean {
  return new Date(card.due).getTime() <= now.getTime();
}

/** Due cards, oldest first. */
export function dueCards(cards: ReviewCard[], now = new Date()): ReviewCard[] {
  return cards.filter((c) => isDue(c, now)).sort((a, b) => a.due.localeCompare(b.due));
}

/** Short label for when a rating would next show the card, e.g. "10m", "3d", "2mo". */
export function intervalLabel(card: ReviewCard, rating: Rating, now = new Date()): string {
  const next = scheduleCard(card, rating, now);
  const ms = new Date(next.due).getTime() - now.getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const days = Math.round(ms / DAY_MS);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round((days / 365) * 10) / 10}y`;
}

function ankiField(text: string): string {
  return text.replace(/[\t\r\n]+/g, " ").trim();
}

function ankiTag(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "paper"
  );
}

/**
 * Tab-separated export that Anki imports directly (File → Import).
 * Columns: front, back, tags.
 */
export function toAnkiTsv(cards: ReviewCard[]): string {
  const lines = ["#separator:tab", "#html:false", "#tags column:3"];
  for (const card of cards) {
    const back = card.hint ? `${card.back} (hint: ${card.hint})` : card.back;
    lines.push([ankiField(card.front), ankiField(back), `decodoc ${ankiTag(card.paperTitle)}`].join("\t"));
  }
  return `${lines.join("\n")}\n`;
}
