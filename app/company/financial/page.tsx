'use client';

import { useRole, useScenario } from '@/lib/demo-state';
import { financialGovernanceService } from '@/services/financial-governance/FinancialGovernanceService';
import { cn } from '@/lib/utils';
import { PILLAR_LABELS } from '@/lib/constants/kora';
import type { PillarCode } from '@/lib/types';

const PILLAR_BAR: Record<string, string> = {
  LIFE:       'bg-green-500',
  GROWTH:     'bg-blue-500',
  CONNECTION: 'bg-purple-500',
  IMPACT:     'bg-orange-500',
  LEGACY:     'bg-amber-500',
};

function eur(val: number) {
  return `€${val.toLocaleString('it-IT')}`;
}

function BudgetCard({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={cn('text-xl font-bold mt-1', color ?? 'text-slate-800')}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// C-08: Financial Governance
export default function FinancialGovernance() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();

  const result = financialGovernanceService.getFinancialGovernance(
    'meridiana-group', activeScenario, activeRole,
  );

  if (!result.allowed) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Financial Governance</h1>
          <p className="text-sm text-slate-500">Meridiana Group S.r.l.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm font-semibold text-slate-600">Accesso Limitato</p>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            {result.reason ?? 'I dati di governance finanziaria sono riservati ai ruoli Finance e Admin.'}
          </p>
          <p className="mt-3 text-xs font-mono text-slate-400">Ruolo attivo: {activeRole}</p>
        </div>
      </div>
    );
  }

  const rec = result.record;
  if (!rec) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Financial Governance</h1>
        <p className="text-sm text-slate-400">Nessun dato di governance finanziaria disponibile per questo scenario.</p>
      </div>
    );
  }

  const utilizationColor =
    rec.budget_utilization_rate >= 0.70 ? 'text-green-600' :
    rec.budget_utilization_rate >= 0.50 ? 'text-yellow-600' : 'text-red-500';

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Financial Governance</h1>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
            Foundation Light Preview
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Meridiana Group S.r.l. — {rec.reporting_period}
        </p>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
          Vista informativa di governance KORA sull&apos;allocazione del budget e l&apos;allineamento all&apos;attivazione
          — non uno strumento di pagamento, wallet o gestione fondi welfare.
        </p>
      </div>

      {/* Mandatory disclaimer — non-suppressible */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-700">Solo Informativo</p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">{rec.disclaimer}</p>
      </div>

      {/* Budget summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BudgetCard
          label="Budget Allocato"
          value={eur(rec.budget_allocated_total)}
          sub={rec.currency}
        />
        <BudgetCard
          label="Budget Utilizzato"
          value={eur(rec.budget_used_total)}
          sub={`${(rec.budget_utilization_rate * 100).toFixed(0)}% utilizzo`}
          color={utilizationColor}
        />
        <BudgetCard
          label="Impegnato"
          value={eur(rec.budget_committed_total)}
          sub="in attesa di conferma"
        />
        <BudgetCard
          label="Residuo"
          value={eur(rec.budget_residual)}
          sub="non allocato o inutilizzato"
        />
      </div>

      {/* Utilization bar */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex justify-between text-xs mb-2">
          <span className="font-semibold text-slate-700">Utilizzo Budget</span>
          <span className={cn('font-mono font-semibold', utilizationColor)}>
            {(rec.budget_utilization_rate * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100">
          <div
            className={cn('h-2 rounded-full', rec.budget_utilization_rate >= 0.70 ? 'bg-green-500' : 'bg-yellow-400')}
            style={{ width: `${rec.budget_utilization_rate * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Costo per IU (informativo): <span className="font-mono text-slate-600">€{rec.cost_per_iu_indicator}</span>
        </p>
        <p className="text-xs text-slate-400">{rec.cost_per_iu_note}</p>
      </div>

      {/* Pillar budget breakdown */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Suddivisione Budget per Pillar
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          {rec.pillar_budget.map((line) => {
            const label = PILLAR_LABELS[line.pillar as PillarCode] ?? line.pillar;
            const barColor = PILLAR_BAR[line.pillar] ?? 'bg-slate-400';
            const usedPct = line.allocated > 0 ? (line.used / line.allocated) * 100 : 0;
            return (
              <div key={line.pillar}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">{label}</span>
                  <span className="text-slate-500 font-mono">
                    {eur(line.used)} / {eur(line.allocated)}
                    <span className="ml-2 text-slate-400">
                      ({line.utilization_rate * 100 < 1 ? (line.utilization_rate * 100).toFixed(1) : Math.round(line.utilization_rate * 100)}%)
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className={cn('h-1.5 rounded-full', barColor)}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-slate-400 pt-1">
            Le cifre di budget sono solo informative. Non alimentano il calcolo del KORA Index.
          </p>
        </div>
      </div>

      {/* KORA billing */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Fatturazione KORA (registro separato)
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Abbonamento</p>
              <p className="font-mono font-semibold text-slate-700">{eur(rec.kora_billing.subscription)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Setup</p>
              <p className="font-mono font-semibold text-slate-700">{eur(rec.kora_billing.setup)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Advisory</p>
              <p className="font-mono font-semibold text-slate-700">{eur(rec.kora_billing.advisory)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">{rec.kora_billing.note}</p>
        </div>
      </div>

      {/* Narrative context */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-600 mb-1">Contesto</p>
        <p className="text-xs text-slate-600 leading-relaxed">{rec.narrative}</p>
      </div>
    </div>
  );
}
