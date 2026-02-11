import { animate, ValueAnimationTransition } from "framer-motion";
import { useCallback, useRef } from "react";

export function useScrollTo() {
  const ref = useRef<HTMLDivElement>(null);
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);

  const scrollTo = useCallback((options: ValueAnimationTransition = {}) => {
    if (!ref.current) return;

    // Cancel any ongoing scroll animation
    if (animationRef.current) {
      animationRef.current.stop();
    }

    const defaultOptions: ValueAnimationTransition = {
      type: "spring",
      bounce: 0,
      duration: 0.6,
    };

    animationRef.current = animate(window.scrollY, ref.current.offsetTop, {
      ...defaultOptions,
      ...options,
      onUpdate: (latest) => window.scrollTo({ top: latest }),
      onComplete: () => { animationRef.current = null; },
    });
  }, []);

  return [ref, scrollTo] as const;
}
