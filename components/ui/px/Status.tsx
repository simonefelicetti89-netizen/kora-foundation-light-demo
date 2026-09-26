'use client';

// KORA-WP-125 — shared status primitive. HANDOFF §12, §15.
// Status is ALWAYS a dot plus a word. Colour is never the only signal, and the
// word is never truncated away — the KORA-WP-039 D1 defect was a status chip
// whose label was clipped to "Requisito sod…", which silently removes the
// non-colour signal the accessibility contract depends on.

import type { ReactNode } from 'react';
import { PX, PX_TONE, type PxTone } from '@/lib/design/kora-design-tokens';

export function Status({ tone, children, icon }: { tone: PxTone; children: ReactNode; icon?: ReactNode }) {
  const t = PX_TONE[tone];
  return (
    <span
      data-px-status={tone}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        minHeight: 23, padding: '2px 8px', borderRadius: PX.rChip,
        fontSize: '12px', fontWeight: 700, fontFamily: PX.sans,
        background: t.tint, color: t.text,
        // The word wraps rather than truncating: a status that cannot be read
        // is not a status. Width pressure is absorbed by the row, not the word.
        whiteSpace: 'normal', overflowWrap: 'anywhere',
      }}
    >
      <i aria-hidden="true" style={{ width: 6, height: 6, borderRadius: PX.rPill, background: t.fill, flex: 'none' }} />
      {icon}
      {children}
    </span>
  );
}

/** Neutral metadata chip — not a status, carries no semantic tone. */
export function Chip({ children, selected = false }: { children: ReactNode; selected?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px',
      borderRadius: PX.rChip, fontSize: '12px', fontWeight: 700, fontFamily: PX.sans,
      background: selected ? PX.violetTint : PX.l1,
      color: selected ? PX.violet700 : PX.ink2,
      border: `1px solid ${selected ? PX.violetEdge : PX.line2}`,
      boxShadow: selected ? 'none' : PX.sh1,
    }}>
      {children}
    </span>
  );
}
