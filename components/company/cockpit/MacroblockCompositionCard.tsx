'use client';

import type { MacroblockScore } from '@/lib/types';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface MacroblockCompositionCardProps {
  macroblocks: MacroblockScore[];
}

const MB_DESC: Record<string, string> = {
  REACH:   'Share e intensità dell\'attivazione nella forza lavoro',
  QUALITY: 'Qualità, continuità e verificabilità delle attivazioni',
  EQUITY:  'Distribuzione equa tra segmenti della workforce',
  BTI:     'Efficienza del budget people in attivazione profonda',
};

export function MacroblockCompositionCard({ macroblocks }: MacroblockCompositionCardProps) {
  if (macroblocks.length === 0) return null;

  return (
    <div
      className="p-6"
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
      }}
    >
      {/* Title */}
      <p
        className="font-kora-serif text-kora-ink mb-5"
        style={{ fontSize: '1.375rem', letterSpacing: '-0.01em', lineHeight: 1.2 }}
      >
        Composizione dell&apos;Index
      </p>

      {/* Macroblock rows */}
      <div className="space-y-4">
        {macroblocks.map((mb) => {
          const desc = MB_DESC[mb.code] ?? mb.label;
          return (
            <div key={mb.code}>
              {/* Row top: label + weight% + score */}
              <div className="flex items-baseline justify-between mb-0.5 gap-3">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span
                    style={{
                      fontFamily:    'var(--font-inter)',
                      fontWeight:    600,
                      fontSize:      '12.5px',
                      color:         TOKENS.ink,
                      letterSpacing: '-0.005em',
                      whiteSpace:    'nowrap',
                    }}
                  >
                    {mb.label}
                  </span>
                  <span
                    className="truncate"
                    style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize:   '11px',
                      color:      'rgba(20,18,46,0.42)',
                    }}
                  >
                    {desc}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 flex-shrink-0">
                  <span
                    style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize:   '11px',
                      color:      'rgba(20,18,46,0.50)',
                    }}
                  >
                    {Math.round(mb.weight * 100)}%
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-inter)',
                      fontWeight: 700,
                      fontSize:   '14px',
                      color:      TOKENS.ink,
                      minWidth:   '28px',
                      textAlign:  'right',
                    }}
                  >
                    {mb.score}
                  </span>
                </div>
              </div>
              {/* Bar */}
              <div
                className="rounded-full h-1.5 overflow-hidden"
                style={{ background: TOKENS.inkTrack }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width:      `${mb.score}%`,
                    background: TOKENS.ink,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
