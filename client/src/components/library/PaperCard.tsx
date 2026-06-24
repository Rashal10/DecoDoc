import type { Paper } from "@decodoc/shared";
import { detectDomain } from "@decodoc/shared";
import { CardSpotlight } from "../ui/aceternity/card-spotlight";

type PaperCardProps = {
  paper: Paper;
  onOpen: (paper: Paper) => void;
};

export function PaperCard({ paper, onOpen }: PaperCardProps) {
  const domain = detectDomain(paper.title, paper.abstract);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(paper);
    }
  }

  return (
    <CardSpotlight
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(paper)}
      onKeyDown={handleKeyDown}
      aria-label={`Open paper: ${paper.title}`}
    >
      <h3 className="text-body-lg font-semibold mb-2 line-clamp-2">{paper.title}</h3>
      <p className="text-caption text-[var(--color-fossil-gray)] mb-3 line-clamp-2">
        {paper.authors.join(", ")}
      </p>
      <div className="flex items-center justify-between text-nano text-[var(--color-fossil-gray)]">
        <span className="badge text-[10px] py-0.5 px-2 uppercase tracking-wider">{domain}</span>
        <span>{paper.year ?? paper.venue ?? ""}</span>
      </div>
    </CardSpotlight>
  );
}
