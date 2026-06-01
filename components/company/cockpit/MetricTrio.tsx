'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';

interface MetricTrioProps {
  activationRate:        number;
  meaningfulActivationRate: number;
  verificationRate:      number;
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

const METRICS = [
  { key: 'ar',  label: 'Activation Rate',        code: 'AR'  },
  { key: 'mar', label: 'Meaningful Activation',   code: 'MAR' },
  { key: 'vr',  label: 'Verification Rate',       code: 'VR'  },
] as const;

export function MetricTrio({ activationRate, meaningfulActivationRate, verificationRate }: MetricTrioProps) {
  const values: Record<string, string> = {
    ar:  pct(activationRate),
    mar: pct(meaningfulActivationRate),
    vr:  pct(verificationRate),
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {METRICS.map(({ key, label, code }, idx) => (
        <div
          key={code}
          className="p-5"
          style={{
            background:   TOKENS.surface,
            border:       TOKENS.cardBorder,
            borderRadius: TOKENS.cardRadius,
            borderLeft:   idx === 0 ? `3px solid ${TOKENS.accent}` : undefined,
          }}
        >
          <p
            className="uppercase mb-2"
            style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(20,18,46,0.40)' }}
          >
            {code}
          </p>
          <p
            style={{
              fontFamily:         'var(--font-inter)',
              fontWeight:         700,
              fontSize:           '32px',
              color:              TOKENS.ink,
              lineHeight:         1,
              letterSpacing:      '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {values[key]}
          </p>
          <p
            className="mt-1.5"
            style={{ fontSize: '11px', color: 'rgba(20,18,46,0.50)' }}
          >
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}
