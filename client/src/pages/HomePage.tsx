import { HeroSection } from "../components/home/HeroSection";
import { FeatureBento } from "../components/home/FeatureBento";
import { AnalyzePanel } from "../components/home/AnalyzePanel";
import { navigateTo, SIGN_IN_PATH } from "../lib/auth-nav";
import type { InputMode } from "../lib/app-utils";

type HomePageProps = {
  mode: InputMode;
  setMode: (mode: InputMode) => void;
  value: string;
  setValue: (v: string) => void;
  pdf: File | null;
  setPdf: (f: File | null) => void;
  abstractTitle: string;
  setAbstractTitle: (v: string) => void;
  busy: boolean;
  error: string;
  usage?: import("../lib/api").UsageStatus | null;
  isSignedIn?: boolean;
  onAnalyze: () => void;
};

export function HomePage({ isSignedIn, ...props }: HomePageProps) {
  const scrollToAnalyze = () => {
    document.getElementById("analyze")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <HeroSection
        onCtaClick={scrollToAnalyze}
        onSignIn={() => navigateTo(SIGN_IN_PATH)}
        isSignedIn={isSignedIn}
      />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 md:py-24 flex flex-col gap-20 md:gap-28">
        <FeatureBento />
        <AnalyzePanel {...props} />
      </div>
    </>
  );
}
