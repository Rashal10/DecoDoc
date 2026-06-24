import { useSyncExternalStore } from "react";

function subscribeToPath(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getPathname() {
  return window.location.pathname;
}

/** Reactive pathname for lightweight SPA routing (no react-router). */
export function usePathname() {
  return useSyncExternalStore(subscribeToPath, getPathname, () => "/");
}

export function navigateTo(path: string) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function navigateHome() {
  navigateTo("/");
}

export const SIGN_IN_PATH = "/sign-in";
export const SIGN_UP_PATH = "/sign-up";
