'use client';

import type { ReactNode } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';

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
    // No surface. The approved design puts ranked groups on bare canvas: the
    // whitespace and the single hairline between the columns are the boundary,
    // and a filled card here would be the second filled surface on the page.
    <div>
      <p className={tier === 'section' ? 'kt-section' : 'kt-subsection'} style={{ color: PX.ink, marginBottom: 4 }}>{title}</p>
      {note && <p className="kt-caption" style={{ color: PX.ink3, marginBottom: 6 }}>{note}</p>}
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
      borderBottom:        last ? undefined : `1px solid ${PX.line}`,
    }}>
      <p className="kt-meta kt-num" style={{ color: PX.ink3, marginTop: 3 }}>
        {String(rank).padStart(2, '0')}
      </p>
      <div style={{ minWidth: 0 }}>
        <p className="kt-label" style={{ color: PX.ink }}>
          {title}
          {meta && <span className="kt-caption" style={{ color: PX.ink3 }}>{' · '}{meta}</span>}
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
      color:     tone === 'secondary' ? PX.ink2 : PX.ink3,
      marginTop: 4,
    }}>
      {children}
    </p>
  );
}
