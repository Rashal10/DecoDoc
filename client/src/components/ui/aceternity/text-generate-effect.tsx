import { useEffect } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { cn } from "../../../lib/utils";
import { useReducedMotion } from "../../../hooks/use-reduced-motion";

type TextGenerateEffectProps = {
  words: string;
  className?: string;
  duration?: number;
  filter?: boolean;
};

export function TextGenerateEffect({
  words,
  className,
  duration = 0.5,
  filter = true,
}: TextGenerateEffectProps) {
  const [scope, animate] = useAnimate();
  const reduced = useReducedMotion();
  const wordArray = words.split(" ");

  useEffect(() => {
    if (reduced) return;
    void animate(
      "span",
      { opacity: 1, filter: filter ? "blur(0px)" : "none" },
      { duration, delay: stagger(0.08) }
    );
  }, [animate, duration, filter, reduced]);

  if (reduced) {
    return <p className={cn("text-body-lg text-[var(--color-fossil-gray)]", className)}>{words}</p>;
  }

  return (
    <motion.p ref={scope} className={cn("text-body-lg text-[var(--color-fossil-gray)]", className)}>
      {wordArray.map((word, idx) => (
        <motion.span
          key={`${word}-${idx}`}
          className="opacity-0"
          style={{ filter: filter ? "blur(10px)" : "none" }}
        >
          {word}{" "}
        </motion.span>
      ))}
    </motion.p>
  );
}
