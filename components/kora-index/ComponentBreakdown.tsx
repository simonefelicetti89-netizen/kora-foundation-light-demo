'use client';

import { cn } from '@/lib/utils';
import { COMPONENT_LABELS, COMPONENT_MACROBLOCK, MACROBLOCK_LABELS } from '@/lib/constants/kora';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import type { KoraIndexComponent } from '@/lib/types';
import { formatPercentage } from '@/lib/formatters';

interface ComponentBreakdownProps {
  components?: KoraIndexComponent[];
  className?: string;
}

// Required copy per CLAUDE.md §12 — do not paraphrase
const COMPONENT_SHORT_DEFS: Record<string, string> = {
  AR:  'AR misura la quota di popolazione attivata almeno una volta nel periodo. Non coincide con l\'intero macroblocco Activation Reach.',
  MAR: 'Quota della forza lavoro con Impact Units sopra la soglia di materialità. MAR < AR per definizione — la differenza segnala la quota di partecipazione superficiale.',
  NI:  'Media delle Impact Units per lavoratore attivo, normalizzata. Misura la profondità dell\'engagement. Un NI alto su base AR bassa segnala attivazione intensa su una minoranza.',
  VR:  'Quota delle IU supportate da evidenze verificate o parzialmente verificate. Un VR basso si riflette nel Confidence Score.',
  CO:  'CO misura la continuità delle attivazioni nel tempo. Non coincide con l\'intero macroblocco Activation Quality.',
  WB:  'Uniformità della distribuzione delle IU tra i lavoratori attivi. WB basso segnala concentrazione strutturale.',
  PC:  'Numero di pillar con presenza significativa nel periodo, espresso su 5 pillar KORA totali.',
  PB:  'Uniformità della distribuzione delle IU tra i pillar attivi. Un pillar dominante abbassa PB anche se PC è moderato.',
  EQ:  'Equità distributiva dell\'attivazione tra segmenti aggregati (dipartimenti, siti, seniority — solo gruppi ≥ 10 lavoratori).',
};

// Macroblock → KORA token tints (ink-based, not rainbow)
const MACROBLOCK_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  REACH:   { bg: `${TOKENS.accent}0D`, text: TOKENS.accent,        border: `${TOKENS.accent}33`       },
  QUALITY: { bg: TOKENS.inkBorder,     text: TOKENS.inkSecondary,  border: 'rgba(6,3,43,0.14)'      },
  EQUITY:  { bg: TOKENS.inkBorder,     text: TOKENS.inkSecondary,  border: 'rgba(6,3,43,0.14)'      },
  BTI:     { bg: `${TOKENS.accent}0D`, text: TOKENS.accent,        border: `${TOKENS.accent}33`       },
};

const OPERATIONAL_CODES = ['AR', 'MAR', 'NI', 'VR', 'CO', 'WB', 'PC', 'PB', 'EQ'] as const;

