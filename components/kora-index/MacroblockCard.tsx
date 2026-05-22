'use client';

import { cn } from '@/lib/utils';
import type { MacroblockScore, MacroblockCode } from '@/lib/types';

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

const MACROBLOCK_COLORS: Record<MacroblockCode, { border: string; accent: string; bar: string; score: string }> = {
  REACH:   { border: 'border-blue-200',   accent: 'text-blue-700',   bar: 'bg-blue-500',   score: 'text-blue-900' },
  QUALITY: { border: 'border-violet-200', accent: 'text-violet-700', bar: 'bg-violet-500', score: 'text-violet-900' },
  EQUITY:  { border: 'border-teal-200',   accent: 'text-teal-700',   bar: 'bg-teal-500',   score: 'text-teal-900' },
  BTI:     { border: 'border-amber-200',  accent: 'text-amber-700',  bar: 'bg-amber-500',  score: 'text-amber-900' },
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
    border: 'border-slate-200', accent: 'text-slate-600', bar: 'bg-slate-400', score: 'text-slate-900',
  };
  const explanation = MACROBLOCK_EXPLANATIONS[macroblock.code] ?? '';
  const delta = previousScore !== undefined ? macroblock.score - previousScore : null;

  return (
    <div className={cn('rounded-lg border bg-white p-4 space-y-3', colors.border, className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={cn('text-xs font-bold uppercase tracking-widest', colors.accent)}>
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

      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <span className="text-xs text-slate-400">Peso</span>
        <span className="text-xs font-semibold text-slate-700">{Math.round(macroblock.weight * 100)}%</span>
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
