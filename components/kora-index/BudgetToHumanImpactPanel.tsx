'use client';

import { cn } from '@/lib/utils';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import type { BudgetToHumanImpactRecord } from '@/lib/types';

interface BudgetToHumanImpactPanelProps {
  s1?: BudgetToHumanImpactRecord;
  s2?: BudgetToHumanImpactRecord;
}

function eur(v: number, currency = 'EUR') {
  return v.toLocaleString('it-IT', { style: 'currency', currency, maximumFractionDigits: 0 });
}
function pct(v: number) { return `${Math.round(v * 100)}%`; }

function MetricRow({ label, s1Value, s2Value, delta, deltaPositive, note }: {
  label: string; s1Value: string; s2Value: string;
  delta?: string; deltaPositive?: boolean; note?: string;
}) {
  return (
    <tr style={{ borderBottom: TOKENS.cardBorder }}>
      <td className="py-2.5 pr-4 text-xs align-top" style={{ color: TOKENS.inkSecondary }}>
        {label}
        {note && <p className="text-[10px] leading-relaxed mt-0.5 max-w-xs" style={{ color: TOKENS.inkHint }}>{note}</p>}
      </td>
      <td className="py-2.5 pr-4 text-xs font-mono text-right align-top whitespace-nowrap" style={{ color: TOKENS.inkSecondary }}>{s1Value}</td>
      <td className="py-2.5 pr-4 text-xs font-mono font-semibold text-right align-top whitespace-nowrap" style={{ color: TOKENS.ink }}>{s2Value}</td>
      {delta !== undefined && (
        <td className={cn('py-2.5 text-xs font-semibold text-right align-top whitespace-nowrap')}
          style={{ color: deltaPositive ? TOKENS.safeguard.pass.text : TOKENS.safeguard.cap.text }}>
          {delta}
        </td>
      )}
    </tr>
  );
}

