'use client';

// components/layout/usePxShellState.ts
// KORA-WP-125 — shared Product Experience shell state.
//
// The shell is viewport-governed (Founder Decision 3, 2026-09-20) because the
// WP-124 Product Experience defines its states in viewport terms: full sidebar
// on desktop, a 68px rail at ≤1200, mobile navigation at ≤720. Content
// primitives are a separate matter and adapt to their own container — that
// split is deliberate and is what prevents the KORA-WP-039 failure, where a
// page believed it was "desktop" while its container was 456px wide.
//
// Presentation only: this hook changes no route, no navigation item, no role
// visibility and no information architecture. Those remain KORA-WP-073's.

import { useEffect, useState } from 'react';
import { resolvePxShellState, PX_BREAKPOINTS, type PxShellState } from '@/lib/design/kora-design-tokens';

export { PX_BREAKPOINTS };
export type { PxShellState };

/**
 * Resolves the shell state from the viewport. Starts at 'full' so the server
 * and the first client paint agree (no hydration mismatch), then corrects on
 * mount. Listens via matchMedia rather than a resize handler so the callback
 * fires only when a state boundary is actually crossed.
 */
export function usePxShellState(): PxShellState {
  const [state, setState] = useState<PxShellState>('full');

  useEffect(() => {
    const read = () => setState(resolvePxShellState(window.innerWidth));
    read();

    const queries = [
      window.matchMedia(`(max-width: ${PX_BREAKPOINTS.mobile}px)`),
      window.matchMedia(`(max-width: ${PX_BREAKPOINTS.rail}px)`),
    ];
    queries.forEach((q) => q.addEventListener('change', read));
    return () => queries.forEach((q) => q.removeEventListener('change', read));
  }, []);

  return state;
}
