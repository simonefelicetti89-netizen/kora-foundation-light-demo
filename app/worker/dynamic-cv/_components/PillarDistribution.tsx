'use client';

// KORA-WP-129 Wave 4b (W3B) — pillar reading for the Dynamic Impact CV.
//
// WHY THIS IS SCOPED AND NOT A KORA-WP-142 PRIMITIVE. Both governed encodings
// were evaluated and both are semantically wrong here:
//
//   ContributionBars encodes weight × value and carries an `assessment` per
//   item. The Dynamic CV must never imply that one pillar scored better than
//   another — it records participation, it does not judge the person.
//
//   DistributionStrip is a GROUP comparison: it suppresses itself below a
//   privacy threshold of N=10 participants. This surface is one worker's own
//   private record, where there is no group and no threshold to clear; applying
//   one would suppress a worker's own data from themselves.
//
// So this renders the only honest thing the data supports: a count per pillar,
// with a magnitude bar scaled to the largest count present. No percentage, no
// normalisation to 100%, no ranking, no assessment colour. The bar is a reading
// aid for magnitude the number already states — remove it and nothing is lost.
//
// Mobile needs no separate treatment: one pillar per row is already the
// composition, so nothing compresses (KORA-WP-129 W3B §15).

import { PILLAR_COLORS, PX, SPACE } from '@/lib/design/kora-design-tokens';
import { Caption, Secondary } from '@/components/ui/px';

export interface PillarRow {
  readonly pillar: string;
  readonly active: number;
  readonly attended: number;
  readonly registered: number;
  readonly interested: number;
}

const LABEL: Record<string, string> = {
  LIFE: 'Life', GROWTH: 'Growth', CONNECTION: 'Connection', IMPACT: 'Impact', LEGACY: 'Legacy',
};

export function PillarDistribution({ rows }: { rows: readonly PillarRow[] }) {
  const max = Math.max(...rows.map((r) => r.active), 1);

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: SPACE.md }}>
      {rows.map((r) => {
        const colour = PILLAR_COLORS[r.pillar as keyof typeof PILLAR_COLORS] ?? PX.inkMute;
        const none = r.active === 0;
        return (
          <li key={r.pillar} data-testid={`dynamic-cv-pillar-${r.pillar.toLowerCase()}`} style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE.sm, marginBottom: 6 }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: PX.rPill, background: none ? PX.inkMute : colour, flex: 'none' }} />
              <Secondary as="span" style={{ color: PX.ink, fontWeight: 600, flex: 'none' }}>{LABEL[r.pillar] ?? r.pillar}</Secondary>
              <Secondary as="span" style={{ color: PX.ink3, marginLeft: 'auto', flex: 'none', fontVariantNumeric: 'tabular-nums' }}>
                {none ? 'non esplorato' : `${r.active} ${r.active === 1 ? 'attività' : 'attività'}`}
              </Secondary>
            </div>
            {/* The track is always drawn so an unexplored pillar keeps its row and
                its place in the reading — dropping it would hide a real absence. */}
            <div style={{ height: 6, borderRadius: PX.rPill, background: PX.inkWash, overflow: 'hidden' }}>
              {!none && (
                <div style={{ width: `${Math.round((r.active / max) * 100)}%`, height: '100%', background: colour, borderRadius: PX.rPill }} />
              )}
            </div>
            {!none && (
              <Caption style={{ margin: '6px 0 0', color: PX.ink3 }}>
                {r.attended} con partecipazione registrata · {r.registered} con iscrizione · {r.interested} con interesse espresso
              </Caption>
            )}
          </li>
        );
      })}
    </ul>
  );
}
