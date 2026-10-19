import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

function overflowEdges(el: HTMLDivElement) {
  const max = el.scrollWidth - el.clientWidth;
  return {
    left: el.scrollLeft > 2,
    right: max - el.scrollLeft > 2,
  };
}

export function AnimatedTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  className,
  size = "md",
  ariaLabel = "Tabs",
}: AnimatedTabsProps<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const pad = size === "sm" ? "px-3 py-1.5 text-caption" : "px-4 py-2.5 text-caption";

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const sync = () => {
      const edges = overflowEdges(el);
      setCanLeft(edges.left);
      setCanRight(edges.right);
    };

    const active = el.querySelector<HTMLElement>('[aria-selected="true"]');
    if (active) {
      const left = active.offsetLeft;
      const right = left + active.offsetWidth;
      const viewLeft = el.scrollLeft;
      const viewRight = viewLeft + el.clientWidth;
      if (left < viewLeft + 40) el.scrollLeft = Math.max(0, left - 44);
      else if (right > viewRight - 40) el.scrollLeft = right - el.clientWidth + 44;
    }

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    el.addEventListener("scroll", sync, { passive: true });

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 2) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", sync);
      el.removeEventListener("wheel", onWheel);
    };
  }, [activeTab, tabs]);

  const moveTab = (direction: -1 | 1) => {
    const index = tabs.findIndex((tab) => tab.id === activeTab);
    const next = tabs[index + direction];
    if (!next) return;
    onTabChange(next.id);
    requestAnimationFrame(() => {
      scrollerRef.current?.querySelector<HTMLElement>(`#tab-${next.id}`)?.focus();
    });
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      {canLeft && (
        <button
          type="button"
          aria-label="Show earlier tabs"
          className="absolute left-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-solid)] text-[var(--color-carbon-ink)] shadow-sm"
          onClick={() => scrollerRef.current?.scrollBy({ left: -220, behavior: "smooth" })}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
      )}
      <div
        ref={scrollerRef}
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          "flex min-w-0 gap-1 overflow-x-auto border-b border-[var(--color-border)] pb-px [scrollbar-width:thin]",
          canLeft && "pl-10",
          canRight && "pr-10"
        )}
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
      {canRight && (
        <button
          type="button"
          aria-label="Show later tabs"
          className="absolute right-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-solid)] text-[var(--color-carbon-ink)] shadow-sm"
          onClick={() => scrollerRef.current?.scrollBy({ left: 220, behavior: "smooth" })}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
