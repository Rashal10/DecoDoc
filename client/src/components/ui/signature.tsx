import { useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import { parse as parseFont } from "opentype.js";
import { cn } from "../../lib/utils";

interface SignatureProps {
  text?: string;
  color?: string;
  fontSize?: number;
  duration?: number;
  delay?: number;
  className?: string;
  inView?: boolean;
  once?: boolean;
  fontUrl?: string;
}

const DEFAULT_FONT_URLS = [
  "/fonts/LastoriaBoldRegular.otf",
  "/LastoriaBoldRegular.otf",
  "https://www.componentry.fun/LastoriaBoldRegular.otf",
];

async function loadSignatureFont(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Font request failed (${response.status}) for ${url}`);
  }
  const buffer = await response.arrayBuffer();
  return parseFont(buffer);
}

export function Signature({
  text = "Signature",
  color = "currentColor",
  fontSize = 32,
  duration = 1.5,
  delay = 0,
  className,
  inView = false,
  once = true,
  fontUrl,
}: SignatureProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [width, setWidth] = useState<number>(text.length * fontSize * 0.6);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const height = fontSize * 3;
  const horizontalPadding = fontSize * 0.1;
  const topMargin = fontSize * 1.5;
  const baseline = topMargin;
  const maskId = `signature-reveal-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      const fontPaths = fontUrl ? [fontUrl] : DEFAULT_FONT_URLS;

      for (const path of fontPaths) {
        try {
          const font = await loadSignatureFont(path);
          if (cancelled) return;

          let x = horizontalPadding;
          const newPaths: string[] = [];

          for (const char of text) {
            const glyph = font.charToGlyph(char);
            const glyphPath = glyph.getPath(x, baseline, fontSize);
            newPaths.push(glyphPath.toPathData(3));

            const advanceWidth = glyph.advanceWidth ?? font.unitsPerEm;
            x += advanceWidth * (fontSize / font.unitsPerEm);
          }

          setPaths(newPaths);
          setWidth(x + horizontalPadding);
          setStatus("ready");
          return;
        } catch (error) {
          console.warn(`Signature font load failed for ${path}:`, error);
        }
      }

      if (!cancelled) {
        console.error("Signature component: no signature font could be loaded.");
        setPaths([]);
        setWidth(text.length * fontSize * 0.6);
        setStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [text, fontSize, baseline, horizontalPadding, fontUrl]);

  const variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { pathLength: 1, opacity: 1 },
  };

  if (status === "error") {
    return (
      <span
        className={cn("font-dialogue text-[var(--color-pumpkin-orange)]", className)}
        style={{ fontSize }}
        aria-label={text}
      >
        {text}
      </span>
    );
  }

  if (status === "loading" || paths.length === 0) {
    return (
      <span
        className={cn("inline-block opacity-0", className)}
        style={{ width, height, fontSize }}
        aria-hidden="true"
      >
        {text}
      </span>
    );
  }

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={cn("overflow-visible", className)}
      initial="hidden"
      whileInView={inView ? "visible" : undefined}
      animate={inView ? undefined : "visible"}
      viewport={{ once }}
      aria-label={text}
      role="img"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          {paths.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              stroke="white"
              strokeWidth={fontSize * 0.22}
              fill="none"
              variants={variants}
              transition={{
                pathLength: {
                  delay: delay + i * 0.2,
                  duration,
                  ease: "easeInOut",
                },
                opacity: {
                  delay: delay + i * 0.2 + 0.01,
                  duration: 0.01,
                },
              }}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </mask>
      </defs>

      {paths.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={2}
          fill="none"
          variants={variants}
          transition={{
            pathLength: {
              delay: delay + i * 0.2,
              duration,
              ease: "easeInOut",
            },
            opacity: {
              delay: delay + i * 0.2 + 0.01,
              duration: 0.01,
            },
          }}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="butt"
          strokeLinejoin="round"
        />
      ))}

      <g mask={`url(#${maskId})`}>
        {paths.map((d, i) => (
          <path key={i} d={d} fill={color} />
        ))}
      </g>
    </motion.svg>
  );
}
