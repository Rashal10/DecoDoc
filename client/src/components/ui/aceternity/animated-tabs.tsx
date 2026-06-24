import { motion } from "framer-motion";
import { cn } from "../../../lib/utils";

export type TabItem<T extends string = string> = {
  id: T;
  label: string;
};

type AnimatedTabsProps<T extends string> = {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
};

export function AnimatedTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  className,
  size = "md",
  ariaLabel = "Tabs",
}: AnimatedTabsProps<T>) {
  const pad = size === "sm" ? "px-3 py-1.5 text-caption" : "px-4 py-2.5 text-caption";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-1 overflow-x-auto scrollbar-none border-b border-[var(--color-border)] pb-px [-ms-overflow-style:none] [scrollbar-width:none]",
        className
      )}
    >
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative shrink-0 font-semibold transition-colors",
              pad,
              selected ? "text-[var(--color-carbon-ink)]" : "text-[var(--color-fossil-gray)] hover:text-[var(--color-carbon-ink)]"
            )}
          >
            {selected && (
              <motion.span
                layoutId="active-tab-indicator"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--color-pumpkin-orange)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
