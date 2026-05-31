'use client';

import { cn } from '@/lib/utils';
import type { MacroblockScore, MacroblockCode } from '@/lib/types';
import { MACROBLOCK_COMPONENTS } from '@/lib/constants/kora';

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

const MACROBLOCK_COLORS: Record<MacroblockCode, { border: string; accent: string; barColor: string; score: string; bg: string }> = {
  REACH:   { border: 'border-kora-violet/20',       accent: 'text-kora-violet',          barColor: '#6156F5', score: 'text-kora-cosmic-blue', bg: 'bg-kora-violet/5'     },
  QUALITY: { border: 'border-kora-violet/15',       accent: 'text-kora-violet/75',       barColor: '#7B61F5', score: 'text-kora-cosmic-blue', bg: 'bg-kora-violet/3'     },
  EQUITY:  { border: 'border-kora-cosmic-blue/12',  accent: 'text-kora-cosmic-blue/60',  barColor: '#3F3A8F', score: 'text-kora-cosmic-blue', bg: 'bg-kora-gray-base'    },
  BTI:     { border: 'border-kora-fun-green/30',    accent: 'text-kora-cosmic-blue/70',  barColor: '#06032B', score: 'text-kora-cosmic-blue', bg: 'bg-kora-fun-green/8'  },
};

function ScoreBar({ score, barColor }: { score: number; barColor: string }) {
  return (
    <div className="h-1.5 w-full rounded-full mt-2" style={{ background: '#F0F1F8' }}>
      <div
        className="h-1.5 rounded-full transition-all"
        style={{ width: `${Math.min(score, 100)}%`, background: barColor }}
      />
    </div>
  );
}

export function MacroblockCard({ macroblock, previousScore, className }: MacroblockCardProps) {
  const colors = MACROBLOCK_COLORS[macroblock.code as MacroblockCode] ?? {
    border: 'border-kora-cosmic-blue/10', accent: 'text-kora-cosmic-blue/60', barColor: '#06032B', score: 'text-kora-cosmic-blue', bg: 'bg-kora-gray-base',
  };
  const explanation    = MACROBLOCK_EXPLANATIONS[macroblock.code] ?? '';
  const delta          = previousScore !== undefined ? macroblock.score - previousScore : null;
  const componentCodes = MACROBLOCK_COMPONENTS[macroblock.code] ?? [];
  const isBTI          = macroblock.code === 'BTI';

  return (
    <div className={cn('rounded-xl border bg-white p-4 space-y-3', colors.border, className)}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center rounded border border-kora-cosmic-blue/10 bg-kora-gray-base px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-kora-cosmic-blue/40">
            Macroblocco
          </span>
          <p className={cn('text-[10px] font-bold uppercase tracking-widest mt-1.5', colors.accent)}>
            {macroblock.code}
          </p>
          <p className="text-sm font-semibold text-kora-cosmic-blue mt-0.5">{macroblock.label}</p>
        </div>
        <div className="text-right shrink-0">
          <span className={cn('text-2xl font-bold tabular-nums', colors.score)}>{macroblock.score}</span>
          <span className="text-xs text-kora-cosmic-blue/30">/100</span>
          {delta !== null && (
            <p className={cn('text-xs font-semibold mt-0.5', delta >= 0 ? 'text-kora-violet' : 'text-rose-600')}>
              {delta >= 0 ? '+' : ''}{delta}
            </p>
          )}
        </div>
      </div>

      <ScoreBar score={macroblock.score} barColor={colors.barColor} />

      <p className="text-xs text-kora-cosmic-blue/55 leading-relaxed">{explanation}</p>

      {/* ── Weight + component family ── */}
      <div className={cn('rounded-lg p-2.5 space-y-2', colors.bg)}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-kora-cosmic-blue/45">Peso KORA Index</span>
          <span className="text-[10px] font-bold text-kora-cosmic-blue">{Math.round(macroblock.weight * 100)}%</span>
        </div>

        {componentCodes.length > 0 ? (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-kora-cosmic-blue/35 mb-1">
              Componenti analitici
            </p>
            <div className="flex flex-wrap gap-1">
              {componentCodes.map((code) => (
                <span
                  key={code}
                  className="rounded bg-white border border-kora-cosmic-blue/10 px-1.5 py-0.5 text-[9px] font-mono text-kora-cosmic-blue/55"
                >
                  {code}
                </span>
              ))}
            </div>
          </div>
        ) : isBTI ? (
          <p className="text-[9px] text-kora-cosmic-blue/40 italic">
            Calcolato dal BudgetToHumanImpactEngine — non derivato dai componenti analitici.
          </p>
        ) : null}

        <p className="text-[9px] text-kora-cosmic-blue/35 italic leading-snug border-t border-white/60 pt-1.5">
          Sintesi aggregata di più segnali — non coincide con un singolo componente.
        </p>
      </div>

      {macroblock.main_driver && (
        <div className="rounded-lg bg-kora-gray-base border border-kora-cosmic-blue/8 p-2.5 space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-kora-cosmic-blue/40">Driver principale</p>
          <p className="text-xs text-kora-cosmic-blue/70 leading-relaxed">{macroblock.main_driver}</p>
        </div>
      )}

      {macroblock.risk_opportunity && (
        <div className="rounded-lg bg-kora-violet/5 border border-kora-violet/15 p-2.5 space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-kora-violet/60">Opportunità</p>
          <p className="text-xs text-kora-cosmic-blue/70 leading-relaxed">{macroblock.risk_opportunity}</p>
        </div>
      )}
    </div>
  );
}
