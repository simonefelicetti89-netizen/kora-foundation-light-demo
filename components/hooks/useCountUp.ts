'use client';

import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
  target:     number;
  duration?:  number;  // ms, default 1700
  delay?:     number;  // ms before starting, default 300
  threshold?: number;  // IntersectionObserver threshold
}

// useCountUp — animates a number from 0 to target when element enters viewport.
// Returns { ref, value } — attach ref to the container, use value in the display.
// Respects prefers-reduced-motion: returns final value immediately.
export function useCountUp<T extends HTMLElement = HTMLDivElement>({
  target,
  duration  = 1700,
  delay     = 300,
  threshold = 0.1,
}: UseCountUpOptions) {
  const ref     = useRef<T>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      const id = requestAnimationFrame(() => setValue(Math.round(target)));
      return () => cancelAnimationFrame(id);
    }

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        io.disconnect();

        setTimeout(() => {
          const startTime = performance.now();
          const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out-cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }, delay);
      }
    }, { threshold });

    io.observe(el);
    return () => io.disconnect();
  }, [target, duration, delay, threshold]);

  return { ref, value };
}
