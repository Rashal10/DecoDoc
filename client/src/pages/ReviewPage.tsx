import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Lightbulb, PartyPopper, Repeat, Trash2 } from "lucide-react";
import { downloadTextFile } from "../lib/export";
import { rateReviewCard, removePaperFromReview, useReviewCards } from "../lib/review-store";
import { navigatePage, navigatePaper } from "../lib/routes";
import { dueCards, intervalLabel, RATINGS, toAnkiTsv, type Rating, type ReviewCard } from "../lib/srs";
import { slugify } from "../lib/app-utils";
import { cn } from "../lib/utils";

const RATING_LABEL: Record<Rating, string> = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };

function isSameDay(iso: string | undefined, now: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function formatNextDue(cards: ReviewCard[], now: Date): string {
  const upcoming = cards
    .map((c) => new Date(c.due).getTime())
    .filter((t) => t > now.getTime())
    .sort((a, b) => a - b)[0];
  if (!upcoming) return "";
  const minutes = Math.round((upcoming - now.getTime()) / 60000);
  if (minutes < 60) return `in ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} h`;
  return new Date(upcoming).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

type Deck = { paperId: string; title: string; cards: ReviewCard[]; due: number };

export function ReviewPage() {
  const { cards, ready } = useReviewCards();
  const [queue, setQueue] = useState<string[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);
  const now = new Date();

  // Build the session queue once the deck has loaded.
  useEffect(() => {
    if (!ready || queue !== null) return;
    setQueue(dueCards(cards).map((c) => c.id));
  }, [ready, cards, queue]);

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const liveQueue = (queue ?? []).filter((id) => byId.has(id));
  const current = liveQueue.length ? byId.get(liveQueue[0]!) : undefined;

  const decks = useMemo<Deck[]>(() => {
    const at = new Date();
    const map = new Map<string, Deck>();
    for (const card of cards) {
      const deck = map.get(card.paperId) ?? { paperId: card.paperId, title: card.paperTitle, cards: [], due: 0 };
      deck.cards.push(card);
      if (new Date(card.due).getTime() <= at.getTime()) deck.due += 1;
      map.set(card.paperId, deck);
    }
    return [...map.values()].sort((a, b) => b.due - a.due || a.title.localeCompare(b.title));
  }, [cards]);

  const dueNow = dueCards(cards, now).length;
  const reviewedToday = cards.filter((c) => isSameDay(c.lastReviewedAt, now)).length;

  const rate = async (rating: Rating) => {
    if (!current) return;
    const id = current.id;
    await rateReviewCard(id, rating);
    setQueue((q) => {
      const rest = (q ?? []).filter((x) => x !== id);
      // Missed cards come back at the end of this session.
      return rating === "again" ? [...rest, id] : rest;
    });
    setSessionDone((n) => n + 1);
    setRevealed(false);
    setShowHint(false);
  };

  // Keyboard: Space/Enter reveals, 1–4 grade.
  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed) {
        const index = ["1", "2", "3", "4"].indexOf(event.key);
        const rating = RATINGS[index];
        if (rating) {
          event.preventDefault();
          void rate(rating);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const exportAll = () => downloadTextFile(toAnkiTsv(cards), "decodoc-flashcards.txt", "text/tab-separated-values");

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24">
        <div className="related-skeleton" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:py-24 flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow mb-3">Spaced repetition</p>
          <h1 className="text-heading font-semibold tracking-tight">Review</h1>
          <p className="mt-2 max-w-lg text-body text-[var(--color-fossil-gray)]">
            Each card comes back right before you'd forget it. Cards you know well show up less and less often.
          </p>
        </div>
        {cards.length > 0 && (
          <button type="button" className="glass-button" onClick={exportAll}>
            <Download className="h-4 w-4" aria-hidden />
            Export all to Anki
          </button>
        )}
      </div>

      {cards.length > 0 && (
        <div className="review-stats">
          <div>
            <strong>{dueNow}</strong>
            <span>due now</span>
          </div>
          <div>
            <strong>{reviewedToday}</strong>
            <span>reviewed today</span>
          </div>
          <div>
            <strong>{cards.length}</strong>
            <span>cards in deck</span>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="review-empty">
          <Repeat className="h-10 w-10" aria-hidden />
          <h2>Your review deck is empty</h2>
          <p>
            Open any analyzed paper, go to <strong>Study → Flashcards</strong>, and choose <strong>Add cards</strong>. They'll
            show up here when they're due.
          </p>
          <button type="button" className="btn-primary" onClick={() => navigatePage("library")}>
            Go to your library
          </button>
        </div>
      ) : current ? (
        <section className="review-card" aria-label="Flashcard review">
          <div className="review-card-top">
            <button type="button" className="review-card-paper" onClick={() => navigatePaper(current.paperId)}>
              {current.paperTitle}
            </button>
            <span className="review-card-count">{liveQueue.length} left</span>
          </div>

          <p className="review-card-front">{current.front}</p>

          {current.hint && !revealed ? (
            showHint ? (
              <p className="review-card-hint">
                <Lightbulb className="h-4 w-4" aria-hidden /> {current.hint}
              </p>
            ) : (
              <button type="button" className="review-hint-btn" onClick={() => setShowHint(true)}>
                <Lightbulb className="h-4 w-4" aria-hidden /> Show hint
              </button>
            )
          ) : null}

          {revealed ? (
            <>
              <div className="review-card-back" aria-live="polite">
                {current.back}
              </div>
              <div className="review-ratings" role="group" aria-label="How well did you remember?">
                {RATINGS.map((rating, i) => (
                  <button
                    key={rating}
                    type="button"
                    className={cn("review-rating", `is-${rating}`)}
                    onClick={() => void rate(rating)}
                  >
                    <span className="review-rating-label">{RATING_LABEL[rating]}</span>
                    <span className="review-rating-when">{intervalLabel(current, rating)}</span>
                    <kbd aria-hidden>{i + 1}</kbd>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button type="button" className="review-reveal" onClick={() => setRevealed(true)}>
              <Eye className="h-4 w-4" aria-hidden />
              Show answer
              <kbd aria-hidden>Space</kbd>
            </button>
          )}
        </section>
      ) : (
        <div className="review-empty is-done">
          <PartyPopper className="h-10 w-10" aria-hidden />
          <h2>{sessionDone > 0 ? `Done! ${sessionDone} ${sessionDone === 1 ? "review" : "reviews"} this session.` : "All caught up"}</h2>
          <p>
            {formatNextDue(cards, now)
              ? `Your next card is due ${formatNextDue(cards, now)}.`
              : "Nothing is scheduled yet."}
          </p>
          {dueNow > 0 && (
            <button type="button" className="btn-primary" onClick={() => setQueue(dueCards(cards).map((c) => c.id))}>
              Review {dueNow} more
            </button>
          )}
        </div>
      )}

      {decks.length > 0 && (
        <section aria-labelledby="review-decks">
          <h2 id="review-decks" className="text-subheading font-semibold mb-4">
            Decks
          </h2>
          <ul className="review-decks">
            {decks.map((deck) => (
              <li key={deck.paperId} className="review-deck">
                <button type="button" className="review-deck-title" onClick={() => navigatePaper(deck.paperId)}>
                  {deck.title}
                </button>
                <span className="review-deck-meta">
                  {deck.cards.length} {deck.cards.length === 1 ? "card" : "cards"}
                  {deck.due > 0 ? ` · ${deck.due} due` : ""}
                </span>
                <span className="review-deck-actions">
                  <button
                    type="button"
                    className="review-icon-btn"
                    onClick={() =>
                      downloadTextFile(
                        toAnkiTsv(deck.cards),
                        `${slugify(deck.title) || "paper"}-flashcards.txt`,
                        "text/tab-separated-values"
                      )
                    }
                    aria-label={`Export ${deck.title} to Anki`}
                    title="Export to Anki"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="review-icon-btn is-danger"
                    onClick={() => {
                      if (window.confirm(`Remove all ${deck.cards.length} cards for “${deck.title}” from your review deck?`)) {
                        void removePaperFromReview(deck.paperId);
                      }
                    }}
                    aria-label={`Remove ${deck.title} from review`}
                    title="Remove deck"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-caption text-[var(--color-fossil-gray)]">
            Review progress is saved in this browser. Anki files import with File → Import (front, back, tags).
          </p>
        </section>
      )}
    </div>
  );
}
