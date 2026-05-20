import { motion, useInView } from "framer-motion";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

// ============ 性能优化：使用 ref 而非 state 进行视差计算 ============
export function useRefParallax(
  ref: RefObject<HTMLElement | null>,
  speed: number = 0.5
) {
  const targetRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const el = ref.current;
        const target = targetRef.current;
        if (!el || !target) {
          rafRef.current = undefined;
          return;
        }

        const rect = el.getBoundingClientRect();
        const offset =
          (window.innerHeight / 2 - (rect.top + rect.height / 2)) * speed;
        target.style.transform = `translate3d(0, ${offset}px, 0)`;

        rafRef.current = undefined;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ref, speed]);

  return targetRef;
}

// 淡入动画
export function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
