'use client';

import { cn } from '@/lib/utils';
import type { EconomicReliefSummary } from '@/services/budget-to-human-impact/BudgetToHumanImpactService';

interface EconomicReliefPanelProps {
  s1?: EconomicReliefSummary | null;
  s2?: EconomicReliefSummary | null;
  s1BtiScore?: number;
  s2BtiScore?: number;
  className?: string;
}

function EurAmount({ value, currency = 'EUR' }: { value: number; currency?: string }) {
  return (
    <span>
      {value.toLocaleString('it-IT', { style: 'currency', currency, maximumFractionDigits: 0 })}
    </span>
  );
}

function ShareBar({ share, label, colorClass }: { share: number; label: string; colorClass: string }) {
  const pct = Math.round(share * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={cn('h-2 rounded-full', colorClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ScenarioColumn({
  label,
  summary,
  btiScore,
  highlight,
}: {
  label: string;
  summary: EconomicReliefSummary;
  btiScore?: number;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-lg border p-4 space-y-4',
      highlight ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white',
    )}>
      <div className="flex items-center justify-between">
        <p className={cn('text-xs font-bold uppercase tracking-widest', highlight ? 'text-slate-400' : 'text-slate-500')}>
          {label}
        </p>
        {btiScore !== undefined && (
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded',
            highlight ? 'bg-slate-700 text-amber-300' : 'bg-amber-50 text-amber-700 border border-amber-200',
          )}>
            BTI {btiScore}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <ShareBar
          share={summary.economic_relief_share}
          label="Economic Relief Share"
          colorClass="bg-amber-400"
        />
        <ShareBar
          share={summary.deep_activation_share}
          label="Deep Activation Share"
          colorClass="bg-emerald-500"
        />
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className={highlight ? 'text-slate-400' : 'text-slate-500'}>Economic Relief</span>
          <span className={cn('font-semibold', highlight ? 'text-amber-300' : 'text-amber-700')}>
            <EurAmount value={summary.economic_relief_spend} currency={summary.currency} />
          </span>
        </div>
        <div className="flex justify-between">
          <span className={highlight ? 'text-slate-400' : 'text-slate-500'}>Deep Activation</span>
          <span className={cn('font-semibold', highlight ? 'text-emerald-400' : 'text-emerald-700')}>
            <EurAmount value={summary.deep_activation_spend} currency={summary.currency} />
          </span>
        </div>
        <div className="flex justify-between border-t pt-1.5" style={{ borderColor: highlight ? '#334155' : '#f1f5f9' }}>
          <span className={highlight ? 'text-slate-400' : 'text-slate-500'}>Budget usato totale</span>
          <span className={cn('font-semibold', highlight ? 'text-slate-200' : 'text-slate-700')}>
            <EurAmount value={summary.total_used_budget} currency={summary.currency} />
          </span>
        </div>
      </div>
    </div>
  );
}

export function EconomicReliefPanel({
  s1,
  s2,
  s1BtiScore,
  s2BtiScore,
  className,
}: EconomicReliefPanelProps) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-5 space-y-5', className)}>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">
          Economic Relief &amp; Activation Opportunity
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">Sollievo economico e opportunità di attivazione</p>
        <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-2xl">
          Questi benefit offrono sostegno economico, ma generano profondità di attivazione limitata.{' '}
          <span className="font-semibold text-slate-700">Non è spesa sbagliata. È spesa che può diventare più intelligente.</span>
        </p>
      </div>

      {s1 && s2 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <ScenarioColumn label="S1 — Q1–Q3 2025" summary={s1} btiScore={s1BtiScore} />
            <ScenarioColumn label="S2 — Q1–Q4 2025" summary={s2} btiScore={s2BtiScore} highlight />
          </div>

          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 space-y-1.5 text-xs text-emerald-800">
            <p className="font-semibold">Cosa è cambiato in S2:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                Economic Relief Share:{' '}
                <span className="font-semibold">{Math.round(s1.economic_relief_share * 100)}%</span>
                {' '}→{' '}
                <span className="font-semibold">{Math.round(s2.economic_relief_share * 100)}%</span>
                {' '}(−{Math.round((s1.economic_relief_share - s2.economic_relief_share) * 100)} pp)
              </li>
              <li>
                Deep Activation Share:{' '}
                <span className="font-semibold">{Math.round(s1.deep_activation_share * 100)}%</span>
                {' '}→{' '}
                <span className="font-semibold">{Math.round(s2.deep_activation_share * 100)}%</span>
                {' '}(+{Math.round((s2.deep_activation_share - s1.deep_activation_share) * 100)} pp)
              </li>
              {s1BtiScore !== undefined && s2BtiScore !== undefined && (
                <li>
                  BTI Macroblock:{' '}
                  <span className="font-semibold">{s1BtiScore}</span>
                  {' '}→{' '}
                  <span className="font-semibold">{s2BtiScore}</span>
                  {' '}(+{s2BtiScore - s1BtiScore} punti)
                </li>
              )}
            </ul>
            <p className="text-emerald-700 pt-1">
              La riallocazione parziale della spesa economic relief verso deep_activation migliora Activation Quality, Distribution &amp; Equity e il macroblock Budget-to-Human-Impact.
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400">Dati Economic Relief non disponibili per questo scenario.</p>
      )}
    </div>
  );
}
