'use client';

import { cn } from '@/lib/utils';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import type { MacroblockScore, MacroblockCode } from '@/lib/types';
import { MACROBLOCK_COMPONENTS, COMPONENT_LABELS } from '@/lib/constants/kora';

interface MacroblockCardProps {
  macroblock: MacroblockScore;
  previousScore?: number;
  className?: string;
}

const MACROBLOCK_EXPLANATIONS: Record<string, string> = {
  REACH:   'Misura se l\'attivazione raggiunge una quota significativa della popolazione aziendale.',
  QUALITY: 'Misura se le azioni generano attivazione profonda, verificata, addizionale e continua.',
  EQUITY:  'Misura se valore e attivazione sono distribuiti tra lavoratori, sedi, reparti e cluster.',
  BTI:     'Misura quanto efficacemente il budget people/welfare diventa valore umano reale.',
};

// §8 — CSS subgrid alignment across 4-column grid.
// This card uses grid-row: span 6 + grid-template-rows: subgrid so all 4 cards
// share the same 6 parent row tracks → sections align at identical baseline.
// Fallback (no subgrid support): sections stack naturally, still readable.
export function MacroblockCard({ macroblock, previousScore, className }: MacroblockCardProps) {
  const explanation    = MACROBLOCK_EXPLANATIONS[macroblock.code] ?? '';
  const delta          = previousScore !== undefined ? macroblock.score - previousScore : null;
  const componentCodes = MACROBLOCK_COMPONENTS[macroblock.code as MacroblockCode] ?? [];
  const isBTI          = macroblock.code === 'BTI';

  return (
    <div
      className={cn('p-4', className)}
      style={{
        background:          TOKENS.surface,
        border:              TOKENS.cardBorder,
        borderRadius:        TOKENS.cardRadius,
        display:             'grid',
        gridRow:             'span 6',
        gridTemplateRows:    'subgrid',
      }}
    >

      {/* Row 1 — Header: code eyebrow + label + score */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* §3 — eyebrow: Inter non mono; §5 — resta viola (macroblock code) */}
          <p
            className="uppercase font-semibold"
            style={{ fontFamily: 'var(--font-inter)', fontSize: '11px', letterSpacing: '0.08em', color: TOKENS.accent }}
          >
            {macroblock.code}
          </p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: TOKENS.ink }}>{macroblock.label}</p>
        </div>
        <div className="text-right shrink-0">
          <span
            style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '22px', color: TOKENS.ink, letterSpacing: '-0.02em' }}
          >
            {macroblock.score}
          </span>
          <span className="text-xs ml-0.5" style={{ color: TOKENS.inkHint }}>/100</span>
          {delta !== null && (
            <p
              className="text-xs font-semibold mt-0.5"
              style={{ color: delta >= 0 ? TOKENS.safeguard.pass.text : TOKENS.safeguard.cap.text }}
            >
              {delta >= 0 ? '+' : ''}{delta}
            </p>
          )}
        </div>
      </div>

      {/* Row 2 — Bar */}
      <div className="h-1.5 w-full rounded-full" style={{ background: TOKENS.inkTrack }}>
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${Math.min(macroblock.score, 100)}%`, background: TOKENS.ink }}
        />
      </div>

      {/* Row 3 — Description */}
      <p className="text-xs leading-relaxed" style={{ color: TOKENS.inkSecondary }}>{explanation}</p>

      {/* Row 4 — Weight + components block */}
      <div className="rounded-[8px] p-2.5 space-y-2" style={{ background: TOKENS.inkBorder }}>
        <div className="flex items-center gap-3 text-[10px]">
          <span style={{ color: TOKENS.inkSecondary }}>Peso KORA Index</span>
          <span className="font-bold" style={{ color: TOKENS.ink }}>{Math.round(macroblock.weight * 100)}%</span>
        </div>

        {componentCodes.length > 0 ? (
          <div>
            {/* §3 — Inter non mono */}
            <p className="text-[9px] font-semibold uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-inter)', color: TOKENS.inkHint }}>
              Componenti analitici
            </p>
            <div className="flex flex-wrap gap-1">
              {componentCodes.map((code) => (
                <span
                  key={code}
                  className="rounded px-1.5 py-0.5 text-[9px] font-mono"
                  style={{ background: TOKENS.surface, border: TOKENS.cardBorder, color: TOKENS.inkSecondary }}
                >
                  {code} — {COMPONENT_LABELS[code] ?? code}
                </span>
              ))}
            </div>
          </div>
        ) : isBTI ? (
          <p className="text-[9px] italic" style={{ color: TOKENS.inkHint }}>
            Calcolato dal motore — non derivato dai componenti analitici.
          </p>
        ) : null}
      </div>

      {/* Row 5 — Driver principale (empty div preserves subgrid row when absent) */}
      {macroblock.main_driver ? (
        <div className="rounded-[8px] p-2.5 space-y-1" style={{ background: TOKENS.inkBorder }}>
          {/* §3 — Inter non mono */}
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ fontFamily: 'var(--font-inter)', color: TOKENS.inkHint }}>Driver principale</p>
          <p className="text-xs leading-relaxed" style={{ color: TOKENS.inkSecondary }}>{macroblock.main_driver}</p>
        </div>
      ) : <div />}

      {/* Row 6 — Opportunità (empty div preserves subgrid row when absent) */}
      {macroblock.risk_opportunity ? (
        <div
          className="rounded-[8px] p-2.5 space-y-1"
          style={{ background: 'rgba(97,86,245,0.06)', border: '1px solid rgba(97,86,245,0.12)' }}
        >
          {/* §3 Inter non mono; §5 — header Opportunità: ink non viola */}
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ fontFamily: 'var(--font-inter)', color: TOKENS.ink }}>Opportunità</p>
          <p className="text-xs leading-relaxed" style={{ color: TOKENS.inkSecondary }}>{macroblock.risk_opportunity}</p>
        </div>
      ) : <div />}

    </div>
  );
}
