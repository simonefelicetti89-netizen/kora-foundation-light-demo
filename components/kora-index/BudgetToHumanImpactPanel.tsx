'use client';

import { cn } from '@/lib/utils';
import type { BudgetToHumanImpactRecord } from '@/lib/types';

interface BudgetToHumanImpactPanelProps {
  s1?: BudgetToHumanImpactRecord;
  s2?: BudgetToHumanImpactRecord;
  className?: string;
}

function eur(value: number, currency = 'EUR') {
  return value.toLocaleString('it-IT', { style: 'currency', currency, maximumFractionDigits: 0 });
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

interface MetricRowProps {
  label: string;
  s1Value: string;
  s2Value: string;
  delta?: string;
  deltaPositive?: boolean;
  note?: string;
}

function MetricRow({ label, s1Value, s2Value, delta, deltaPositive, note }: MetricRowProps) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2.5 pr-4 text-xs text-slate-600 align-top">
        {label}
        {note && <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5 max-w-xs">{note}</p>}
      </td>
      <td className="py-2.5 pr-4 text-xs font-mono text-slate-700 text-right align-top whitespace-nowrap">{s1Value}</td>
      <td className="py-2.5 pr-4 text-xs font-mono font-semibold text-slate-900 text-right align-top whitespace-nowrap">{s2Value}</td>
      {delta !== undefined && (
        <td className={cn(
          'py-2.5 text-xs font-semibold text-right align-top whitespace-nowrap',
          deltaPositive ? 'text-emerald-600' : 'text-rose-600',
        )}>
          {delta}
        </td>
      )}
    </tr>
  );
}

