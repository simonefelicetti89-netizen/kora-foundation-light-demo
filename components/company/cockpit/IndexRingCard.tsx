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

const R    = 68;
const CIRC = 2 * Math.PI * R;

export function IndexRingCard({ value, safeguardStatus, confidenceScore }: IndexRingCardProps) {
  const dash  = (value / 100) * CIRC;
  const safeg = SAFEGUARD_CONFIG[safeguardStatus] ?? SAFEGUARD_CONFIG['WARNING'];

  return (
    <div
      className="relative flex flex-col p-6"
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorderStrong,
        borderRadius: TOKENS.cardRadius,
      }}
    >
      {/* Brandmark firma — top-right, discreta */}
      <svg
        viewBox="108 100 212 220"
        height="22" width="22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ position: 'absolute', top: 16, right: 16, opacity: 0.5 }}
      >
        <path
          fillRule="evenodd" clipRule="evenodd"
          d="M148.606 117.911C188.736 101.225 233.839 101.225 273.955 117.911C286.755 123.25 296.922 133.456 302.228 146.29C318.85 186.571 318.85 231.844 302.228 272.112C296.908 284.96 286.741 295.165 273.955 300.491C233.825 317.176 188.722 317.176 148.606 300.491C135.807 295.151 125.639 284.946 120.334 272.112C103.711 231.83 103.711 186.557 120.334 146.29C125.653 133.442 135.821 123.236 148.606 117.911ZM211.095 124.946C190.123 124.946 171.492 138.323 159.759 158.999C139.147 170.776 125.835 189.477 125.835 210.529C125.835 231.58 139.161 250.282 159.759 262.059C171.492 282.749 190.123 296.111 211.095 296.111C232.067 296.111 250.698 282.735 262.431 262.059C283.043 250.282 296.355 231.58 296.355 210.529C296.355 189.477 283.029 170.776 262.431 158.999C250.698 138.309 232.067 124.946 211.095 124.946Z"
          fill="#6156F5"
        />
      </svg>

      {/* Titolo serif — comanda la card */}
      <p
        className="font-kora-serif pr-8"
        style={{ fontSize: '1.875rem', letterSpacing: '-0.02em', lineHeight: 1.1, color: TOKENS.ink }}
      >
        KORA Index{' '}
        <span style={{ color: 'rgba(20,18,46,0.40)', fontSize: '1.5rem' }}>v3</span>
      </p>

      {/* Contenuto: ring + stato gerarchizzato */}
      <div className="flex items-start gap-8 mt-5">

        {/* Ring gauge */}
        <div className="relative flex-shrink-0" style={{ width: 180, height: 180 }}>
          <svg viewBox="0 0 180 180" width="180" height="180" style={{ display: 'block' }}>
            <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(20,18,46,0.10)" strokeWidth="10" />
            <circle
              cx="90" cy="90" r={R}
              fill="none"
              stroke={TOKENS.accent}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRC}`}
              transform="rotate(-90 90 90)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: 'none' }}>
            <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 50, color: TOKENS.ink, lineHeight: 1 }}>
              {Math.round(value)}
            </span>
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(20,18,46,0.38)', lineHeight: 1, marginTop: 4 }}>
              /100
            </span>
          </div>
        </div>

        {/* Stato gerarchizzato */}
        <div className="flex flex-col gap-0 flex-1 min-w-0 self-center">

          {/* PRIMARIO — Safeguard */}
          <div className="space-y-2">
            <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(20,18,46,0.50)' }}>
              Stato Safeguard
            </p>
            <span
              className="inline-flex items-center gap-2 rounded-md font-medium"
              style={{
                fontFamily:    'var(--font-inter)',
                background:    safeg.bg,
                color:         safeg.text,
                fontSize:      '15px',
                letterSpacing: '0',
                padding:       '6px 14px',
              }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: safeg.dot }} />
              {safeg.label}
            </span>
          </div>

          {/* Hairline */}
          <div style={{ height: '1px', background: TOKENS.inkBorder, margin: '16px 0' }} />

          {/* SECONDARIO — Confidence */}
          <div className="space-y-1">
            <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(20,18,46,0.50)' }}>
              Confidence Score
            </p>
            <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '22px', color: TOKENS.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {formatConfidenceScore(confidenceScore)}
            </p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: '10px', color: 'rgba(20,18,46,0.45)', lineHeight: 1.5 }}>
              indicatore esterno · non pesato nel calcolo
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
