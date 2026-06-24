import { cn } from "../../../lib/utils";

type MovingBorderProps = {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  borderClassName?: string;
  duration?: number;
};

export function MovingBorder({
  children,
  className,
  containerClassName,
  borderClassName,
  duration = 3000,
}: MovingBorderProps) {
  return (
    <div className={cn("relative inline-flex overflow-hidden rounded-xl p-[1px]", containerClassName)}>
      <div
        className={cn(
          "absolute inset-[-1000%] animate-[spin_var(--duration)_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,var(--color-pumpkin-orange)_0%,rgba(194,78,0,0.15)_50%,var(--color-pumpkin-orange)_100%)]",
          borderClassName
        )}
        style={{ "--duration": `${duration}ms` } as React.CSSProperties}
        aria-hidden
      />
      <div
        className={cn(
          "relative z-10 inline-flex items-center justify-center rounded-[11px] bg-[var(--color-pumpkin-orange)] px-8 py-4 text-body font-semibold text-white transition-shadow hover:shadow-lg",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
