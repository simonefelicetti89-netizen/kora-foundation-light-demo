'use client';

import { useState } from 'react';
import type { SafeguardStatus } from '@/lib/types';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { formatConfidenceScore } from '@/lib/formatters';
import { TM } from '@/components/ui/TM';

interface KoraIntelligenceHeroProps {
  value: number;
  safeguardStatus: SafeguardStatus;
  confidenceScore: number;
  companyName: string;
  period: string;
  workerCount?: number;
  methodologyVersion?: string;
  calibrationStatus?: string;
}

const SAFEGUARD_CONFIG: Record<SafeguardStatus, { bg: string; text: string; dot: string; label: string }> = {
  CLEAR:   { ...TOKENS.safeguard.pass,  label: 'Clear'   },
  WARNING: { ...TOKENS.safeguard.watch, label: 'Warning' },
  FLAGGED: { ...TOKENS.safeguard.cap,   label: 'Flagged' },
};

const R    = 52;
const CIRC = 2 * Math.PI * R;

export function KoraIntelligenceHero({
  value, safeguardStatus, confidenceScore, companyName, period,
  workerCount, methodologyVersion, calibrationStatus,
}: KoraIntelligenceHeroProps) {
  const [hovered, setHovered] = useState(false);
  const dash  = (value / 100) * CIRC;
  const safeg = SAFEGUARD_CONFIG[safeguardStatus] ?? SAFEGUARD_CONFIG['WARNING'];

  return (
    <div
      style={{
        background:   TOKENS.ink,
        borderRadius: TOKENS.cardRadius,
        padding:      '36px 40px',
        transition:   'box-shadow 200ms ease',
        boxShadow:    hovered
          ? '0 24px 64px rgba(6,3,43,0.28)'
          : '0 16px 48px rgba(6,3,43,0.20)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
        <div>
          <p style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:    600,
            fontSize:      '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         TOKENS.accent,
            marginBottom:  10,
          }}>
            Human Impact Intelligence · Executive Cockpit
          </p>
          <h2 style={{
            fontFamily:  'var(--font-instrument-serif), Georgia, serif',
            fontSize:    'clamp(1.75rem, 3vw, 2.25rem)',
            fontWeight:  400,
            color:       '#FFFFFF',
            letterSpacing: '-0.02em',
            lineHeight:  1.08,
          }}>
            {companyName}
          </h2>
          <p style={{
            fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:   '12px',
            color:      'rgba(255,255,255,0.45)',
            marginTop:  6,
          }}>
            {period}{workerCount ? ` · ${workerCount.toLocaleString('it-IT')} lavoratori` : ''} · Dati sintetici
          </p>
        </div>

        {/* Calibration badge */}
        {calibrationStatus && (
          <div style={{
            borderRadius: 999,
            padding:      '5px 12px',
            background:   TOKENS.safeguard.watch.bg,
            border:       `1px solid rgba(217,154,43,0.30)`,
            flexShrink:   0,
            marginTop:    4,
          }}>
            <p style={{
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:      '9.5px',
              fontWeight:    600,
              color:         TOKENS.safeguard.watch.text,
              letterSpacing: '0.04em',
            }}>
              {calibrationStatus.replace(/_/g, ' ')}
            </p>
          </div>
        )}
      </div>

      {/* Main content: ring + scores */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>

        {/* Ring gauge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg viewBox="0 0 140 140" width={140} height={140} style={{ display: 'block' }}>
            {/* Track */}
            <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
            {/* Terracotta fill */}
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
          {/* Center value */}
          <div style={{
            position:   'absolute',
            inset:      0,
            display:    'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{
              fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:  700,
              fontSize:    '38px',
              color:       '#FFFFFF',
              letterSpacing: '-0.03em',
              lineHeight:  1,
            }}>
              {Math.round(value)}
            </span>
            <span style={{
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)',
              fontSize:   '11px',
              color:      'rgba(255,255,255,0.35)',
              lineHeight: 1,
              marginTop:  3,
            }}>
              /100
            </span>
          </div>
        </div>

        {/* Score identity */}
        <div style={{ minWidth: 140, flexShrink: 1 }}>
          <p style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:    600,
            fontSize:      '10px',
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color:         'rgba(255,255,255,0.35)',
            marginBottom:  6,
          }}>
            <TM>KORA Index</TM> v3
          </p>
          <p style={{
            fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:  700,
            fontSize:    '56px',
            color:       '#FFFFFF',
            letterSpacing: '-0.035em',
            lineHeight:  0.92,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {Math.round(value)}
            <span style={{ fontSize: '22px', color: 'rgba(255,255,255,0.35)', marginLeft: 4 }}>/100</span>
          </p>
          {methodologyVersion && (
            <p style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize:   '10px',
              color:      'rgba(255,255,255,0.25)',
              marginTop:  8,
            }}>
              {methodologyVersion}
            </p>
          )}
        </div>

        {/* Vertical divider */}
        <div style={{ width: 1, height: 80, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        {/* Governance states */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, minWidth: 180 }}>

          {/* Activation Safeguard™ */}
          <div>
            <p style={{
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:    600,
              fontSize:      '9.5px',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color:         'rgba(255,255,255,0.32)',
              marginBottom:  7,
            }}>
              Activation Safeguard™
            </p>
            <span style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          8,
              borderRadius: 999,
              padding:      '6px 14px',
              background:   safeg.bg,
              color:        safeg.text,
              border:       `1px solid ${safeg.dot}50`,
              fontSize:     '13px',
              fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:   700,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: safeg.dot, flexShrink: 0 }} />
              {safeg.label}
            </span>
          </div>

          {/* Hairline */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

          {/* Confidence Score™ */}
          <div>
            <p style={{
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:    600,
              fontSize:      '9.5px',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color:         'rgba(255,255,255,0.32)',
              marginBottom:  7,
            }}>
              Confidence Score™
            </p>
            <p style={{
              fontFamily:         'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:         700,
              fontSize:           '26px',
              color:              '#FFFFFF',
              letterSpacing:      '-0.02em',
              lineHeight:         1,
              fontVariantNumeric: 'tabular-nums',
              display:            'block',
              marginBottom:       5,
            }}>
              {formatConfidenceScore(confidenceScore)}
            </p>
            <p style={{
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:   '10px',
              color:      'rgba(255,255,255,0.28)',
              lineHeight: 1.4,
              display:    'block',
            }}>
              Esterno al KORA Index™ · peso = 0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
