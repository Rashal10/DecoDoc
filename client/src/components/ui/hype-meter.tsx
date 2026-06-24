import { motion } from "framer-motion";
import type { HypeLevel } from "@decodoc/shared";
import { useReducedMotion } from "../../hooks/use-reduced-motion";

type HypeMeterProps = {
  rating: number;
  level: HypeLevel;
  index?: number;
};

export function HypeMeter({ rating, level, index = 0 }: HypeMeterProps) {
  const reduced = useReducedMotion();
  const targetWidth = `${Math.min(100, Math.max(0, rating))}%`;
  const levelKey = level.toLowerCase() as "high" | "moderate" | "low";

  return (
    <div className="hype-meter" role="presentation" aria-hidden>
      <motion.div
        className={`hype-meter-fill hype-meter-fill--${levelKey}`}
        initial={{ width: reduced ? targetWidth : "0%" }}
        animate={{ width: targetWidth }}
        transition={{
          duration: reduced ? 0 : 1,
          ease: [0.22, 1, 0.36, 1],
          delay: reduced ? 0 : index * 0.08,
        }}
      >
        {!reduced && (
          <motion.span
            className="hype-meter-shine"
            animate={{ x: ["-120%", "220%"] }}
            transition={{
              duration: 2.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.2,
              repeatDelay: 0.4,
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