export function BudgetToHumanImpactPanel({ s1, s2, className }: BudgetToHumanImpactPanelProps) {
  if (!s1 && !s2) {
    return (
      <div className={cn('rounded-lg border border-slate-200 bg-white p-5', className)}>
        <h3 className="text-sm font-semibold text-slate-800">Budget-to-Human-Impact</h3>
        <p className="mt-2 text-sm text-slate-400">Dati BTI non disponibili per questo scenario.</p>
      </div>
    );
  }

  const currency = s2?.currency ?? s1?.currency ?? 'EUR';

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-5 space-y-5', className)}>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Budget-to-Human-Impact</h3>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-2xl">
          Efficienza di conversione della spesa welfare in attivazione umana reale.
          Budget allocato ≠ Budget attivato. KORA misura ciò che accade dopo la spesa.
        </p>
        <p className="mt-1 text-[10px] text-slate-400 italic">
          Informational only — KORA non gestisce pagamenti, non custodisce fondi, non fornisce consulenza fiscale o classificazione normativa.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="pb-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Indicatore</th>
              <th className="pb-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">S1</th>
              <th className="pb-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-700">S2</th>
              <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">Δ</th>
            </tr>
          </thead>
          <tbody>
            <MetricRow
              label="Budget totale people/welfare"
              s1Value={s1 ? eur(s1.total_people_welfare_budget, currency) : '—'}
              s2Value={s2 ? eur(s2.total_people_welfare_budget, currency) : '—'}
              delta={s1 && s2 ? `+${eur(s2.total_people_welfare_budget - s1.total_people_welfare_budget, currency)}` : undefined}
              deltaPositive={s1 && s2 ? s2.total_people_welfare_budget >= s1.total_people_welfare_budget : undefined}
            />
            <MetricRow
              label="Economic Relief Spend"
              s1Value={s1 ? eur(s1.economic_relief_spend, currency) : '—'}
              s2Value={s2 ? eur(s2.economic_relief_spend, currency) : '—'}
              delta={s1 && s2 ? `${eur(s2.economic_relief_spend - s1.economic_relief_spend, currency)}` : undefined}
              deltaPositive={s1 && s2 ? s2.economic_relief_spend < s1.economic_relief_spend : undefined}
            />
            <MetricRow
              label="Economic Relief Share"
              s1Value={s1 ? pct(s1.economic_relief_share) : '—'}
              s2Value={s2 ? pct(s2.economic_relief_share) : '—'}
              delta={s1 && s2 ? `${Math.round((s2.economic_relief_share - s1.economic_relief_share) * 100)} pp` : undefined}
              deltaPositive={s1 && s2 ? s2.economic_relief_share < s1.economic_relief_share : undefined}
            />
            <MetricRow
              label="Deep Activation Spend"
              s1Value={s1 ? eur(s1.deep_activation_spend, currency) : '—'}
              s2Value={s2 ? eur(s2.deep_activation_spend, currency) : '—'}
              delta={s1 && s2 ? `+${eur(s2.deep_activation_spend - s1.deep_activation_spend, currency)}` : undefined}
              deltaPositive={s1 && s2 ? s2.deep_activation_spend > s1.deep_activation_spend : undefined}
            />
            <MetricRow
              label="Deep Activation Share"
              s1Value={s1 ? pct(s1.deep_activation_share) : '—'}
              s2Value={s2 ? pct(s2.deep_activation_share) : '—'}
              delta={s1 && s2 ? `+${Math.round((s2.deep_activation_share - s1.deep_activation_share) * 100)} pp` : undefined}
              deltaPositive
            />
            <MetricRow
              label="Activation Debt"
              s1Value={s1 ? eur(s1.activation_debt_eur, currency) : '—'}
              s2Value={s2 ? eur(s2.activation_debt_eur, currency) : '—'}
              delta={s1 && s2 ? `${eur(s2.activation_debt_eur - s1.activation_debt_eur, currency)}` : undefined}
              deltaPositive={s1 && s2 ? s2.activation_debt_eur < s1.activation_debt_eur : undefined}
            />
            <MetricRow
              label="Reallocation Opportunity"
              s1Value={s1 ? eur(s1.reallocation_opportunity_eur, currency) : '—'}
              s2Value={s2 ? eur(s2.reallocation_opportunity_eur, currency) : '—'}
              delta={s1 && s2 ? `${eur(s2.reallocation_opportunity_eur - s1.reallocation_opportunity_eur, currency)}` : undefined}
              deltaPositive={s1 && s2 ? s2.reallocation_opportunity_eur < s1.reallocation_opportunity_eur : undefined}
            />
            <MetricRow
              label="Cost per Impact Unit"
              s1Value={s1 ? `€${s1.cost_per_impact_unit.toFixed(1)}` : '—'}
              s2Value={s2 ? `€${s2.cost_per_impact_unit.toFixed(1)}` : '—'}
              delta={s1 && s2 ? `${(s2.cost_per_impact_unit - s1.cost_per_impact_unit).toFixed(1)}` : undefined}
              deltaPositive={s1 && s2 ? s2.cost_per_impact_unit < s1.cost_per_impact_unit : undefined}
            />
            <MetricRow
              label="Cost per Deep Activated Worker"
              s1Value={s1 ? eur(s1.cost_per_deep_activated_worker, currency) : '—'}
              s2Value={s2 ? eur(s2.cost_per_deep_activated_worker, currency) : '—'}
              delta={s1 && s2 ? `+${eur(s2.cost_per_deep_activated_worker - s1.cost_per_deep_activated_worker, currency)}` : undefined}
              deltaPositive
              note="Un aumento riflette l'espansione dell'accesso a programmi più profondi e strutturati. Leggere insieme al cost per IU."
            />
            <MetricRow
              label="Equity of Spend"
              s1Value={s1 ? s1.equity_of_spend.toFixed(2) : '—'}
              s2Value={s2 ? s2.equity_of_spend.toFixed(2) : '—'}
              delta={s1 && s2 ? `+${(s2.equity_of_spend - s1.equity_of_spend).toFixed(2)}` : undefined}
              deltaPositive={s1 && s2 ? s2.equity_of_spend > s1.equity_of_spend : undefined}
            />
            <MetricRow
              label="Pillar Investment Balance"
              s1Value={s1 ? s1.pillar_investment_balance.toFixed(2) : '—'}
              s2Value={s2 ? s2.pillar_investment_balance.toFixed(2) : '—'}
              delta={s1 && s2 ? `+${(s2.pillar_investment_balance - s1.pillar_investment_balance).toFixed(2)}` : undefined}
              deltaPositive={s1 && s2 ? s2.pillar_investment_balance > s1.pillar_investment_balance : undefined}
            />
          </tbody>
        </table>
      </div>

      {/* Cost per deep worker note */}
      <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 leading-relaxed">
        <p className="font-semibold mb-1">Nota interpretativa: Cost per Deep Activated Worker</p>
        <p>
          Il costo per lavoratore profondamente attivato aumenta perché S2 estende l&apos;accesso a
          iniziative più strutturate e raggiunge una platea più ampia. In parallelo, il costo per
          Impact Unit scende da €22.4 a €13.8, segnalando una migliore efficienza complessiva
          dell&apos;attivazione. Non è inefficienza — è espansione di accesso.
        </p>
      </div>

      {/* Activation debt description */}
      {(s1 || s2) && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          {s1?.activation_debt_description_it && (
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-700">S1 — Activation Debt: </span>
              {s1.activation_debt_description_it}
            </div>
          )}
          {s2?.activation_debt_description_it && (
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-700">S2 — Activation Debt: </span>
              {s2.activation_debt_description_it}
            </div>
          )}
          {s2?.reallocation_opportunity_description_it && (
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-700">Reallocation Opportunity S2: </span>
              {s2.reallocation_opportunity_description_it}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
