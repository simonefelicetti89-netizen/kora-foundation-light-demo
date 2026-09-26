'use client';

import type { ReactNode } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';

/**
 * The ONE filled surface on a KORA Index page.
 *
 * The approved design carries its whole identity here: ink ground, white type,
 * and everything else on bare canvas. A second filled surface anywhere on the
 * page breaks the hierarchy the design is built on, which is why this primitive
 * is deliberately not configurable — no tone, no variant, no ground prop.
 */
export function ExecutiveSurface({ children }: { children: ReactNode }) {
  return (
    <section className="kora-exec-surface" data-kora-surface="executive"
      style={{ background: PX.ink, borderRadius: 20, padding: '36px 40px' }}>
      {children}
    </section>
  );
}

/** A full-bleed hairline inside the executive surface. */
export function ExecutiveRule() {
  return <div aria-hidden="true" style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '24px 0' }} />;
}
