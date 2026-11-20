import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { navigatePage } from "../../lib/routes";

const WORDMARK = ["D", "e", "c", "o", "D", "o", "c"];

export function SiteFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const mark = wordmarkRef.current;
    if (!mark) return;
    const rect = mark.getBoundingClientRect();
    mark.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    mark.style.setProperty("--my", `${event.clientY - rect.top}px`);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const goToAnalyze = () => {
    navigatePage("home");
    window.requestAnimationFrame(() =>
      document.getElementById("analyze")?.scrollIntoView({ behavior: "smooth" })
    );
  };

  const renderLetters = () =>
    WORDMARK.map((letter, i) => (
      <span key={i} className="site-footer-letter" style={{ ["--i" as string]: i }}>
        {letter}
      </span>
    ));

  return (
    <footer
      ref={footerRef}
      className={`site-footer${revealed ? " is-revealed" : ""}`}
      onPointerMove={handlePointerMove}
    >
      <div className="site-footer-glow" aria-hidden />

      <div className="site-footer-inner">
        <div className="site-footer-cta-row">
          <h2 className="site-footer-headline">
            Got a paper?
            <br />
            <span className="site-footer-headline-accent">Decode it.</span>
          </h2>

          <div className="site-footer-actions">
            <button type="button" className="site-footer-cta" onClick={goToAnalyze}>
              Analyze a paper
              <span className="site-footer-cta-icon">
                <ArrowUpRight size={18} strokeWidth={2.25} />
              </span>
            </button>
            <button type="button" className="site-footer-ghost" onClick={() => navigatePage("library")}>
              Open library
            </button>
          </div>
        </div>

        <div className="site-footer-bar">
          <span className="site-footer-credit">
            Made by <span className="site-footer-credit-name">Rashal</span>
          </span>
          <button
            type="button"
            className="site-footer-top-btn"
            onClick={scrollToTop}
            aria-label="Back to top"
          >
            <ArrowUp size={16} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <div ref={wordmarkRef} className="site-footer-wordmark" aria-hidden>
        <div className="site-footer-wordmark-base">{renderLetters()}</div>
        <div className="site-footer-wordmark-spot">{renderLetters()}</div>
      </div>
    </footer>
  );
}