export function ComponentBreakdown({ components, className }: ComponentBreakdownProps) {
  const csComp  = components?.find((c) => c.code === 'CS');
  const csValue = csComp?.value ?? null;

  return (
    <div className={cn('space-y-5', className)}>

      {/* ── 9 operational components ── */}
      <div>
        <p
          style={{
            fontFamily:    'var(--font-jakarta)',
            fontSize:      '10px',
            fontWeight:    500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:         TOKENS.inkHint,
            marginBottom:  '8px',
          }}
        >
          Componenti analitici (9) — ogni componente alimenta il proprio macroblocco, non il KORA Index direttamente
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {OPERATIONAL_CODES.map((code) => {
            const comp          = components?.find((c) => c.code === code);
            const value         = comp?.value ?? null;
            const weight        = comp?.weight ?? null;
            const macroblockCode  = COMPONENT_MACROBLOCK[code];
            const macroblockLabel = MACROBLOCK_LABELS[macroblockCode] ?? macroblockCode;
            const mbStyle       = MACROBLOCK_STYLE[macroblockCode] ?? MACROBLOCK_STYLE['QUALITY'];

            return (
              <div
                key={code}
                style={{
                  background:   TOKENS.surface,
                  border:       TOKENS.cardBorder,
                  borderRadius: '8px',
                  padding:      '12px',
                  display:      'flex',
                  flexDirection:'column',
                  gap:          '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display:       'inline-flex',
                        alignItems:    'center',
                        borderRadius:  '4px',
                        border:        TOKENS.cardBorder,
                        background:    TOKENS.inkBorder,
                        padding:       '1px 6px',
                        fontSize:      '8px',
                        fontWeight:    600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color:         TOKENS.inkHint,
                      }}
                    >
                      Componente analitico
                    </span>
                    <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: TOKENS.ink, marginTop: '4px' }}>
                      {code}
                    </p>
                    <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: '1px' }}>
                      {COMPONENT_LABELS[code]}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p
                      style={{
                        fontFamily:         'var(--font-jakarta)',
                        fontWeight:         700,
                        fontSize:           '20px',
                        color:              TOKENS.ink,
                        lineHeight:         1,
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing:      '-0.02em',
                      }}
                    >
                      {value !== null ? formatPercentage(value) : '—'}
                    </p>
                    {weight !== null && (
                      <p
                        style={{
                          fontFamily:    'monospace',
                          fontSize:      '9px',
                          color:         TOKENS.inkHint,
                          marginTop:     '2px',
                        }}
                      >
                        w: {formatPercentage(weight)}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: '6px',
                    background:   TOKENS.inkBorder,
                    padding:      '6px 8px',
                    display:      'flex',
                    flexDirection:'column',
                    gap:          '4px',
                  }}
                >
                  <span
                    style={{
                      display:       'inline-flex',
                      alignItems:    'center',
                      borderRadius:  '4px',
                      border:        `1px solid ${mbStyle.border}`,
                      background:    mbStyle.bg,
                      padding:       '1px 6px',
                      fontSize:      '9px',
                      fontWeight:    600,
                      color:         mbStyle.text,
                    }}
                  >
                    → {macroblockLabel}
                  </span>
                  <p style={{ fontSize: '9px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
                    {COMPONENT_SHORT_DEFS[code]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CS — external indicator, visually separated ── */}
      <div
        style={{
          borderRadius: TOKENS.cardRadius,
          border:       `1px solid ${TOKENS.accent}33`,
          background:   `${TOKENS.accent}07`,
          padding:      '12px',
        }}
      >
        <p
          style={{
            fontFamily:    'var(--font-jakarta)',
            fontSize:      '10px',
            fontWeight:    500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:         TOKENS.accent,
            marginBottom:  '8px',
          }}
        >
          Indicatore esterno — non entra nel calcolo KORA Index
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <span
              style={{
                display:       'inline-flex',
                alignItems:    'center',
                borderRadius:  '4px',
                border:        `1px solid ${TOKENS.accent}33`,
                background:    TOKENS.surface,
                padding:       '1px 6px',
                fontSize:      '8px',
                fontWeight:    600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color:         TOKENS.accent,
              }}
            >
              Indicatore esterno
            </span>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: TOKENS.ink, marginTop: '4px' }}>CS</p>
            <p style={{ fontSize: '10px', color: TOKENS.inkSecondary, marginTop: '1px' }}>{COMPONENT_LABELS['CS']}</p>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <p
                style={{
                  fontFamily:         'var(--font-jakarta)',
                  fontWeight:         700,
                  fontSize:           '20px',
                  color:              TOKENS.ink,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {csValue !== null ? formatPercentage(csValue) : '—'}
              </p>
              <span
                style={{
                  borderRadius: '4px',
                  border:       `1px solid ${TOKENS.accent}33`,
                  background:   TOKENS.surface,
                  padding:      '1px 6px',
                  fontSize:     '9px',
                  fontWeight:   700,
                  color:        TOKENS.accent,
                }}
              >
                Peso = 0
              </span>
              <span
                style={{
                  borderRadius: '4px',
                  border:       `1px solid ${TOKENS.accent}33`,
                  background:   TOKENS.surface,
                  padding:      '1px 6px',
                  fontSize:     '9px',
                  color:        TOKENS.accent,
                }}
              >
                Non entra nel KORA Index
              </span>
            </div>
            <p style={{ fontSize: '9px', color: TOKENS.accent, lineHeight: 1.55 }}>
              CS è esterno al KORA Index: misura affidabilità/qualità dei dati, non impatto. Peso = 0.
              Un Confidence Score basso riduce la fiducia interpretativa nell&apos;output — non ne modifica il valore numerico.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
