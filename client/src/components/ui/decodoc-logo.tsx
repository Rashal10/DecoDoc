import { cn } from "../../lib/utils";

type DecoDocLogoProps = {
  className?: string;
  showTagline?: boolean;
  compact?: boolean;
  wordmarkOnly?: boolean;
  monochrome?: boolean;
  inverted?: boolean;
};

const LOGO_SRC = "/images/decodoc-logo.png";

export function DecoDocLogo({
  className = "",
  showTagline = false,
  compact = false,
  wordmarkOnly = false,
  monochrome = false,
  inverted = false,
}: DecoDocLogoProps) {
  const iconClass = compact ? "h-8 w-8" : "h-9 w-9";
  const textColor = inverted ? "#ffffff" : "var(--color-carbon-ink)";
  const docColor = inverted
    ? "#ffb380"
    : monochrome
      ? "var(--color-carbon-ink)"
      : "var(--color-pumpkin-orange)";
  const taglineColor = inverted ? "rgba(255,255,255,0.6)" : "var(--color-fossil-gray)";
  const textSize = compact ? "text-[1.15rem]" : "text-[1.35rem]";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {!wordmarkOnly && (
        <img
          src={LOGO_SRC}
          alt=""
          aria-hidden
          className={cn(iconClass, "shrink-0 object-contain bg-transparent")}
          draggable={false}
        />
      )}

      {(!compact || wordmarkOnly) && (
        <div className="flex flex-col justify-center leading-none">
          <span
            className={cn("font-sans font-semibold tracking-[-0.045em]", textSize)}
            style={{ color: textColor }}
          >
            Deco<span style={{ color: docColor }}>Doc</span>
          </span>
          {showTagline ? (
            <span
              className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em]"
              style={{ color: taglineColor }}
            >
              Paper analysis
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
