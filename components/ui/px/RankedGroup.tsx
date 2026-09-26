'use client';

import type { ReactNode } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';

// KORA-WP-141 — ONE ranked-group grammar.
//
// The KORA Index surface carried three different visual answers to the same
// question ("here are N things, in order of importance"): accent-tinted cards
// with a 3px coloured top border, a stack where card #1 inverted to ink, and
// rows with a 4px coloured left border plus two pills each. Three grammars, four
// colour families and a drop shadow for what is a numbered list.
//
// Rank is carried by the numeral and by reading order. Nothing else encodes it.
// `meta` stays available for the qualifiers those blocks legitimately need
// (priority, macroblock, component code) — as quiet text, not as pills.

// `tier` is subordination, not decoration: a group that already sits inside a
// Chapter must not restate the chapter's own heading level, or the reader meets
// two 20px headings for one idea.
export function RankedGroup({ title, note, tier = 'section', children }: {
  title: string;
  note?: ReactNode;
  tier?: 'section' | 'subsection';
  children: ReactNode;
}) {
  return (
    <div className="kora-flat-mobile" style={{
      background:   TOKENS.surface,
      border:       TOKENS.cardBorder,
      borderRadius: TOKENS.cardRadius,
      padding:      '24px 26px',
    }}>
      <p className={tier === 'section' ? 'kt-section' : 'kt-subsection'} style={{ color: TOKENS.ink, marginBottom: 4 }}>{title}</p>
      {note && <p className="kt-caption" style={{ color: TOKENS.inkTertiary, marginBottom: 6 }}>{note}</p>}
      <div>{children}</div>
    </div>
  );
}

export function RankedItem({ rank, title, meta, last, children }: {
  rank:   number;
  title:  ReactNode;
  meta?:  ReactNode;
  last?:  boolean;
  children?: ReactNode;
}) {
  return (
    <div className="kora-ranked-item" style={{
      display:             'grid',
      gridTemplateColumns: '28px 1fr',
      gap:                 '0 12px',
      padding:             '16px 0',
      borderBottom:        last ? undefined : TOKENS.cardBorder,
    }}>
      <p className="kt-meta kt-num" style={{ color: TOKENS.inkTertiary, marginTop: 3 }}>
        {String(rank).padStart(2, '0')}
      </p>
      <div style={{ minWidth: 0 }}>
        <p className="kt-label" style={{ color: TOKENS.ink }}>
          {title}
          {meta && <span className="kt-caption" style={{ color: TOKENS.inkTertiary }}>{' · '}{meta}</span>}
        </p>
        {children}
      </div>
    </div>
  );
}

export function RankedLine({ tone = 'secondary', children }: {
  tone?: 'secondary' | 'tertiary';
  children: ReactNode;
}) {
  return (
    <p className="kt-caption" style={{
      color:     tone === 'secondary' ? TOKENS.inkSecondary : TOKENS.inkTertiary,
      marginTop: 4,
    }}>
      {children}
    </p>
  );
}
