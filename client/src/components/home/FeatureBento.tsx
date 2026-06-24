import { Archive, Brain, Network, SearchCheck } from "lucide-react";
import { BentoGrid, BentoGridItem } from "../ui/aceternity/bento-grid";
import { useScrollReveal } from "../../hooks/use-scroll-reveal";
import { cn } from "../../lib/utils";

const BENTO_MEDIA = {
  deepAnalysis: "/images/bento/deep-analysis.mp4",
  validityScores: "/images/bento/validity-scores.png",
  researchContext: "/images/bento/research-context.png",
  researchLibrary: "/images/bento/research-library.png",
} as const;

function BentoMediaHeader({
  kind,
  src,
  alt,
  wide = false,
}: {
  kind: "video" | "image";
  src: string;
  alt: string;
  wide?: boolean;
}) {
  const mediaClassName =
    kind === "video"
      ? "absolute inset-0 h-full w-full object-cover object-top"
      : "absolute inset-0 h-full w-full object-contain object-top p-1";

  return (
    <div
      className={cn(
        "relative w-full shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-blush-paper)]",
        wide ? "h-40 md:h-44" : "h-36 md:h-40"
      )}
    >
      {kind === "video" ? (
        <video
          src={src}
          className={mediaClassName}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-label={alt}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          className={mediaClassName}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      )}
    </div>
  );
}

export function FeatureBento() {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section ref={ref} className="reveal-on-scroll w-full">
      <p className="text-eyebrow mb-3 text-center">Capabilities</p>
      <h2 className="text-subheading font-semibold text-center mb-10 text-[var(--color-carbon-ink)]">
        Everything you need to decode a paper
      </h2>

      <BentoGrid>
        <BentoGridItem
          className="md:col-span-2"
          title="Deep Analysis"
          description="Problem framing, novelty, method, results, and limitations — structured for fast comprehension."
          icon={<Brain className="h-5 w-5 text-[var(--color-fossil-gray)]" />}
          header={
            <BentoMediaHeader
              kind="video"
              src={BENTO_MEDIA.deepAnalysis}
              alt="Deep analysis walkthrough"
              wide
            />
          }
        />
        <BentoGridItem
          title="Validity Scores"
          description="Difficulty, hype, reproducibility, and impact at a glance."
          icon={<SearchCheck className="h-5 w-5 text-[var(--color-fossil-gray)]" />}
          header={
            <BentoMediaHeader
              kind="image"
              src={BENTO_MEDIA.validityScores}
              alt="Validity scores dashboard"
            />
          }
        />
        <BentoGridItem
          title="Research Context"
          description="Prerequisite roadmaps, citation maps, and prior work this paper builds on."
          icon={<Network className="h-5 w-5 text-[var(--color-fossil-gray)]" />}
          header={
            <BentoMediaHeader
              kind="image"
              src={BENTO_MEDIA.researchContext}
              alt="Research context and citation map"
            />
          }
        />
        <BentoGridItem
          className="md:col-span-2"
          title="Researcher Library"
          description="Bookmark papers and revisit your last ten analyses — all stored locally in your browser."
          icon={<Archive className="h-5 w-5 text-[var(--color-fossil-gray)]" />}
          header={
            <BentoMediaHeader
              kind="image"
              src={BENTO_MEDIA.researchLibrary}
              alt="Researcher library with saved papers"
              wide
            />
          }
        />
      </BentoGrid>
    </section>
  );
}
