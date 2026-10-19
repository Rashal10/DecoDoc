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
  const pad = size === "sm" ? "px-3 py-2 text-caption" : "px-3 py-2.5 text-caption sm:px-4";

  const moveTab = (direction: -1 | 1) => {
    const index = tabs.findIndex((tab) => tab.id === activeTab);
    const next = tabs[index + direction];
    if (!next) return;
    onTabChange(next.id);
    requestAnimationFrame(() => {
      document.getElementById(`tab-${next.id}`)?.focus();
    });
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex min-w-0 flex-wrap gap-x-1 gap-y-1 border-b border-[var(--color-border)]", className)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          moveTab(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveTab(-1);
        }
      }}
    >
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative font-semibold transition-colors",
              pad,
              selected ? "text-[var(--color-carbon-ink)]" : "text-[var(--color-fossil-gray)] hover:text-[var(--color-carbon-ink)]"
            )}
          >
            {selected && (
              <motion.span
                layoutId="active-tab-indicator"
                className="absolute inset-x-3 -bottom-px h-0.5 bg-[var(--color-pumpkin-orange)] sm:inset-x-4"
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