export function BudgetToHumanImpactPanel({ s1, s2 }: BudgetToHumanImpactPanelProps) {
  if (!s1 && !s2) {
    return (
      <div className="p-5" style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius }}>
        <p className="font-kora-serif text-kora-ink" style={{ fontSize: '1.125rem' }}>Budget-to-Human-Impact</p>
        <p className="mt-2 text-sm" style={{ color: TOKENS.inkHint }}>Dati BTI non disponibili per questo scenario.</p>
      </div>
    );
  }
  const currency = s2?.currency ?? s1?.currency ?? 'EUR';

  return (
    <div className="p-5 space-y-5" style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius }}>
      <div>
        <p className="font-kora-serif text-kora-ink" style={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}>
          Budget-to-Human-Impact
        </p>
        <p className="mt-1 text-xs leading-relaxed max-w-2xl" style={{ color: TOKENS.inkSecondary }}>
          Efficienza di conversione della spesa welfare in attivazione umana reale.
          Budget allocato ≠ Budget attivato. KORA misura ciò che accade dopo la spesa.
        </p>
        <p className="mt-1 text-[10px] italic" style={{ color: TOKENS.inkHint }}>
          Informational only — KORA non gestisce pagamenti, non custodisce fondi, non fornisce consulenza fiscale o classificazione normativa.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: `2px solid ${TOKENS.ink}` }}>
              <th className="pb-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: TOKENS.inkHint }}>Indicatore</th>
              <th className="pb-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wide" style={{ color: TOKENS.inkHint }}>S1</th>
              <th className="pb-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wide" style={{ color: TOKENS.ink }}>S2</th>
              <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-wide" style={{ color: TOKENS.inkHint }}>Δ</th>
            </tr>
          </thead>
          <tbody>
            <MetricRow label="Budget totale people/welfare" s1Value={s1 ? eur(s1.total_people_welfare_budget, currency) : '—'} s2Value={s2 ? eur(s2.total_people_welfare_budget, currency) : '—'} delta={s1 && s2 ? `+${eur(s2.total_people_welfare_budget - s1.total_people_welfare_budget, currency)}` : undefined} deltaPositive />
            <MetricRow label="Economic Relief Spend" s1Value={s1 ? eur(s1.economic_relief_spend, currency) : '—'} s2Value={s2 ? eur(s2.economic_relief_spend, currency) : '—'} delta={s1 && s2 ? `${eur(s2.economic_relief_spend - s1.economic_relief_spend, currency)}` : undefined} deltaPositive={s1 && s2 ? s2.economic_relief_spend < s1.economic_relief_spend : undefined} />
            <MetricRow label="Economic Relief Share" s1Value={s1 ? pct(s1.economic_relief_share) : '—'} s2Value={s2 ? pct(s2.economic_relief_share) : '—'} delta={s1 && s2 ? `${Math.round((s2.economic_relief_share - s1.economic_relief_share) * 100)} pp` : undefined} deltaPositive={s1 && s2 ? s2.economic_relief_share < s1.economic_relief_share : undefined} />
            <MetricRow label="Deep Activation Spend" s1Value={s1 ? eur(s1.deep_activation_spend, currency) : '—'} s2Value={s2 ? eur(s2.deep_activation_spend, currency) : '—'} delta={s1 && s2 ? `+${eur(s2.deep_activation_spend - s1.deep_activation_spend, currency)}` : undefined} deltaPositive />
            <MetricRow label="Deep Activation Share" s1Value={s1 ? pct(s1.deep_activation_share) : '—'} s2Value={s2 ? pct(s2.deep_activation_share) : '—'} delta={s1 && s2 ? `+${Math.round((s2.deep_activation_share - s1.deep_activation_share) * 100)} pp` : undefined} deltaPositive />
            <MetricRow label="Activation Debt" s1Value={s1 ? eur(s1.activation_debt_eur, currency) : '—'} s2Value={s2 ? eur(s2.activation_debt_eur, currency) : '—'} delta={s1 && s2 ? `${eur(s2.activation_debt_eur - s1.activation_debt_eur, currency)}` : undefined} deltaPositive={s1 && s2 ? s2.activation_debt_eur < s1.activation_debt_eur : undefined} />
            <MetricRow label="Reallocation Opportunity" s1Value={s1 ? eur(s1.reallocation_opportunity_eur, currency) : '—'} s2Value={s2 ? eur(s2.reallocation_opportunity_eur, currency) : '—'} delta={s1 && s2 ? `${eur(s2.reallocation_opportunity_eur - s1.reallocation_opportunity_eur, currency)}` : undefined} deltaPositive={s1 && s2 ? s2.reallocation_opportunity_eur < s1.reallocation_opportunity_eur : undefined} />
            <MetricRow label="Cost per Impact Unit" s1Value={s1 ? `€${s1.cost_per_impact_unit.toFixed(1)}` : '—'} s2Value={s2 ? `€${s2.cost_per_impact_unit.toFixed(1)}` : '—'} delta={s1 && s2 ? `${(s2.cost_per_impact_unit - s1.cost_per_impact_unit).toFixed(1)}` : undefined} deltaPositive={s1 && s2 ? s2.cost_per_impact_unit < s1.cost_per_impact_unit : undefined} />
            <MetricRow label="Cost per Deep Activated Worker" s1Value={s1 ? eur(s1.cost_per_deep_activated_worker, currency) : '—'} s2Value={s2 ? eur(s2.cost_per_deep_activated_worker, currency) : '—'} delta={s1 && s2 ? `+${eur(s2.cost_per_deep_activated_worker - s1.cost_per_deep_activated_worker, currency)}` : undefined} deltaPositive note="Un aumento riflette l'espansione dell'accesso a programmi più profondi e strutturati. Leggere insieme al cost per IU." />
            <MetricRow label="Equity of Spend" s1Value={s1 ? s1.equity_of_spend.toFixed(2) : '—'} s2Value={s2 ? s2.equity_of_spend.toFixed(2) : '—'} delta={s1 && s2 ? `+${(s2.equity_of_spend - s1.equity_of_spend).toFixed(2)}` : undefined} deltaPositive={s1 && s2 ? s2.equity_of_spend > s1.equity_of_spend : undefined} />
            <MetricRow label="Pillar Investment Balance" s1Value={s1 ? s1.pillar_investment_balance.toFixed(2) : '—'} s2Value={s2 ? s2.pillar_investment_balance.toFixed(2) : '—'} delta={s1 && s2 ? `+${(s2.pillar_investment_balance - s1.pillar_investment_balance).toFixed(2)}` : undefined} deltaPositive={s1 && s2 ? s2.pillar_investment_balance > s1.pillar_investment_balance : undefined} />
          </tbody>
        </table>
      </div>

      <div className="rounded-[10px] p-3 text-xs leading-relaxed" style={{ background: 'rgba(43,92,230,0.07)', color: '#1B2A4A' }}>
        <p className="font-semibold mb-1">Nota interpretativa: Cost per Deep Activated Worker</p>
        <p>Il costo per lavoratore profondamente attivato aumenta perché S2 estende l&apos;accesso a iniziative più strutturate e raggiunge una platea più ampia. In parallelo, il costo per Impact Unit scende da €22.4 a €13.8, segnalando una migliore efficienza complessiva dell&apos;attivazione. Non è inefficienza — è espansione di accesso.</p>
      </div>

      {(s1 || s2) && (
        <div className="space-y-3 pt-4" style={{ borderTop: TOKENS.cardBorder }}>
          {s1?.activation_debt_description_it && <p className="text-xs leading-relaxed" style={{ color: TOKENS.inkSecondary }}><span className="font-semibold" style={{ color: TOKENS.ink }}>S1 — Activation Debt: </span>{s1.activation_debt_description_it}</p>}
          {s2?.activation_debt_description_it && <p className="text-xs leading-relaxed" style={{ color: TOKENS.inkSecondary }}><span className="font-semibold" style={{ color: TOKENS.ink }}>S2 — Activation Debt: </span>{s2.activation_debt_description_it}</p>}
          {s2?.reallocation_opportunity_description_it && <p className="text-xs leading-relaxed" style={{ color: TOKENS.inkSecondary }}><span className="font-semibold" style={{ color: TOKENS.ink }}>Reallocation Opportunity S2: </span>{s2.reallocation_opportunity_description_it}</p>}
        </div>
      )}
    </div>
  );
}
