import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, Layers, Shield, Zap } from "lucide-react";
import { AuroraBackground } from "../ui/aceternity/aurora-background";
import { Spotlight } from "../ui/aceternity/spotlight";
import { DecoDocLogo } from "../ui/decodoc-logo";
import { navigateHome } from "../../lib/auth-nav";

const FEATURES = [
  { icon: Layers, text: "Summaries, flashcards, and open questions from each paper" },
  { icon: BookOpen, text: "Library syncs across devices when you're signed in" },
  { icon: Zap, text: "Up to 10 paper analyses per day on a free account" },
  { icon: Shield, text: "Sign in with Google or email" },
] as const;

type AuthShellProps = {
  children: ReactNode;
  mobileTitle?: string;
  compact?: boolean;
};

export function AuthShell({ children, mobileTitle, compact }: AuthShellProps) {
  return (
    <div className="auth-page">
      <aside className="auth-page-brand">
        <AuroraBackground className="absolute inset-0">
          <Spotlight className="-top-24 left-0 md:left-10" fill="#c24e00" />
          <Spotlight className="-top-10 right-0 opacity-40" fill="#2563eb" />
        </AuroraBackground>

        <div className="auth-page-brand-content">
          <DecoDocLogo inverted />
          <div>
            <h1>Read papers with less overhead.</h1>
            <p className="auth-page-brand-lead">
              DecoDoc breaks each paper into clear sections — summary, methods, limitations,
              flashcards, and citation context.
            </p>
          </div>
          <ul className="auth-feature-list">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className="auth-feature-icon" aria-hidden>
                  <Icon className="h-3 w-3" />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="auth-page-form">
        <header className="auth-page-form-header">
          <button type="button" className="auth-back-link" onClick={() => navigateHome()}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to DecoDoc
          </button>
          <DecoDocLogo className="lg:hidden h-7" />
        </header>

        <div className="auth-page-form-body">
          <div className={`auth-form-card ${compact ? "auth-form-card--compact" : ""}`}>
            {mobileTitle && (
              <p className="lg:hidden text-eyebrow mb-4">{mobileTitle}</p>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
