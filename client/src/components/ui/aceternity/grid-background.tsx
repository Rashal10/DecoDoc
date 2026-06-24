import { cn } from "../../../lib/utils";

type GridBackgroundProps = {
  className?: string;
  gridClassName?: string;
  children?: React.ReactNode;
};

export function GridBackground({ className, gridClassName, children }: GridBackgroundProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          "[background-size:40px_40px]",
          "[background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)]",
          gridClassName
        )}
        aria-hidden
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
