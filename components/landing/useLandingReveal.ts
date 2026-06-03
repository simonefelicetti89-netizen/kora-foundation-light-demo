'use client';
// useLandingReveal — IntersectionObserver reveal for marketing pages.
// Works with CSS module class name strings (adds them directly via classList).
// Respects prefers-reduced-motion: shows all elements immediately when enabled.
//
// Usage:
//   const rootRef = useLandingReveal(styles.reveal, styles.revealIn);
//   return <div ref={rootRef}>...</div>

import { useEffect, useRef } from 'react';

export function useLandingReveal(revealClass: string, revealInClass: string) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = ref.current?.querySelectorAll<HTMLElement>(
      `.${revealClass}:not(.${revealInClass})`,
    );
    if (!elements) return;

    if (reduced) {
      elements.forEach((el) => el.classList.add(revealInClass));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(revealInClass);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14 },
    );

    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [revealClass, revealInClass]);

  return ref;
}
