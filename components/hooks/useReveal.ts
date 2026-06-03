'use client';

import { useEffect, useRef } from 'react';

interface UseRevealOptions {
  threshold?: number;
  // CSS class to add on reveal (must exist in module CSS or globals)
  revealClass?: string;
  // Data attribute for bar fill (e.g. data-w="42")
  fillBarSelector?: string;
}

// useReveal — IntersectionObserver that reveals .reveal elements inside rootRef.
// Returns a ref to attach to the container element.
// Respects prefers-reduced-motion: shows everything immediately when reduced motion is set.
//
// Usage:
//   const containerRef = useReveal();
//   return <div ref={containerRef}>...</div>
//
// Elements inside the container need class "reveal" (or custom revealClass).
// On intersection they gain class "in" (or custom revealClass + 'In').
export function useReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.14,
  revealClass = 'reveal',
  fillBarSelector = '.blk-fill',
}: UseRevealOptions = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root    = ref.current;
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const targets = root.querySelectorAll<HTMLElement>(`.${revealClass}:not(.in)`);

    if (reduced) {
      // Skip animation — show everything instantly
      targets.forEach((el) => {
        el.classList.add('in');
        el.querySelectorAll<HTMLElement>(fillBarSelector).forEach((bar) => {
          const w = bar.dataset.w ?? '0';
          bar.style.width = `${Math.min(parseInt(w, 10), 100)}%`;
        });
      });
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          el.classList.add('in');
          el.querySelectorAll<HTMLElement>(fillBarSelector).forEach((bar) => {
            const w = bar.dataset.w ?? '0';
            bar.style.width = `${Math.min(parseInt(w, 10), 100)}%`;
          });
          io.unobserve(el);
        }
      });
    }, { threshold });

    targets.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, [threshold, revealClass, fillBarSelector]);

  return ref;
}
