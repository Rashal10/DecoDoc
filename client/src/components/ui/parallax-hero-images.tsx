import { memo, useEffect, useMemo } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { cn } from "../../lib/utils";
import { HeroImage } from "./hero-image";
import { useReducedMotion } from "../../hooks/use-reduced-motion";

type ImagePosition = {
  src: string;
  position:
    | "top-left"
    | "top-right"
    | "mid-left"
    | "mid-right"
    | "bottom-left"
    | "bottom-right"
    | "far-left"
    | "far-right";
  depth: number;
  delay: number;
  aspectRatio?: string;
};

const positionStyles: Record<
  ImagePosition["position"],
  { top: string; left?: string; right?: string }
> = {
  "top-left": { top: "8%", left: "4%" },
  "top-right": { top: "8%", right: "4%" },
  "mid-left": { top: "38%", left: "6%" },
  "mid-right": { top: "38%", right: "6%" },
  "bottom-left": { top: "68%", left: "4%" },
  "bottom-right": { top: "68%", right: "4%" },
  "far-left": { top: "52%", left: "2%" },
  "far-right": { top: "52%", right: "2%" },
};

const positionOrder: ImagePosition["position"][] = [
  "top-left",
  "top-right",
  "mid-left",
  "mid-right",
  "bottom-left",
  "bottom-right",
  "far-left",
  "far-right",
];

type DepthVariant = "default" | "edge-focus";

const depthValuesByVariant: Record<DepthVariant, number[]> = {
  default: [0.3, 0.35, 0.9, 0.85, 0.4, 0.45, 0.25, 0.2],
  "edge-focus": [0.85, 0.9, 0.3, 0.35, 0.8, 0.85, 0.4, 0.45],
};

const SPRING_CONFIG = { damping: 25, stiffness: 120 };

/** width / height for each hero screenshot (matches IMAGES order in App.tsx) */
const PAPER_ASPECT_RATIOS = [
  "882/536",
  "740/747",
  "757/767",
  "810/792",
  "795/655",
  "755/736",
];

export interface ParallaxHeroImagesProps {
  images: string[];
  className?: string;
  imageClassName?: string;
  variant?: DepthVariant;
}

export function ParallaxHeroImages({
  images,
  className,
  imageClassName,
  variant = "default",
}: ParallaxHeroImagesProps) {
  const reduced = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothMouseX = useSpring(mouseX, reduced ? { damping: 100, stiffness: 1000 } : SPRING_CONFIG);
  const smoothMouseY = useSpring(mouseY, reduced ? { damping: 100, stiffness: 1000 } : SPRING_CONFIG);

  const positions = useMemo(() => {
    const limitedImages = images.slice(0, 8);
    const depthValues = depthValuesByVariant[variant];
    return limitedImages.map((src, index) => ({
      src,
      position: positionOrder[index],
      depth: depthValues[index],
      delay: index * 0.12,
      aspectRatio: PAPER_ASPECT_RATIOS[index] ?? "4/3",
    }));
  }, [images, variant]);

  useEffect(() => {
    if (reduced) return;

    const handlePointer = (clientX: number, clientY: number) => {
      const x = (clientX / window.innerWidth) * 2 - 1;
      const y = (clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };

    const onMouseMove = (e: MouseEvent) => handlePointer(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) handlePointer(touch.clientX, touch.clientY);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [mouseX, mouseY, reduced]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {positions.map((pos, index) => (
        <ParallaxImage
          key={`${pos.src}-${index}`}
          src={pos.src}
          position={pos.position}
          depth={pos.depth}
          delay={pos.delay}
          aspectRatio={pos.aspectRatio}
          imageClassName={imageClassName}
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          reduced={reduced}
        />
      ))}
    </div>
  );
}

interface ParallaxImageProps extends ImagePosition {
  imageClassName?: string;
  smoothMouseX: MotionValue<number>;
  smoothMouseY: MotionValue<number>;
  reduced: boolean;
}

const ParallaxImage = memo(function ParallaxImage({
  src,
  position,
  depth,
  delay,
  aspectRatio = "4/3",
  imageClassName,
  smoothMouseX,
  smoothMouseY,
  reduced,
}: ParallaxImageProps) {
  const maxOffset = 40;

  const translateX = useTransform(
    smoothMouseX,
    [-1, 1],
    [-maxOffset * depth, maxOffset * depth],
  );

  const translateY = useTransform(
    smoothMouseY,
    [-1, 1],
    [-maxOffset * depth, maxOffset * depth],
  );

  const posStyle = positionStyles[position];

  return (
    <motion.div
      className="absolute"
      style={{
        top: posStyle.top,
        left: posStyle.left,
        right: posStyle.right,
        x: translateX,
        y: translateY,
        zIndex: Math.round(depth * 10),
      }}
      initial={reduced ? false : { opacity: 0, filter: "blur(20px)", scale: 0.9 }}
      animate={reduced ? { opacity: 1, filter: "blur(0px)", scale: 1 } : { opacity: 1, filter: "blur(0px)", scale: 1 }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }
      }
    >
      <HeroImage
        src={src}
        loading="eager"
        decoding="async"
        className={cn(
          "h-20 w-32 rounded-lg bg-[#faf6f3] object-contain p-1 shadow-lg ring-1 ring-black/10 sm:h-40 sm:w-56 md:h-52 md:w-80",
          imageClassName,
        )}
        style={{ aspectRatio }}
      />
    </motion.div>
  );
});
