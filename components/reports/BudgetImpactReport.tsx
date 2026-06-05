import type { BudgetToHumanImpactRecord } from '@/lib/types';
import type { MacroblockScore, ScenarioId, KoraRole } from '@/lib/types';
import { btiIntelligenceService } from '@/services/bti-intelligence/BTIIntelligenceService';
import type { PillarInvestmentStatus } from '@/services/bti-intelligence/BTIIntelligenceService';

interface Props {
  s1Record: BudgetToHumanImpactRecord | undefined;
  s2Record: BudgetToHumanImpactRecord | undefined;
  s1Macroblocks: MacroblockScore[];
  s2Macroblocks: MacroblockScore[];
  activeScenario: ScenarioId;
  role?: KoraRole;
}

function fmt(n: number, currency = 'EUR') {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

interface MetricRow {
  label: string;
  s1: string;
  s2: string;
  delta?: string;
  deltaPositive?: boolean;
  note?: string;
}

const MB_ACCENT: Record<string, string> = {
  REACH:  'text-blue-700',
  QUALITY:'text-violet-700',
  EQUITY: 'text-[rgba(6,3,43,0.62)]',
  BTI:    'text-amber-700',
};

const STATUS_STYLES: Record<PillarInvestmentStatus, { label: string; color: string }> = {
  over_concentrated: { label: 'sovra-concentrato', color: 'rgba(158,59,47,0.85)' },
  balanced:          { label: 'bilanciato',         color: 'rgba(47,125,85,0.85)' },
  under_invested:    { label: 'sotto-investito',    color: 'rgba(138,90,0,0.85)'  },
};

export function BudgetImpactReport({ s1Record, s2Record, s1Macroblocks, s2Macroblocks, activeScenario, role = 'COMPANY_ADMIN' }: Props) {
  const activeRecord = activeScenario === 'S2' ? s2Record : s1Record;

  // B66: intelligence layer — rule-based, no LLM
  const activeIntelligence = activeRecord ? btiIntelligenceService.compute(activeRecord, role) : null;

  if (!s1Record && !s2Record) {
    return (
      <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-6 text-sm text-[rgba(6,3,43,0.40)]">
        Dati BTI non disponibili per questo scenario.
      </div>
    );
  }

  const budgetRows: MetricRow[] = [
    {
      label: 'Budget People/Welfare Totale',
      s1: s1Record ? fmt(s1Record.total_people_welfare_budget) : '—',
      s2: s2Record ? fmt(s2Record.total_people_welfare_budget) : '—',
    },
    {
      label: 'Deep Activation Spend',
      s1: s1Record ? fmt(s1Record.deep_activation_spend) : '—',
      s2: s2Record ? fmt(s2Record.deep_activation_spend) : '—',
      delta: s1Record && s2Record ? fmt(s2Record.deep_activation_spend - s1Record.deep_activation_spend) : undefined,
      deltaPositive: s1Record && s2Record ? s2Record.deep_activation_spend > s1Record.deep_activation_spend : undefined,
    },
    {
      label: 'Deep Activation Share',
      s1: s1Record ? pct(s1Record.deep_activation_share) : '—',
      s2: s2Record ? pct(s2Record.deep_activation_share) : '—',
      delta: s1Record && s2Record ? `+${Math.round((s2Record.deep_activation_share - s1Record.deep_activation_share) * 100)}pp` : undefined,
      deltaPositive: s1Record && s2Record ? s2Record.deep_activation_share > s1Record.deep_activation_share : undefined,
    },
    {
      label: 'Economic Relief Spend',
      s1: s1Record ? fmt(s1Record.economic_relief_spend) : '—',
      s2: s2Record ? fmt(s2Record.economic_relief_spend) : '—',
    },
    {
      label: 'Economic Relief Share',
      s1: s1Record ? pct(s1Record.economic_relief_share) : '—',
      s2: s2Record ? pct(s2Record.economic_relief_share) : '—',
      delta: s1Record && s2Record ? `${Math.round((s2Record.economic_relief_share - s1Record.economic_relief_share) * 100)}pp` : undefined,
      deltaPositive: s1Record && s2Record ? s2Record.economic_relief_share < s1Record.economic_relief_share : undefined,
    },
    {
      label: 'Activation Debt',
      s1: s1Record ? fmt(s1Record.activation_debt_eur) : '—',
      s2: s2Record ? fmt(s2Record.activation_debt_eur) : '—',
      delta: s1Record && s2Record ? fmt(s2Record.activation_debt_eur - s1Record.activation_debt_eur) : undefined,
      deltaPositive: s1Record && s2Record ? s2Record.activation_debt_eur < s1Record.activation_debt_eur : undefined,
    },
    {
      label: 'Reallocation Opportunity',
      s1: s1Record ? fmt(s1Record.reallocation_opportunity_eur) : '—',
      s2: s2Record ? fmt(s2Record.reallocation_opportunity_eur) : '—',
    },
    {
      label: 'Costo per Impact Unit',
      s1: s1Record ? `€${s1Record.cost_per_impact_unit.toFixed(1)} / IU` : '—',
      s2: s2Record ? `€${s2Record.cost_per_impact_unit.toFixed(1)} / IU` : '—',
      delta: s1Record && s2Record ? `${(s2Record.cost_per_impact_unit - s1Record.cost_per_impact_unit).toFixed(1)}` : undefined,
      deltaPositive: s1Record && s2Record ? s2Record.cost_per_impact_unit < s1Record.cost_per_impact_unit : undefined,
      note: 'Efficienza complessiva dell\'attivazione verificata — scende = miglioramento',
    },
    {
      label: 'Costo per Lavoratore Profondamente Attivato',
      s1: s1Record ? fmt(s1Record.cost_per_deep_activated_worker) : '—',
      s2: s2Record ? fmt(s2Record.cost_per_deep_activated_worker) : '—',
      delta: s1Record && s2Record ? fmt(s2Record.cost_per_deep_activated_worker - s1Record.cost_per_deep_activated_worker) : undefined,
      deltaPositive: false,
      note: 'Aumenta perché S2 estende accesso a iniziative più strutturate — leggere con cost per IU',
    },
    {
      label: 'Equity of Spend',
      s1: s1Record ? pct(s1Record.equity_of_spend) : '—',
      s2: s2Record ? pct(s2Record.equity_of_spend) : '—',
      deltaPositive: s1Record && s2Record ? s2Record.equity_of_spend > s1Record.equity_of_spend : undefined,
    },
    {
      label: 'Pillar Investment Balance',
      s1: s1Record ? pct(s1Record.pillar_investment_balance) : '—',
      s2: s2Record ? pct(s2Record.pillar_investment_balance) : '—',
      deltaPositive: s1Record && s2Record ? s2Record.pillar_investment_balance > s1Record.pillar_investment_balance : undefined,
    },
  ];

  return (
    <div className="space-y-5">

      {/* ── C-bis. BTI Executive Intelligence ── */}
      {activeIntelligence && (
        <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">C-bis — BTI Executive Intelligence</p>
            <p className="text-xs text-[rgba(6,3,43,0.40)] mt-1 italic">
              Lettura rule-based · aggregata · nessun LLM · nessun dato individuale
            </p>
          </div>

          {/* Executive Narrative */}
          <div className="rounded-lg border border-[rgba(199,111,61,0.18)] bg-[rgba(199,111,61,0.04)] px-4 py-3">
            <p className="text-[11px] font-semibold text-[rgba(6,3,43,0.62)] mb-1.5">Narrative</p>
            <p className="text-[12px] text-[rgba(6,3,43,0.78)] leading-relaxed">{activeIntelligence.executiveNarrative}</p>
          </div>

          {/* Cost per IU first-class */}
          <div className="flex gap-3 items-start">
            <div className="flex-1 rounded-lg border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.02)] px-3 py-2.5 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold text-[rgba(6,3,43,0.62)]">Cost per Impact Unit™</p>
                <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${
                  activeIntelligence.costPerIUConfidence === 'alta'
                    ? 'bg-[rgba(47,125,85,0.10)] text-[rgba(47,125,85,0.90)]'
                    : activeIntelligence.costPerIUConfidence === 'media'
                      ? 'bg-[rgba(138,90,0,0.10)] text-[rgba(138,90,0,0.90)]'
                      : 'bg-[rgba(158,59,47,0.10)] text-[rgba(158,59,47,0.85)]'
                }`}>
                  efficienza {activeIntelligence.costPerIUConfidence}
                </span>
              </div>
              <p className="text-[11px] text-[rgba(6,3,43,0.52)] leading-relaxed">{activeIntelligence.costPerIUNote}</p>
            </div>
          </div>

          {/* Reallocation WHY traces */}
          {activeIntelligence.reallocationAnalysis.reasons.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[rgba(6,3,43,0.62)]">
                Reallocation Opportunity™ — traccia WHY (€{activeIntelligence.reallocationAnalysis.totalOpportunity.toLocaleString('it-IT')})
              </p>
              {activeIntelligence.reallocationAnalysis.reasons.map((r, i) => (
                <div key={i} className={`flex gap-2 items-start rounded px-3 py-2 text-[11px] ${
                  r.contribution === 'primary'
                    ? 'border border-[rgba(199,111,61,0.20)] bg-[rgba(199,111,61,0.04)]'
                    : 'border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.02)]'
                }`}>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                    r.contribution === 'primary'
                      ? 'bg-[rgba(199,111,61,0.16)] text-[rgba(199,111,61,0.90)]'
                      : 'bg-[rgba(6,3,43,0.07)] text-[rgba(6,3,43,0.45)]'
                  }`}>
                    {r.contribution === 'primary' ? 'primario' : 'secondario'}
                  </span>
                  <div>
                    <p className="font-semibold text-[rgba(6,3,43,0.78)]">{r.driver}</p>
                    <p className="text-[rgba(6,3,43,0.52)] leading-relaxed mt-0.5">{r.evidence}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pillar Investment Balance classification */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold text-[rgba(6,3,43,0.62)]">Pillar Investment Balance</p>
              <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${
                activeIntelligence.pillarInvestmentBalanceSignal === 'bilanciato'
                  ? 'bg-[rgba(47,125,85,0.10)] text-[rgba(47,125,85,0.90)]'
                  : activeIntelligence.pillarInvestmentBalanceSignal === 'moderato'
                    ? 'bg-[rgba(138,90,0,0.10)] text-[rgba(138,90,0,0.90)]'
                    : 'bg-[rgba(158,59,47,0.10)] text-[rgba(158,59,47,0.85)]'
              }`}>
                {activeIntelligence.pillarInvestmentBalanceSignal}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {activeIntelligence.pillarClassifications.map((pc) => {
                const sc = STATUS_STYLES[pc.status];
                return (
                  <div key={pc.pillar} className="rounded border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.02)] px-2 py-2 text-center">
                    <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.62)] mb-1">{pc.label.split(' ')[0]}</p>
                    <p className="font-mono font-bold text-[13px] text-[rgba(6,3,43,0.78)] mb-1">
                      {Math.round(pc.budgetShare * 100)}%
                    </p>
                    <p className="text-[9px] font-semibold" style={{ color: sc.color }}>{sc.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[10px] text-[rgba(6,3,43,0.40)] leading-relaxed border-t border-[rgba(6,3,43,0.05)] pt-3 italic">
            Intelligence rule-based da BTIIntelligenceService · nessun LLM · nessun dato individuale · segnale direzionale, non garantito · correlazione ≠ causalità
          </p>
        </div>
      )}

      {/* ── D. Budget-to-Human-Impact Summary ── */}
      <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">D — Budget-to-Human-Impact Summary</p>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-1 italic">
            Budget allocated ≠ Budget activated · Budget spent ≠ Human impact · Economic relief ≠ human activation
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[rgba(6,3,43,0.05)]">
                <th className="py-2 text-left text-xs font-semibold text-[rgba(6,3,43,0.40)] w-64">Metrica</th>
                <th className="py-2 text-right text-xs font-semibold text-[rgba(6,3,43,0.40)]">S1</th>
                <th className="py-2 text-right text-xs font-semibold text-[rgba(6,3,43,0.40)]">S2</th>
                <th className="py-2 text-right text-xs font-semibold text-[rgba(6,3,43,0.40)]">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(6,3,43,0.05)]50">
              {budgetRows.map((row) => (
                <tr key={row.label} className="hover:bg-[rgba(6,3,43,0.03)] transition-colors group">
                  <td className="py-2.5 pr-4">
                    <p className="text-xs font-medium text-[rgba(6,3,43,0.78)]">{row.label}</p>
                    {row.note && (
                      <p className="text-[10px] text-[rgba(6,3,43,0.40)] leading-relaxed mt-0.5">{row.note}</p>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono text-xs text-[rgba(6,3,43,0.62)]">{row.s1}</td>
                  <td className={`py-2.5 text-right font-mono text-xs font-semibold ${activeScenario === 'S2' ? 'text-[rgba(6,3,43,0.90)]' : 'text-[rgba(6,3,43,0.62)]'}`}>
                    {row.s2}
                  </td>
                  <td className="py-2.5 text-right">
                    {row.delta != null ? (
                      <span className={`font-mono text-[11px] font-bold ${row.deltaPositive ? 'text-[rgba(47,125,85,0.90)]' : row.deltaPositive === false ? 'text-[rgba(6,3,43,0.52)]' : 'text-[rgba(6,3,43,0.40)]'}`}>
                        {row.delta}
                      </span>
                    ) : <span className="text-[rgba(6,3,43,0.16)]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cost per deep worker callout */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-[11px] text-blue-700 leading-relaxed">
          <span className="font-semibold">Nota interpretativa: </span>
          Il costo per lavoratore profondamente attivato aumenta perché S2 estende l&apos;accesso a iniziative più strutturate e
          raggiunge una platea più ampia. In parallelo, il costo per Impact Unit scende da{' '}
          {s1Record ? `€${s1Record.cost_per_impact_unit.toFixed(1)}` : '—'} a{' '}
          {s2Record ? `€${s2Record.cost_per_impact_unit.toFixed(1)}` : '—'},
          segnalando una migliore efficienza complessiva dell&apos;attivazione.
        </div>

        {/* Activation debt descriptions */}
        {activeRecord && (
          <div className="space-y-3">
            <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-[rgba(6,3,43,0.62)]">Activation Debt — descrizione</p>
              <p className="text-[11px] text-[rgba(6,3,43,0.52)] leading-relaxed">{activeRecord.activation_debt_description_it}</p>
            </div>
            <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-[rgba(6,3,43,0.62)]">Reallocation Opportunity — descrizione</p>
              <p className="text-[11px] text-[rgba(6,3,43,0.52)] leading-relaxed">{activeRecord.reallocation_opportunity_description_it}</p>
            </div>
          </div>
        )}

        <p className="text-[10px] text-[rgba(6,3,43,0.40)] leading-relaxed border-t border-[rgba(6,3,43,0.05)] pt-3">
          Vista informativa — {activeRecord?.disclaimer ?? 'KORA non gestisce fondi, non esegue pagamenti, non fornisce consulenza fiscale. Correlazione ≠ causalità.'}
        </p>
      </div>

      {/* ── E. Macroblock Breakdown ── */}
      <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">E — Macroblock Breakdown — S1 vs S2</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[rgba(6,3,43,0.05)]">
                <th className="py-2 text-left text-xs font-semibold text-[rgba(6,3,43,0.40)]">Macroblock</th>
                <th className="py-2 text-right text-xs font-semibold text-[rgba(6,3,43,0.40)]">Peso</th>
                <th className="py-2 text-right text-xs font-semibold text-[rgba(6,3,43,0.40)]">S1</th>
                <th className="py-2 text-right text-xs font-semibold text-[rgba(6,3,43,0.40)]">S2</th>
                <th className="py-2 text-right text-xs font-semibold text-[rgba(6,3,43,0.40)]">Δ</th>
                <th className="py-2 text-left pl-4 text-xs font-semibold text-[rgba(6,3,43,0.40)]">Driver / Segnale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(6,3,43,0.05)]50">
              {s1Macroblocks.map((mb) => {
                const s2mb = s2Macroblocks.find((m) => m.code === mb.code);
                const delta = s2mb ? s2mb.score - mb.score : null;
                const accent = MB_ACCENT[mb.code] ?? 'text-[rgba(6,3,43,0.78)]';
                const activeMb = activeScenario === 'S2' ? s2mb : mb;
                return (
                  <tr key={mb.code} className="hover:bg-[rgba(6,3,43,0.03)] transition-colors">
                    <td className="py-3 pr-3">
                      <span className={`font-semibold text-sm ${accent}`}>{mb.label}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-mono text-xs text-[rgba(6,3,43,0.52)]">{Math.round(mb.weight * 100)}%</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-mono font-bold text-[rgba(6,3,43,0.78)]">{mb.score}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className={`font-mono font-bold ${activeScenario === 'S2' ? 'text-[#06032B]' : 'text-[rgba(6,3,43,0.78)]'}`}>
                        {s2mb?.score ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {delta !== null ? (
                        <span className={`font-mono text-xs font-bold ${delta > 0 ? 'text-[rgba(47,125,85,0.90)]' : delta < 0 ? 'text-[rgba(158,59,47,0.90)]' : 'text-[rgba(6,3,43,0.40)]'}`}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      ) : <span className="text-[rgba(6,3,43,0.28)]">—</span>}
                    </td>
                    <td className="py-3 pl-4 text-[11px] text-[rgba(6,3,43,0.52)] max-w-xs">
                      {activeMb?.main_driver && (
                        <span>{activeMb.main_driver}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Risk/opportunity from active macroblocks */}
        {(activeScenario === 'S2' ? s2Macroblocks : s1Macroblocks).filter(mb => mb.risk_opportunity).length > 0 && (
          <div className="space-y-2">
            {(activeScenario === 'S2' ? s2Macroblocks : s1Macroblocks)
              .filter(mb => mb.risk_opportunity)
              .map(mb => (
                <div key={mb.code} className="flex gap-2 text-[11px] text-[rgba(6,3,43,0.52)]">
                  <span className={`font-bold shrink-0 ${MB_ACCENT[mb.code] ?? 'text-[rgba(6,3,43,0.62)]'}`}>{mb.label}:</span>
                  <span className="leading-relaxed">{mb.risk_opportunity}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
