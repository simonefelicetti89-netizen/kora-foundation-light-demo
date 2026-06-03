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
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', fontSize: '1.25rem', letterSpacing: '-0.01em', lineHeight: 1.2, color: TOKENS.ink }}>
            Composizione <TM>KORA Index</TM>
          </p>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 4 }}>
            4 macroblocchi · pesi calibrazione pre-empirica
          </p>
        </div>
        {primary && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: TOKENS.inkHint }}>
              Punto di forza
            </p>
            <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontWeight: 700, fontSize: '22px', color: TOKENS.accent, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 2 }}>
              {primary.score}
            </p>
            <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 2 }}>{MB_LABELS[primary.code]?.short ?? primary.code}</p>
          </div>
        )}
      </div>

      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        {macroblocks.map((mb, idx) => {
          const isPrimary = idx === 0;
          const meta = MB_LABELS[mb.code];
          return (
            <div key={mb.code}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 600, fontSize: '10.5px', color: isPrimary ? TOKENS.accent : TOKENS.inkSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>
                  {meta?.short ?? mb.code}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 700, fontSize: '22px', color: scoreColor(mb.score), letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {mb.score}
                  </span>
                  <span style={{ fontSize: '10px', color: TOKENS.inkHint }}>/100</span>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: TOKENS.inkBorder, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ width: `${mb.score}%`, height: '100%', borderRadius: 999, background: barColor(mb.score, isPrimary) }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '9.5px', color: TOKENS.inkHint, lineHeight: 1.4, flex: 1 }}>{meta?.desc}</p>
                <span style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '9.5px', color: TOKENS.inkHint, fontWeight: 600, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{Math.round(mb.weight * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
