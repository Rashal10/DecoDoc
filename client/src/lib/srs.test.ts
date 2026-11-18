import { describe, expect, it } from "vitest";
import { cardId, createReviewCard, dueCards, intervalLabel, isDue, scheduleCard, toAnkiTsv } from "./srs";

const NOW = new Date("2026-03-01T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function freshCard() {
  return createReviewCard("arxiv:1706.03762", "Attention Is All You Need", { front: "Q?", back: "A." }, NOW);
}

describe("spaced repetition", () => {
  it("creates cards that are due immediately with stable ids", () => {
    const card = freshCard();
    expect(isDue(card, NOW)).toBe(true);
    expect(card.id).toBe(cardId("arxiv:1706.03762", "  q? "));
  });

  it("follows the 1 → 3 → ease × interval progression for Good", () => {
    let card = scheduleCard(freshCard(), "good", NOW);
    expect(card.interval).toBe(1);
    card = scheduleCard(card, "good", NOW);
    expect(card.interval).toBe(3);
    card = scheduleCard(card, "good", NOW);
    expect(card.interval).toBe(Math.round(3 * 2.5));
    expect(new Date(card.due).getTime() - NOW.getTime()).toBe(card.interval * DAY);
  });

  it("resets on Again and lowers ease without going under 1.3", () => {
    let card = scheduleCard(scheduleCard(freshCard(), "good", NOW), "good", NOW);
    card = scheduleCard(card, "again", NOW);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(1);
    expect(card.interval).toBe(0);
    expect(new Date(card.due).getTime() - NOW.getTime()).toBe(10 * 60 * 1000);
    for (let i = 0; i < 20; i += 1) card = scheduleCard(card, "again", NOW);
    expect(card.ease).toBe(1.3);
  });

  it("gives Easy a longer interval than Good, and Hard a shorter one", () => {
    const base = scheduleCard(scheduleCard(freshCard(), "good", NOW), "good", NOW);
    const hard = scheduleCard(base, "hard", NOW).interval;
    const good = scheduleCard(base, "good", NOW).interval;
    const easy = scheduleCard(base, "easy", NOW).interval;
    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });

  it("lists due cards oldest first and labels intervals", () => {
    const a = { ...freshCard(), id: "a", due: new Date(NOW.getTime() - 2 * DAY).toISOString() };
    const b = { ...freshCard(), id: "b", due: new Date(NOW.getTime() - DAY).toISOString() };
    const c = { ...freshCard(), id: "c", due: new Date(NOW.getTime() + DAY).toISOString() };
    expect(dueCards([c, b, a], NOW).map((x) => x.id)).toEqual(["a", "b"]);
    expect(intervalLabel(freshCard(), "again", NOW)).toBe("10m");
    expect(intervalLabel(freshCard(), "good", NOW)).toBe("1d");
    expect(intervalLabel(freshCard(), "easy", NOW)).toBe("4d");
  });

  it("exports Anki-ready TSV without stray tabs or newlines", () => {
    const card = createReviewCard("p1", "Segment Anything!", { front: "Line\tone\nnext", back: "Answer", hint: "think" }, NOW);
    const tsv = toAnkiTsv([card]);
    const lines = tsv.trim().split("\n");
    expect(lines.slice(0, 3)).toEqual(["#separator:tab", "#html:false", "#tags column:3"]);
    expect(lines[3]).toBe("Line one next\tAnswer (hint: think)\tdecodoc segment-anything");
  });
});
