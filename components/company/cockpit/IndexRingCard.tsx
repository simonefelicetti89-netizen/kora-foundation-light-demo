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
  CLEAR:   { ...TOKENS.safeguard.pass,  label: 'Clear'   },
  WARNING: { ...TOKENS.safeguard.watch, label: 'Warning' },
  FLAGGED: { ...TOKENS.safeguard.cap,   label: 'Flagged' },
};

const R    = 54;
const CIRC = 2 * Math.PI * R;

export function IndexRingCard({ value, safeguardStatus, confidenceScore }: IndexRingCardProps) {
  const dash   = (value / 100) * CIRC;
  const safeg  = SAFEGUARD_CONFIG[safeguardStatus] ?? SAFEGUARD_CONFIG['WARNING'];

  return (
    <div
      className="relative flex items-center gap-6 p-6"
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
      }}
    >
      {/* Brandmark firma discreta — KORA Index tool signature */}
      <svg
        viewBox="108 100 212 220"
        height="22"
        width="22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ position: 'absolute', top: 14, right: 14, opacity: 1 }}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M148.606 117.911C188.736 101.225 233.839 101.225 273.955 117.911C286.755 123.25 296.922 133.456 302.228 146.29C318.85 186.571 318.85 231.844 302.228 272.112C296.908 284.96 286.741 295.165 273.955 300.491C233.825 317.176 188.722 317.176 148.606 300.491C135.807 295.151 125.639 284.946 120.334 272.112C103.711 231.83 103.711 186.557 120.334 146.29C125.653 133.442 135.821 123.236 148.606 117.911ZM211.095 124.946C190.123 124.946 171.492 138.323 159.759 158.999C139.147 170.776 125.835 189.477 125.835 210.529C125.835 231.58 139.161 250.282 159.759 262.059C171.492 282.749 190.123 296.111 211.095 296.111C232.067 296.111 250.698 282.735 262.431 262.059C283.043 250.282 296.355 231.58 296.355 210.529C296.355 189.477 283.029 170.776 262.431 158.999C250.698 138.309 232.067 124.946 211.095 124.946Z"
          fill="#6156F5"
        />
      </svg>
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
            className="inline-flex items-center gap-1.5 rounded font-medium"
            style={{
              fontFamily:    'var(--font-inter)',
              background:    safeg.bg,
              color:         safeg.text,
              fontSize:      '10px',
              letterSpacing: '0.01em',
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
              fontFamily:    'var(--font-inter)',
              background:    TOKENS.inkBorder,
              fontSize:      '10px',
              letterSpacing: '0.01em',
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

      </div>
    </div>
  );
}
