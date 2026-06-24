import { DecoDocLogo } from "../ui/decodoc-logo";

type SiteFooterProps = {
  onNavigate: (page: "home" | "library") => void;
};

export function SiteFooter({ onNavigate }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer px-4">
      <div className="site-footer-inner relative mx-auto max-w-6xl pt-12 pb-8">
        <div className="site-footer-top">
          <div className="site-footer-brand">
            <DecoDocLogo monochrome />
            <p className="site-footer-desc">
              Structured paper analysis for researchers and students.
            </p>
          </div>

          <div className="site-footer-columns">
            <div className="site-footer-column">
              <span className="site-footer-label">Product</span>
              <button type="button" className="site-footer-link" onClick={() => onNavigate("home")}>
                Analyze Papers
              </button>
              <button type="button" className="site-footer-link" onClick={() => onNavigate("library")}>
                Research Library
              </button>
            </div>

            <div className="site-footer-column">
              <span className="site-footer-label">Capabilities</span>
              <span className="site-footer-meta">Deep paper summaries</span>
              <span className="site-footer-meta">Learning roadmaps</span>
              <span className="site-footer-meta">Citation mapping</span>
            </div>
          </div>
        </div>

        <div className="site-footer-bottom">
          <span className="site-footer-copy">© {year} DecoDoc</span>
          <span className="site-footer-credit">Made by Rashal</span>
        </div>
      </div>
    </footer>
  );
}
