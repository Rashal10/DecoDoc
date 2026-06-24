import type { ReactNode } from "react";
import { SiteFooter } from "../components/layout/SiteFooter";
import { SiteHeader } from "../components/layout/SiteHeader";
import type { ActivePage } from "../lib/app-utils";

import type { UsageStatus } from "../lib/api";

type AppShellProps = {
  activePage: ActivePage;
  onNavigate: (page: "home" | "library") => void;
  usage?: UsageStatus | null;
  children: ReactNode;
};

export function AppShell({ activePage, onNavigate, usage, children }: AppShellProps) {
  return (
    <>
      <a href="#main" className="sr-only">
        Skip to main content
      </a>
      <SiteHeader activePage={activePage} onNavigate={onNavigate} usage={usage} />
      <div id="main" className="pt-[4.25rem]">
        {children}
      </div>
      <SiteFooter onNavigate={onNavigate} />
    </>
  );
}
