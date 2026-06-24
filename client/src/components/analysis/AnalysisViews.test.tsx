import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalysisSectionView, FlashcardDeck, HeadlineBanner, ProseBlock, VerdictBadge } from "./AnalysisViews";

describe("AnalysisSectionView", () => {
  it("renders lead and bullets", () => {
    render(
      <AnalysisSectionView
        title="Problem"
        section={{
          lead: "The field lacks scalable attention.",
          bullets: ["Removes recurrence", "Uses parallel attention"],
          detail: "This changed NLP forever."
        }}
      />
    );
    expect(screen.getByText("Problem")).toBeInTheDocument();
    expect(screen.getByText("The field lacks scalable attention.")).toBeInTheDocument();
    expect(screen.getByText("Removes recurrence")).toBeInTheDocument();
    expect(screen.getByText("This changed NLP forever.")).toBeInTheDocument();
  });
});

describe("HeadlineBanner", () => {
  it("renders headline in quotes", () => {
    render(<HeadlineBanner headline="Attention is the new convolution" />);
    expect(screen.getByText(/Attention is the new convolution/)).toBeInTheDocument();
  });

  it("renders nothing for empty headline", () => {
    const { container } = render(<HeadlineBanner headline="" />);
    expect(container.firstChild).toBeNull();
  });
});

describe("VerdictBadge", () => {
  it("shows READ NOW for read-now verdicts", () => {
    render(<VerdictBadge lead="READ NOW: Foundational architecture paper." />);
    expect(screen.getByText("READ NOW")).toBeInTheDocument();
  });

  it("shows SKIM for skim verdicts", () => {
    render(<VerdictBadge lead="SKIM: Incremental improvement only." />);
    expect(screen.getByText("SKIM")).toBeInTheDocument();
  });
});

describe("ProseBlock", () => {
  it("renders single-asterisk italics without showing raw markdown", () => {
    const { container } = render(
      <ProseBlock text="MoE models like DeepSeek-V3 offer lower costs for *total* and *active* parameters." />
    );
    expect(container.textContent).toContain("total");
    expect(container.textContent).toContain("active");
    expect(container.textContent).not.toContain("*total*");
    expect(container.textContent).not.toContain("*active*");
    expect(container.querySelectorAll("em")).toHaveLength(2);
  });

  it("renders double-asterisk bold text", () => {
    const { container } = render(<ProseBlock text="This is **important** context." />);
    expect(container.querySelector("strong")?.textContent).toBe("important");
  });
});

describe("FlashcardDeck", () => {
  it("flips card on click", () => {
    render(
      <FlashcardDeck
        cards={[
          {
            front: "What is attention?",
            hint: "Think Q, K, V",
            back: "A mechanism for weighted aggregation.",
            category: "Core Concepts",
            difficulty: "Easy"
          }
        ]}
      />
    );

    const card = screen.getByRole("button", { name: /Card 1: reveal answer/i });
    expect(card).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(card);

    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(card).toHaveClass("is-flipped");
    expect(screen.getByText("A mechanism for weighted aggregation.")).toBeInTheDocument();
  });
});
