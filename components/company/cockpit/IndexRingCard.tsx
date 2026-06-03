'use client';

import { useState } from 'react';
import type { SafeguardStatus } from '@/lib/types';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { formatConfidenceScore } from '@/lib/formatters';
import { TM } from '@/components/ui/TM';

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

const R    = 72;
const CIRC = 2 * Math.PI * R;

export function IndexRingCard({ value, safeguardStatus, confidenceScore }: IndexRingCardProps) {
  const [hovered, setHovered] = useState(false);
  const dash  = (value / 100) * CIRC;
  const safeg = SAFEGUARD_CONFIG[safeguardStatus] ?? SAFEGUARD_CONFIG['WARNING'];

  return (
    <div
      className="relative flex flex-col p-7"
      style={{
        background:   TOKENS.surface,
        border:       hovered ? TOKENS.cardBorderHover : TOKENS.cardBorderStrong,
        borderRadius: TOKENS.cardRadius,
        boxShadow:    hovered ? TOKENS.cardShadowHover : TOKENS.cardShadow,
        transition:   'all 180ms ease',
        transform:    hovered ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Brandmark watermark — top-right */}
      <svg
        viewBox="108 100 212 220"
        height="20" width="20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ position: 'absolute', top: 20, right: 20, opacity: 0.35 }}
      >
        <path
          fillRule="evenodd" clipRule="evenodd"
          d="M148.606 117.911C188.736 101.225 233.839 101.225 273.955 117.911C286.755 123.25 296.922 133.456 302.228 146.29C318.85 186.571 318.85 231.844 302.228 272.112C296.908 284.96 286.741 295.165 273.955 300.491C233.825 317.176 188.722 317.176 148.606 300.491C135.807 295.151 125.639 284.946 120.334 272.112C103.711 231.83 103.711 186.557 120.334 146.29C125.653 133.442 135.821 123.236 148.606 117.911ZM211.095 124.946C190.123 124.946 171.492 138.323 159.759 158.999C139.147 170.776 125.835 189.477 125.835 210.529C125.835 231.58 139.161 250.282 159.759 262.059C171.492 282.749 190.123 296.111 211.095 296.111C232.067 296.111 250.698 282.735 262.431 262.059C283.043 250.282 296.355 231.58 296.355 210.529C296.355 189.477 283.029 170.776 262.431 158.999C250.698 138.309 232.067 124.946 211.095 124.946Z"
          fill="#C76F3D"
        />
      </svg>

      {/* Title serif */}
      <p
        className="font-kora-serif pr-10"
        style={{ fontSize: '2rem', letterSpacing: '-0.02em', lineHeight: 1.08, color: TOKENS.ink }}
      >
        <TM>KORA Index</TM>
        <span style={{ color: 'rgba(6,3,43,0.35)', fontSize: '1.4rem', marginLeft: 6 }}>v3</span>
      </p>

      {/* Ring + state column */}
      <div className="flex items-start gap-8 mt-6">

        {/* Ring gauge — terracotta fill */}
        <div className="relative flex-shrink-0">
          <svg viewBox="0 0 180 180" width={186} height={186} style={{ display: 'block' }}>
            {/* Track */}
            <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(6,3,43,0.07)" strokeWidth="11" />
            {/* Fill */}
            <circle
              cx="90" cy="90" r={R}
              fill="none"
              stroke={TOKENS.accent}
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRC}`}
              transform="rotate(-90 90 90)"
            />
            {/* Score text */}
            <text
              x="90" y="83"
              textAnchor="middle"
              dominantBaseline="auto"
              style={{
                fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontWeight:  700,
                fontSize:    '46px',
                fill:        TOKENS.ink,
                letterSpacing: '-2px',
              }}
            >
              {Math.round(value)}
            </text>
            <text
              x="90" y="103"
              textAnchor="middle"
              dominantBaseline="auto"
              style={{
                fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontSize:   '13px',
                fill:       'rgba(6,3,43,0.35)',
              }}
            >
              /100
            </text>
          </svg>
        </div>

        {/* State column */}
        <div className="flex flex-col gap-5 flex-1 min-w-0 self-center">

          {/* Activation Safeguard™ */}
          <div>
            <p style={{
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:    600,
              fontSize:      '10px',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color:         TOKENS.inkHint,
              marginBottom:  6,
            }}>
              Activation Safeguard™
            </p>
            <span
              style={{
                display:     'inline-flex',
                alignItems:  'center',
                gap:         7,
                borderRadius: 999,
                padding:     '6px 14px',
                background:  safeg.bg,
                color:       safeg.text,
                border:      `1px solid ${safeg.dot}40`,
                fontSize:    '13px',
                fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontWeight:  600,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: safeg.dot, flexShrink: 0 }} />
              {safeg.label}
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: TOKENS.inkBorder }} />

          {/* Confidence Score™ */}
          <div>
            <p style={{
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:    600,
              fontSize:      '10px',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color:         TOKENS.inkHint,
              marginBottom:  6,
            }}>
              Confidence Score™
            </p>
            <p style={{
              fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:  700,
              fontSize:    '26px',
              color:       TOKENS.ink,
              letterSpacing: '-0.02em',
              lineHeight:  1,
            }}>
              {formatConfidenceScore(confidenceScore)}
            </p>
            <p style={{
              fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:    '10px',
              color:       'rgba(6,3,43,0.40)',
              lineHeight:  1.45,
              marginTop:   4,
            }}>
              Esterno al KORA Index™ · non pesato nel calcolo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
