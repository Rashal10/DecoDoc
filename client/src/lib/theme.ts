import { useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "decodoc:theme";
const listeners = new Set<() => void>();

function readStored(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function currentTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  if (attr === "light" || attr === "dark") return attr;
  return readStored() ?? systemTheme();
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  for (const listener of listeners) listener();
}

export function setTheme(theme: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked; the choice lasts for this page view.
  }
  apply(theme);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): Theme {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as Theme);

  // Follow the OS setting until the person picks a theme themselves.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = () => {
      if (!readStored()) apply(systemTheme());
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return theme;
}
