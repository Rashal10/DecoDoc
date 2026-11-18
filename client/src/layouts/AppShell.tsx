import type { ReactNode } from "react";
import { SiteFooter } from "../components/layout/SiteFooter";
import { SiteHeader } from "../components/layout/SiteHeader";
import type { UsageStatus } from "../lib/api";
import type { AppRoute } from "../lib/routes";

type AppShellProps = {
  activePage: AppRoute["page"];
  usage?: UsageStatus | null;
  children: ReactNode;
};

export function AppShell({ activePage, usage, children }: AppShellProps) {
  return (
    <>
      <a href="#main" className="sr-only">
        Skip to main content
      </a>
      <SiteHeader activePage={activePage} usage={usage} />
      <div id="main" className="pt-[4.25rem]">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
