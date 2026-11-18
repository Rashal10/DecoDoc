import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { DecoDocLogo } from "../ui/decodoc-logo";
import { navigateHome } from "../../lib/auth-nav";
import { AuthShowcase } from "./AuthShowcase";

type AuthLayoutProps = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ eyebrow, title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="auth2-page">
      <section className="auth2-form-col">
        <header className="auth2-header">
          <button
            type="button"
            onClick={() => navigateHome()}
            className="auth2-logo-btn"
            aria-label="DecoDoc home"
          >
            <DecoDocLogo />
          </button>
          <button type="button" className="auth2-back" onClick={() => navigateHome()}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span>Back to app</span>
          </button>
        </header>

        <div className="auth2-mobile-banner" aria-hidden>
          <p>
            Forty pages in. <span>Five minutes out.</span>
          </p>
        </div>

        <main className="auth2-main">
          <div className="auth2-card">
            {eyebrow ? <p className="auth2-eyebrow animate-element">{eyebrow}</p> : null}
            <h1 className="auth2-title animate-element animate-delay-100">{title}</h1>
            {subtitle ? <p className="auth2-subtitle animate-element animate-delay-200">{subtitle}</p> : null}
            <div className="animate-element animate-delay-300">{children}</div>
            {footer ? <div className="auth2-footer animate-element animate-delay-400">{footer}</div> : null}
          </div>
        </main>

        <p className="auth2-legal">© {new Date().getFullYear()} DecoDoc</p>
      </section>

      <aside className="auth2-showcase-col" aria-label="What DecoDoc does">
        <AuthShowcase />
      </aside>
    </div>
  );
}
