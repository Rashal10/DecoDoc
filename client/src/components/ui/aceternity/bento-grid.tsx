import { cn } from "../../../lib/utils";

type BentoGridProps = {
  className?: string;
  children?: React.ReactNode;
};

export function BentoGrid({ className, children }: BentoGridProps) {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

type BentoGridItemProps = {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
};

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
}: BentoGridItemProps) {
  return (
    <div
      className={cn(
        "surface-card group/bento relative flex flex-col p-6 transition-shadow duration-300 hover:shadow-sm",
        className
      )}
    >
      {header}
      <div className="mt-4 shrink-0">
        {icon}
        <div className="mt-3 font-sans text-lg font-semibold text-[var(--color-carbon-ink)]">
          {title}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-fossil-gray)]">
          {description}
        </p>
      </div>
    </div>
  );
}
