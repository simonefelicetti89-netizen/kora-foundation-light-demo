'use client';

// KoraStratoMark — B140-C
// KORA canonical brand mark: STRATO con proporzioni fisse.
//
// NON è il worker STRATO. NON usa dati worker.
// NON importa da servizi My KORA o dati persona/scenario.
//
// Le proporzioni canoniche sono GEOMETRIA DI BRAND esclusivamente.
// Non sono un benchmark, non sono un target, non sono un mix ideale.
// Non devono essere interpretate come raccomandazione metodologica.

import { ACTIVATION_SIGNATURE } from '@/lib/design/kora-design-tokens';

interface KoraStratoMarkProps {
  variant?: 'default' | 'negative';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Brand geometry — values are visual proportions for identity only.
// Not a methodology recommendation. Not a benchmark. Not an ideal mix.
const CANONICAL_BANDS = [
  { pillar: 'LIFE',       value: 28 },
  { pillar: 'GROWTH',     value: 46 },
  { pillar: 'CONNECTION', value: 24 },
  { pillar: 'IMPACT',     value: 34 },
  { pillar: 'LEGACY',     value: 14 },
] as const;

const CANONICAL_TOTAL = CANONICAL_BANDS.reduce((s, b) => s + b.value, 0); // 146
const CANONICAL_MAX   = Math.max(...CANONICAL_BANDS.map((b) => b.value));  // 46

const HEIGHT: Record<string, number> = { sm: 7, md: 10, lg: 13 };
const GAP:    Record<string, number> = { sm: 4, md: 5,  lg: 6  };

export function KoraStratoMark({ variant = 'default', size = 'md', className }: KoraStratoMarkProps) {
  const color  = variant === 'negative' ? ACTIVATION_SIGNATURE.canvas : ACTIVATION_SIGNATURE.cotto;
  const height = HEIGHT[size];
  const gap    = GAP[size];

  return (
    <div
      className={className}
      role="img"
      aria-label="KORA Strato Mark — segno di brand"
      data-testid="kora-strato-mark"
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap }}>
        {CANONICAL_BANDS.map((band) => {
          const pct     = (band.value / CANONICAL_TOTAL) * 100;
          const opacity = 0.25 + (band.value / CANONICAL_MAX) * 0.70;

          return (
            <div
              key={band.pillar}
              aria-hidden="true"
              style={{
                width:        `${pct}%`,
                height,
                borderRadius: 2,
                background:   color,
                opacity:      Math.round(opacity * 100) / 100,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
