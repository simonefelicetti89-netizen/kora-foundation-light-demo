'use client';

// KORA-WP-125 — loading state. HANDOFF §12: skeletons at 7% ink; a spinner is
// permitted inline only, never full-page.

import { LoaderCircle } from 'lucide-react';
import { PX } from '@/lib/design/kora-design-tokens';

export function Skeleton({ height = 10, width = '100%' }: { height?: number; width?: number | string }) {
  return <span aria-hidden="true" style={{ display: 'block', height, width, borderRadius: 5, background: PX.skelInk }} />;
}

export function SkeletonRows({ rows = 5, rowHeight = 36, label = 'Caricamento in corso.' }: { rows?: number; rowHeight?: number; label?: string }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        {label}
      </span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ height: rowHeight, margin: '0 18px', borderBottom: `1px solid ${PX.line}`, display: 'flex', alignItems: 'center' }}>
          <Skeleton />
        </div>
      ))}
    </div>
  );
}

export function InlineSpinner({ size = 15 }: { size?: number }) {
  return (
    <LoaderCircle
      size={size}
      strokeWidth={2.2}
      aria-hidden="true"
      style={{ color: PX.violet, animation: 'px-spin .7s linear infinite' }}
    />
  );
}
