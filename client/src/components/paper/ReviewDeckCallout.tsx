import { useState } from "react";
import { Check, Plus, Repeat } from "lucide-react";
import type { AnalyzeResponse } from "@decodoc/shared";
import { addPaperToReview, removePaperFromReview, useReviewCards } from "../../lib/review-store";
import { navigatePage } from "../../lib/routes";
import { cardId, isDue } from "../../lib/srs";

export function ReviewDeckCallout({ result }: { result: AnalyzeResponse }) {
  const { cards, ready } = useReviewCards();
  const [working, setWorking] = useState(false);
  const paperId = result.paper.id;

  const inDeck = cards.filter((c) => c.paperId === paperId);
  const now = new Date();
  const due = inDeck.filter((c) => isDue(c, now)).length;
  const deckIds = new Set(inDeck.map((c) => c.id));
  const missing = result.analysis.flashcards.filter(
    (fc) => fc.front.trim() && fc.back.trim() && !deckIds.has(cardId(paperId, fc.front))
  ).length;

  const add = async () => {
    setWorking(true);
    try {
      await addPaperToReview(result);
    } finally {
      setWorking(false);
    }
  };

  if (!ready) return null;

  if (inDeck.length === 0) {
    return (
      <div className="review-callout">
        <span className="review-callout-icon" aria-hidden>
          <Repeat className="h-4 w-4" />
        </span>
        <div className="review-callout-text">
          <p className="review-callout-title">Remember this paper next month, not just today</p>
          <p className="review-callout-sub">
            Add these cards to your review deck. DecoDoc brings each one back right before you'd forget it.
          </p>
        </div>
        <button type="button" className="review-callout-btn" onClick={() => void add()} disabled={working}>
          <Plus className="h-4 w-4" aria-hidden />
          Add {missing} {missing === 1 ? "card" : "cards"}
        </button>
      </div>
    );
  }

  return (
    <div className="review-callout is-added">
      <span className="review-callout-icon" aria-hidden>
        <Check className="h-4 w-4" />
      </span>
      <div className="review-callout-text">
        <p className="review-callout-title">
          {inDeck.length} {inDeck.length === 1 ? "card" : "cards"} in your review deck
        </p>
        <p className="review-callout-sub">
          {due > 0 ? `${due} due now.` : "Nothing due right now. Check back later."}
          {missing > 0 ? ` ${missing} new ${missing === 1 ? "card" : "cards"} not added yet.` : ""}
        </p>
      </div>
      <div className="review-callout-actions">
        {missing > 0 ? (
          <button type="button" className="review-callout-ghost" onClick={() => void add()} disabled={working}>
            Add {missing} new
          </button>
        ) : null}
        <button
          type="button"
          className="review-callout-ghost"
          onClick={() => void removePaperFromReview(paperId)}
        >
          Remove
        </button>
        <button type="button" className="review-callout-btn" onClick={() => navigatePage("review")}>
          {due > 0 ? `Review ${due}` : "Open review"}
        </button>
      </div>
    </div>
  );
}
