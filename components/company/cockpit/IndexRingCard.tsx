'use client';

import type { SafeguardStatus } from '@/lib/types';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { formatConfidenceScore } from '@/lib/formatters';

interface IndexRingCardProps {
  value: number;
  safeguardStatus: SafeguardStatus;
  confidenceScore: number;
}

const SAFEGUARD_CONFIG: Record<SafeguardStatus, { bg: string; text: string; dot: string; label: string }> = {
  CLEAR:   { ...TOKENS.safeguard.pass,  label: 'CLEAR'   },
  WARNING: { ...TOKENS.safeguard.watch, label: 'WARNING' },
  FLAGGED: { ...TOKENS.safeguard.cap,   label: 'FLAGGED' },
};

const R    = 54;
const CIRC = 2 * Math.PI * R;

export function IndexRingCard({ value, safeguardStatus, confidenceScore }: IndexRingCardProps) {
  const dash   = (value / 100) * CIRC;
  const safeg  = SAFEGUARD_CONFIG[safeguardStatus] ?? SAFEGUARD_CONFIG['WARNING'];

  return (
    <div
      className="flex items-center gap-6 p-6"
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
      }}
    >
      {/* Ring gauge */}
      <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
        <svg viewBox="0 0 140 140" width="140" height="140" style={{ display: 'block' }}>
          {/* Track */}
          <circle
            cx="70" cy="70" r={R}
            fill="none"
            stroke="rgba(20,18,46,0.10)"
            strokeWidth="9"
          />
          {/* Arc — violet accent */}
          <circle
            cx="70" cy="70" r={R}
            fill="none"
            stroke={TOKENS.accent}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            transform="rotate(-90 70 70)"
          />
        </svg>
        {/* Center value — HTML overlay for correct Inter rendering */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ pointerEvents: 'none' }}
        >
          <span
            style={{
              fontFamily: 'var(--font-inter)',
              fontWeight: 700,
              fontSize:   42,
              color:      TOKENS.ink,
              lineHeight: 1,
            }}
          >
            {Math.round(value)}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize:   11,
              color:      'rgba(20,18,46,0.38)',
              lineHeight: 1,
              marginTop:  3,
            }}
          >
            /100
          </span>
        </div>
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-3 min-w-0">
        {/* Title */}
        <p
          className="font-kora-serif text-kora-ink leading-tight"
          style={{ fontSize: '1.4375rem', letterSpacing: '-0.01em' }}
        >
          KORA Index v3
        </p>

        {/* Safeguard pill */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 rounded font-mono font-medium"
            style={{
              background:    safeg.bg,
              color:         safeg.text,
              fontSize:      '8px',
              letterSpacing: '0.07em',
              padding:       '3px 8px',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: safeg.dot }}
            />
            {safeg.label}
          </span>

          {/* Confidence chip */}
          <span
            className="inline-flex items-center gap-1 rounded"
            style={{
              background:    TOKENS.inkBorder,
              fontSize:      '8px',
              letterSpacing: '0.04em',
              padding:       '3px 8px',
              color:         'rgba(20,18,46,0.55)',
            }}
          >
            <span style={{ color: TOKENS.accent, fontWeight: 700 }}>
              CS&nbsp;{formatConfidenceScore(confidenceScore)}
            </span>
            <span style={{ opacity: 0.6 }}>esterno&nbsp;·&nbsp;non pesato</span>
          </span>
        </div>

        {/* Methodology stamp */}
        <p
          className="font-mono"
          style={{ fontSize: '7px', color: 'rgba(20,18,46,0.30)', letterSpacing: '0.06em' }}
        >
          KORA Methodology v0.1&nbsp;·&nbsp;pre-empirical-calibration
        </p>
      </div>
    </div>
  );
}
