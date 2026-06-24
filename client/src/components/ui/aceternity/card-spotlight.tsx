import { useMotionValue, motion, useMotionTemplate } from "framer-motion";
import { cn } from "../../../lib/utils";

type CardSpotlightProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
  radius?: number;
};

export function CardSpotlight({ children, className, radius = 350, ...props }: CardSpotlightProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={cn(
        "group/spotlight surface-card relative overflow-hidden p-6 transition-shadow duration-300 hover:shadow-md",
        className
      )}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover/spotlight:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${radius}px circle at ${mouseX}px ${mouseY}px,
              rgba(194, 78, 0, 0.08),
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </div>
  );
}
