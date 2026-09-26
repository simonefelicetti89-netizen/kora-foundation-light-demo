'use client';

// KORA-WP-125 — shared Product surfaces. HANDOFF §1, §6.
// A panel exists because the information is a meaningful autonomous object,
// not because a rectangle was needed. Two adjacent signals of the same kind
// belong in ONE surface with two labelled regions, not two cards.

import type { CSSProperties, ReactNode } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';

export function Surface({
  level = 1, padded = false, className, style, children,
}: {
  /** 1 = working surface (L1). 2 = analytical panel inset inside an L1 (L2). */
  level?: 1 | 2;
  padded?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const base: CSSProperties = level === 1
    ? { background: PX.l1, border: `1px solid ${PX.line}`, borderRadius: PX.rPanel, boxShadow: PX.sh1 }
    : { background: PX.l2, border: `1px solid ${PX.l2Edge}`, borderRadius: PX.rInner };
  return (
    <div className={className} style={{ minWidth: 0, ...base, ...(padded ? { padding: '16px 18px' } : null), ...style }}>
      {children}
    </div>
  );
}

/** Panel header: an 11px uppercase label on the left, actions on the right. */
export function SurfaceHeader({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '12px 18px', borderBottom: `1px solid ${PX.line}`,
    }}>
      <span style={{
        flex: '0 1 auto', minWidth: 0, overflowWrap: 'anywhere',
        fontSize: '11px', fontWeight: 700, letterSpacing: '0.075em',
        textTransform: 'uppercase', color: PX.ink3, fontFamily: PX.sans,
      }}>
        {label}
      </span>
      {children ? (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function SurfaceBody({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ padding: '16px 18px', minWidth: 0, ...style }}>{children}</div>;
}
