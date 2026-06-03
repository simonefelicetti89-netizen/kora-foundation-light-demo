'use client';

import type { MacroblockScore } from '@/lib/types';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { TM } from '@/components/ui/TM';

interface MacroblockCompositionCardProps {
  macroblocks: MacroblockScore[];
}

const MB_LABELS: Record<string, { short: string; desc: string }> = {
  REACH:   { short: 'Reach',   desc: 'Ampiezza e distribuzione dell\'attivazione' },
  QUALITY: { short: 'Quality', desc: 'Profondità, verifica e continuità' },
  EQUITY:  { short: 'Equity',  desc: 'Distribuzione equa tra segmenti workforce' },
  BTI:     { short: 'BTI',     desc: 'Efficienza budget → attivazione profonda' },
};

function scoreColor(score: number): string {
  if (score >= 70) return TOKENS.success;
  if (score >= 50) return TOKENS.warning;
  return TOKENS.critical;
}

function barColor(score: number, isPrimary: boolean): string {
  if (isPrimary) return TOKENS.accent;
  if (score >= 70) return 'rgba(6,3,43,0.65)';
  if (score >= 50) return 'rgba(6,3,43,0.45)';
  return TOKENS.critical;
}

export function MacroblockCompositionCard({ macroblocks }: MacroblockCompositionCardProps) {
  if (macroblocks.length === 0) return null;

  const sorted = [...macroblocks].sort((a, b) => b.score - a.score);
  const primary = sorted[0];

  return (
    <div
      className="p-6"
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
        boxShadow:    TOKENS.cardShadow,
      }}
    >
      {/* Card header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', fontSize: '1.25rem', letterSpacing: '-0.01em', lineHeight: 1.2, color: TOKENS.ink }}>
            Composizione <TM>KORA Index</TM>
          </p>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 4 }}>
            4 macroblocchi · pesi calibrazione pre-empirica
          </p>
        </div>
        {primary && (
          <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
            <p style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: TOKENS.inkHint, whiteSpace: 'nowrap' as const }}>
              Punto di forza
            </p>
            <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 700, fontSize: '22px', color: TOKENS.accent, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(primary.score)}
            </p>
            <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 3, whiteSpace: 'nowrap' as const }}>{MB_LABELS[primary.code]?.short ?? primary.code}</p>
          </div>
        )}
      </div>

      {/* 4-macroblock grid — each cell fully self-contained */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap:                 '20px 24px',
        }}
      >
        {macroblocks.map((mb, idx) => {
          const isPrimary = idx === 0;
          const meta      = MB_LABELS[mb.code];
          const score     = Math.round(mb.score);
          const weightPct = Math.round(mb.weight * 100);

          return (
            <div key={mb.code} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>

              {/* Row 1: short label + score — clearly separated, never adjacent */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <p style={{
                  fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                  fontWeight:    600,
                  fontSize:      '10.5px',
                  color:         isPrimary ? TOKENS.accent : TOKENS.inkSecondary,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase' as const,
                  whiteSpace:    'nowrap' as const,
                  flex:          1,
                  minWidth:      0,
                  overflow:      'hidden',
                  textOverflow:  'ellipsis',
                }}>
                  {meta?.short ?? mb.code}
                </p>
                {/* Score is in its own non-shrinking container — can never touch the label */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, flexShrink: 0 }}>
                  <span style={{
                    fontFamily:         'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                    fontWeight:         700,
                    fontSize:           '20px',
                    color:              scoreColor(mb.score),
                    letterSpacing:      '-0.02em',
                    lineHeight:         1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {score}
                  </span>
                  <span style={{ fontSize: '10px', color: TOKENS.inkHint, flexShrink: 0 }}>/100</span>
                </div>
              </div>

              {/* Row 2: progress bar — full width, clearly separated from text */}
              <div style={{ height: 5, borderRadius: 999, background: TOKENS.inkBorder, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ width: `${Math.min(score, 100)}%`, height: '100%', borderRadius: 999, background: barColor(mb.score, isPrimary) }} />
              </div>

              {/* Row 3: description and weight — separated with guaranteed gap */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <p style={{
                  fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                  fontSize:   '9.5px',
                  color:      TOKENS.inkHint,
                  lineHeight: 1.45,
                  flex:       1,
                  minWidth:   0,
                }}>
                  {meta?.desc}
                </p>
                {/* Weight percentage — always in its own distinct chip */}
                <span style={{
                  fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                  fontSize:      '9.5px',
                  color:         TOKENS.inkHint,
                  fontWeight:    600,
                  whiteSpace:    'nowrap' as const,
                  flexShrink:    0,
                  background:    TOKENS.inkBorder,
                  borderRadius:  4,
                  padding:       '1px 6px',
                }}>
                  {weightPct}%
                </span>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
