'use client';

import { cn } from '@/lib/utils';
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

const MACROBLOCK_COLORS: Record<MacroblockCode, { border: string; accent: string; bar: string; score: string; bg: string }> = {
  REACH:   { border: 'border-violet-200', accent: 'text-violet-700', bar: 'bg-violet-500',  score: 'text-violet-900',  bg: 'bg-violet-50/40' },
  QUALITY: { border: 'border-indigo-200', accent: 'text-indigo-700', bar: 'bg-indigo-500',  score: 'text-indigo-900',  bg: 'bg-indigo-50/40' },
  EQUITY:  { border: 'border-slate-200',  accent: 'text-slate-600',  bar: 'bg-slate-400',   score: 'text-slate-800',   bg: 'bg-slate-50/40' },
  BTI:     { border: 'border-purple-200', accent: 'text-purple-700', bar: 'bg-purple-500',  score: 'text-purple-900',  bg: 'bg-purple-50/40' },
};

function ScoreBar({ score, barClass }: { score: number; barClass: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 mt-2">
      <div
        className={cn('h-1.5 rounded-full transition-all', barClass)}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
  );
}

export function MacroblockCard({ macroblock, previousScore, className }: MacroblockCardProps) {
  const colors = MACROBLOCK_COLORS[macroblock.code as MacroblockCode] ?? {
    border: 'border-slate-200', accent: 'text-slate-600', bar: 'bg-slate-400', score: 'text-slate-900', bg: 'bg-slate-50',
  };
  const explanation = MACROBLOCK_EXPLANATIONS[macroblock.code] ?? '';
  const delta = previousScore !== undefined ? macroblock.score - previousScore : null;
  const componentCodes = MACROBLOCK_COMPONENTS[macroblock.code] ?? [];
  const isBTI = macroblock.code === 'BTI';

  return (
    <div className={cn('rounded-lg border bg-white p-4 space-y-3', colors.border, className)}>

      {/* ── Header: type badge + code + label + score ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            Macroblocco
          </span>
          <p className={cn('text-xs font-bold uppercase tracking-widest mt-1.5', colors.accent)}>
            {macroblock.code}
          </p>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">{macroblock.label}</p>
        </div>
        <div className="text-right shrink-0">
          <span className={cn('text-2xl font-bold', colors.score)}>{macroblock.score}</span>
          <span className="text-xs text-slate-400">/100</span>
          {delta !== null && (
            <p className={cn('text-xs font-semibold mt-0.5', delta >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
              {delta >= 0 ? '+' : ''}{delta}
            </p>
          )}
        </div>
      </div>

      <ScoreBar score={macroblock.score} barClass={colors.bar} />

      <p className="text-xs text-slate-500 leading-relaxed">{explanation}</p>

      {/* ── Weight + component family + aggregate note ── */}
      <div className={cn('rounded p-2.5 space-y-2', colors.bg)}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500">Peso KORA Index</span>
          <span className="text-[10px] font-bold text-slate-700">{Math.round(macroblock.weight * 100)}%</span>
        </div>

        {componentCodes.length > 0 ? (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Componenti analitici che lo alimentano
            </p>
            <div className="flex flex-wrap gap-1">
              {componentCodes.map((code) => (
                <span
                  key={code}
                  className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[9px] font-mono text-slate-500"
                >
                  {code} — {COMPONENT_LABELS[code] ?? code}
                </span>
              ))}
            </div>
          </div>
        ) : isBTI ? (
          <p className="text-[9px] text-slate-400 italic">
            Punteggio calcolato dal BudgetToHumanImpactEngine — non derivato dai componenti analitici.
          </p>
        ) : null}

        <p className="text-[9px] text-slate-400 italic leading-snug border-t border-white/60 pt-1.5">
          Il macroblocco è una sintesi aggregata di più segnali. Non coincide con un singolo componente.
        </p>
      </div>

      {macroblock.main_driver && (
        <div className="rounded bg-slate-50 p-2.5 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Driver principale</p>
          <p className="text-xs text-slate-600 leading-relaxed">{macroblock.main_driver}</p>
        </div>
      )}

      {macroblock.risk_opportunity && (
        <div className="rounded bg-blue-50/50 p-2.5 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-400">Opportunità</p>
          <p className="text-xs text-blue-700 leading-relaxed">{macroblock.risk_opportunity}</p>
        </div>
      )}
    </div>
  );
}
