import { ParallaxHeroImages } from "../ui/parallax-hero-images";
import { Signature } from "../ui/signature";
import { Spotlight } from "../ui/aceternity/spotlight";
import { GridBackground } from "../ui/aceternity/grid-background";
import { TextGenerateEffect } from "../ui/aceternity/text-generate-effect";
import { MovingBorder } from "../ui/aceternity/moving-border";
import { HERO_IMAGES } from "../../lib/app-utils";

type HeroSectionProps = {
  onCtaClick: () => void;
  onSignIn?: () => void;
  isSignedIn?: boolean;
};

export function HeroSection({ onCtaClick, onSignIn, isSignedIn }: HeroSectionProps) {
  return (
    <section className="relative flex min-h-[82vh] w-full flex-col items-center justify-center overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-blush-paper)] px-4 py-20">
      <GridBackground className="absolute inset-0 opacity-[0.4]" />
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="#f7f3f1" />
      <ParallaxHeroImages images={HERO_IMAGES} imageClassName="opacity-85" />
      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(247,243,241,0.92) 0%, rgba(247,243,241,0.55) 55%, transparent 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 text-center">
        <div className="flex flex-col items-center gap-5">
          <Signature
            text="DecoDoc"
            color="var(--color-pumpkin-orange)"
            fontSize={40}
            duration={1.2}
            className="scale-110 md:scale-125 drop-shadow-[0_0_10px_rgba(247,243,241,0.65)]"
          />
          <h1 className="hero-quote font-dialogue text-[var(--color-carbon-ink)] max-w-4xl px-2 mt-1 text-balance">
            <span className="hero-quote-mark text-[var(--color-carbon-ink)]/20" aria-hidden="true">
              “
            </span>
            Read the paper once. Keep the parts that matter.
            <span className="hero-quote-mark text-[var(--color-carbon-ink)]/20" aria-hidden="true">
              ”
            </span>
          </h1>
        </div>

        <TextGenerateEffect
          words="Structured summaries, scores, flashcards, and citation context from arXiv, DOI, or PDF."
          className="max-w-2xl leading-relaxed"
        />

        <div className="mt-4 flex flex-col items-center gap-4">
          <button type="button" onClick={onCtaClick} className="border-0 bg-transparent p-0 cursor-pointer">
            <MovingBorder>Start Decoding Papers</MovingBorder>
          </button>
          {!isSignedIn && onSignIn && (
            <p className="text-caption text-[var(--color-fossil-gray)]">
              Already have an account?{" "}
              <button
                type="button"
                onClick={onSignIn}
                className="border-0 bg-transparent p-0 font-semibold text-[var(--color-pumpkin-orange)] cursor-pointer hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
