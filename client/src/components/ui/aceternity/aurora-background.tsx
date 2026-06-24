import { cn } from "../../../lib/utils";

type AuroraBackgroundProps = {
  className?: string;
  children?: React.ReactNode;
};

/** Aceternity-style aurora — tuned for DecoDoc dark panels (orange + blue). */
export function AuroraBackground({ className, children }: AuroraBackgroundProps) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-[var(--color-carbon-ink)]", className)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className={cn(
            "auth-aurora absolute -inset-[12px] opacity-60 blur-[12px] will-change-[background-position]",
            "[--aurora:repeating-linear-gradient(100deg,#c24e00_8%,#ffb380_14%,#2563eb_20%,#93c5fd_26%,#c24e00_32%)]",
            "[background-image:var(--aurora)]",
            "[background-size:300%_200%]",
            "[background-position:50%_50%]",
            "animate-aurora",
            "[mask-image:radial-gradient(ellipse_at_50%_0%,black_20%,transparent_75%)]"
          )}
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>
      {children ? (
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">{children}</div>
      ) : null}
    </div>
  );
}
