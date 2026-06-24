import { useEffect, useRef } from "react";
import { useReducedMotion } from "./use-reduced-motion";

export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduced) {
      el.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  return ref;
}
