'use client';

import Link from 'next/link';
import { useRole, useScenario } from '@/lib/demo-state';
import { financialGovernanceService } from '@/services/financial-governance/FinancialGovernanceService';
import { cn } from '@/lib/utils';
import { PILLAR_LABELS } from '@/lib/constants/kora';
import type { PillarCode } from '@/lib/types';

// ─── Pillar styling ───────────────────────────────────────────────────────────

const PILLAR_BAR: Record<string, string> = {
  LIFE:       'bg-green-500',
  GROWTH:     'bg-blue-500',
  CONNECTION: 'bg-purple-500',
  IMPACT:     'bg-orange-500',
  LEGACY:     'bg-amber-500',
};

const PILLAR_TEXT: Record<string, string> = {
  LIFE:       'text-green-700',
  GROWTH:     'text-blue-700',
  CONNECTION: 'text-purple-700',
  IMPACT:     'text-orange-700',
  LEGACY:     'text-amber-700',
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

// ─── Budget-to-Impact Bridge — synthetic aggregate demo constants ─────────────
// All values are purely synthetic demo data. Not ROI certified, not causal, not individual.

const BTI_HERO = {
  budget_observed:        420_000,
  impact_units_generated: 18_400,
  cost_per_iu:            22.8,
  activation_debt_eur:    84_000,
};

type DebtLevel = 'basso' | 'medio' | 'alto';

interface PillarBtiRow {
  pillar: string;
  budget: number;
  share: number;
  iu: number;
  cost_per_iu: number;
  debt: DebtLevel;
  recommendation: string;
}

const PILLAR_BTI: PillarBtiRow[] = [
  { pillar: 'LIFE',       budget: 110_000, share: 0.26, iu: 3_200, cost_per_iu: 34, debt: 'alto',  recommendation: 'Espandere accesso alle sedi con bassa partecipazione — copertura attuale 22%' },
  { pillar: 'GROWTH',     budget:  95_000, share: 0.23, iu: 4_600, cost_per_iu: 20, debt: 'medio', recommendation: 'Programmi ricorrenti per il bottom 50% — indicatore direzionale CO / continuità — non causale' },
  { pillar: 'CONNECTION', budget:  70_000, share: 0.17, iu: 2_100, cost_per_iu: 33, debt: 'alto',  recommendation: 'Attivare Partner Network CONNECTION — copertura cross-reparto insufficiente' },
  { pillar: 'IMPACT',     budget:  85_000, share: 0.20, iu: 5_800, cost_per_iu: 15, debt: 'basso', recommendation: 'Pillar più efficiente — mantenere e ampliare il perimetro attuale' },
  { pillar: 'LEGACY',     budget:  60_000, share: 0.14, iu: 2_700, cost_per_iu: 22, debt: 'medio', recommendation: 'Attivare mentoring LEGACY — copertura attuale 12%, potenziale PB e CO' },
];

const DEBT_BADGE: Record<DebtLevel, { style: string; label: string }> = {
  basso: { style: 'bg-green-50 text-green-700 border-green-200', label: 'Debt basso' },
  medio: { style: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Debt medio' },
  alto:  { style: 'bg-red-50 text-red-700 border-red-200',       label: 'Debt alto'  },
};

// ─── HR KPI Correlation — synthetic aggregate demo constants ─────────────────

type ConfidenceLevel = 'alta' | 'media' | 'bassa';

interface HrKpiRow {
  kpi: string;
  direction: 'up' | 'down';
  change: string;
  period: string;
  confidence: ConfidenceLevel;
  interpretation: string;
}

const HR_KPI_DATA: HrKpiRow[] = [
  {
    kpi: 'Assenteismo',
    direction: 'down',
    change: '-4,2%',
    period: 'vs periodo precedente',
    confidence: 'media',
    interpretation: 'Segnale direzionale osservato in correlazione con incremento attivazione LIFE. Correlazione ≠ causalità.',
  },
  {
    kpi: 'Turnover volontario',
    direction: 'down',
    change: '-2,1%',
    period: 'vs periodo precedente',
    confidence: 'bassa',
    interpretation: 'Segnale da monitorare. Associato a miglioramento CO (Continuity) — lettura aggregata, non causalità.',
  },
  {
    kpi: 'Retention 12 mesi',
    direction: 'up',
    change: '+3,8%',
    period: 'vs periodo precedente',
    confidence: 'media',
    interpretation: 'Correlazione direzionale positiva con programmi GROWTH ricorrenti e engagement continuativo.',
  },
  {
    kpi: 'Engagement survey',
    direction: 'up',
    change: '+6 punti',
    period: 'vs anno precedente',
    confidence: 'alta',
    interpretation: 'Segnale più robusto — associato a programmi con alta VR e partecipazione distribuita su più pillar.',
  },
  {
    kpi: 'Partecipazione formazione',
    direction: 'up',
    change: '+18%',
    period: 'vs anno precedente',
    confidence: 'alta',
    interpretation: 'Trend osservato su GROWTH e LEGACY. Correlazione con iniziative verificate e ricorrenti.',
  },
  {
    kpi: 'Distribuzione attivazione bottom 50%',
    direction: 'up',
    change: '+7 punti',
    period: 'vs periodo precedente',
    confidence: 'media',
    interpretation: 'Miglioramento EQ (Equity) — attivazione meno concentrata, segnale positivo sulla distribuzione workforce.',
  },
  {
    kpi: 'Diversity participation gap',
    direction: 'down',
    change: '-5 punti',
    period: 'vs anno precedente',
    confidence: 'bassa',
    interpretation: 'Segnale preliminare su EQ — da monitorare con più periodi di dati per validazione.',
  },
];

const CONFIDENCE_BADGE: Record<ConfidenceLevel, { style: string }> = {
  alta:  { style: 'bg-green-50 text-green-700 border-green-200' },
  media: { style: 'bg-amber-50 text-amber-700 border-amber-200' },
  bassa: { style: 'bg-slate-100 text-slate-500 border-slate-200' },
};

// ─── Correlation matrix ───────────────────────────────────────────────────────

type CorrStrength = 'forte' | 'moderata' | 'debole' | 'monitorare';

const CORR_ROWS = [
  'KORA Index',
  'Activation Debt ↓',
  'LIFE activation',
  'GROWTH activation',
  'CONNECTION activation',
  'Continuity (CO)',
  'Equity (EQ)',
] as const;

const CORR_COLS = ['Assenteismo', 'Turnover', 'Retention', 'Engagement', 'Formazione'] as const;

const CORR_MATRIX: CorrStrength[][] = [
  ['moderata',  'moderata',  'moderata',  'forte',     'moderata'],
  ['moderata',  'debole',    'debole',    'moderata',  'debole'],
  ['forte',     'moderata',  'moderata',  'forte',     'debole'],
  ['debole',    'moderata',  'forte',     'forte',     'forte'],
  ['debole',    'debole',    'moderata',  'forte',     'debole'],
  ['moderata',  'forte',     'forte',     'forte',     'moderata'],
  ['moderata',  'debole',    'moderata',  'moderata',  'moderata'],
];

const CORR_CELL: Record<CorrStrength, { symbol: string; style: string; tip: string }> = {
  forte:      { symbol: '●●', style: 'text-green-600 font-bold',  tip: 'Associazione forte' },
  moderata:   { symbol: '●',  style: 'text-teal-600 font-medium', tip: 'Associazione moderata' },
  debole:     { symbol: '○',  style: 'text-slate-300',            tip: 'Segnale debole' },
  monitorare: { symbol: '△',  style: 'text-amber-500 font-bold',  tip: 'Da monitorare' },
};

// ─── Directional scenarios ────────────────────────────────────────────────────

const SCENARIOS_BTI = [
  {
    id: 'current',
    label: 'Scenario attuale',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    description: 'KORA Index stabile, Activation Debt alto, concentrazione elevata.',
    interpretation: 'Il programma genera valore, ma coinvolge una parte limitata della workforce. Il top 10% genera il 61% degli IU — Activation Debt prioritario.',
  },
  {
    id: 'rebalance',
    label: 'Scenario ribilanciamento',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    description: '+15% budget LIFE / CONNECTION verso sedi sotto target.',
    interpretation: 'Potenziale aumento AR/MAR e riduzione silent majority. Segnale atteso: miglioramento EQ e AR. Correlazione direzionale, non garantita.',
  },
  {
    id: 'continuity',
    label: 'Scenario continuità',
    badge: 'bg-green-100 text-green-700 border-green-200',
    description: 'Introduzione iniziative ricorrenti GROWTH e mentoring LEGACY.',
    interpretation: 'Potenziale miglioramento CO, PB e continuità — segnale direzionale, non causale. Costo per IU atteso in riduzione con programmi ricorrenti consolidati.',
  },
] as const;

// ─── Investment recommendations ──────────────────────────────────────────────

type Priority = 'Alta' | 'Media';
type Risk = 'Alto' | 'Medio' | 'Basso';

interface InvestmentRec {
  priority: Priority;
  action: string;
  budget_note: string;
  expected_signal: string;
  risk: Risk;
}

const INVESTMENT_RECS: InvestmentRec[] = [
  {
    priority: 'Alta',
    action: 'Ribilanciare budget LIFE su sedi a basso accesso',
    budget_note: '+€25.000 demo',
    expected_signal: 'Potenziale miglioramento AR / MAR',
    risk: 'Medio',
  },
  {
    priority: 'Alta',
    action: 'Ridurre concentrazione su top 10% con iniziative accessibili',
    budget_note: 'Riallocazione, non extra budget',
    expected_signal: 'Segnale atteso: riduzione Activation Debt',
    risk: 'Basso',
  },
  {
    priority: 'Media',
    action: 'Ampliare GROWTH ricorrente per il bottom 50%',
    budget_note: '+€18.000 demo',
    expected_signal: 'Segnale direzionale: miglioramento CO / continuità — non causale',
    risk: 'Medio',
  },
  {
    priority: 'Media',
    action: 'Attivare Partner Network su CONNECTION',
    budget_note: '+€12.000 demo',
    expected_signal: 'Segnale atteso: miglioramento PB / cross-pillar spread',
    risk: 'Basso',
  },
];

const PRIORITY_BADGE: Record<Priority, string> = {
  Alta:  'bg-red-50 text-red-700 border-red-200',
  Media: 'bg-amber-50 text-amber-700 border-amber-200',
};

const RISK_BADGE: Record<Risk, string> = {
  Alto:  'bg-red-50 text-red-700 border-red-200',
  Medio: 'bg-amber-50 text-amber-700 border-amber-200',
  Basso: 'bg-green-50 text-green-700 border-green-200',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

// C-08: Financial Governance + Budget-to-Impact Bridge
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
          <h1 className="text-xl font-bold text-slate-900">Financial Governance & Budget-to-Impact Bridge</h1>
          <p className="text-sm text-slate-500">Meridiana Group S.r.l.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm font-semibold text-slate-600">Accesso Limitato</p>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            {result.reason ?? 'I dati di governance finanziaria sono riservati ai ruoli Finance, HR e Admin.'}
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
        <h1 className="text-xl font-bold text-slate-900">Financial Governance & Budget-to-Impact Bridge</h1>
        <p className="text-sm text-slate-400">Nessun dato di governance finanziaria disponibile per questo scenario.</p>
      </div>
    );
  }

  const utilizationColor =
    rec.budget_utilization_rate >= 0.70 ? 'text-green-600' :
    rec.budget_utilization_rate >= 0.50 ? 'text-yellow-600' : 'text-red-500';

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Financial Governance & Budget-to-Impact Bridge</h1>
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

      {/* ── Mandatory disclaimer — non-suppressible ── */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-700">Solo Informativo</p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">{rec.disclaimer}</p>
      </div>

      {/* ── Budget summary ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BudgetCard label="Budget Allocato"   value={eur(rec.budget_allocated_total)}  sub={rec.currency} />
        <BudgetCard label="Budget Utilizzato"  value={eur(rec.budget_used_total)}       sub={`${(rec.budget_utilization_rate * 100).toFixed(0)}% utilizzo`} color={utilizationColor} />
        <BudgetCard label="Impegnato"          value={eur(rec.budget_committed_total)}  sub="in attesa di conferma" />
        <BudgetCard label="Residuo"            value={eur(rec.budget_residual)}         sub="non allocato o inutilizzato" />
      </div>

      {/* ── Utilization bar ── */}
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

      {/* ── Pillar budget breakdown ── */}
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
                  <div className={cn('h-1.5 rounded-full', barColor)} style={{ width: `${usedPct}%` }} />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-slate-400 pt-1">
            Le cifre di budget sono solo informative. Non alimentano il calcolo del KORA Index.
          </p>
        </div>
      </div>

      {/* ── KORA billing ── */}
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

      {/* ── Narrative context ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-600 mb-1">Contesto</p>
        <p className="text-xs text-slate-600 leading-relaxed">{rec.narrative}</p>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          BUDGET-TO-IMPACT BRIDGE
          ════════════════════════════════════════════════════════════════════════ */}
      <div className="border-t-2 border-slate-200 pt-6 space-y-6">

        {/* ── Section header ── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-slate-900">Budget-to-Impact Bridge</h2>
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-500">
              Dati sintetici demo
            </span>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            Collega budget people, welfare e formazione all&apos;attivazione verificata,
            alle Impact Units e alle priorità di investimento.
          </p>
          <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 leading-relaxed max-w-2xl">
            <span className="font-semibold">Nota metodologica obbligatoria: </span>
            KORA non garantisce ROI e non dimostra causalità. Questa vista mostra una lettura
            direzionale su dati aggregati e sintetici demo.
          </div>
        </div>

        {/* ── BTI Executive Hero — 4 cards ── */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Executive CFO / CHRO — vista di sintesi
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-400">Budget osservato</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{eur(BTI_HERO.budget_observed)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Budget people / welfare / training osservato</p>
              <p className="text-[10px] text-slate-300 mt-1 italic">Perimetro sintetico demo: welfare, formazione, iniziative people/ESG.</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-500">Impact Units generate</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">{BTI_HERO.impact_units_generated.toLocaleString('it-IT')} IU</p>
              <p className="text-xs text-blue-500 mt-0.5">da azioni approvate e normalizzate</p>
              <p className="text-[10px] text-blue-300 mt-1 italic">IU aggregate periodo. Non stima individuale.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-400">Costo medio per IU</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">€{BTI_HERO.cost_per_iu.toFixed(1)}</p>
              <p className="text-xs text-slate-400 mt-0.5">per Impact Unit</p>
              <p className="text-[10px] text-slate-300 mt-1 italic">Indicatore direzionale. Non ROI certificato.</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs text-red-500">Activation Debt stimato</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{eur(BTI_HERO.activation_debt_eur)}</p>
              <p className="text-xs text-red-400 mt-0.5">potenziale non attivato</p>
              <p className="text-[10px] text-red-300 mt-1 italic">Valore non attivato per concentrazione o discontinuità.</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 italic">
            Valori sintetici demo. Non rappresentano ROI certificato, risparmio garantito o causalità.
          </p>
        </div>

        {/* ── Budget allocation by pillar ── */}
        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Allocazione budget per pillar</h3>
          <p className="text-xs text-slate-400 mb-3">
            Il costo per IU è un indicatore comparativo interno. Non è un valore monetario del lavoratore e non misura performance individuale.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Pillar</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500">Budget</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500">%</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500">IU generate</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500">€/IU</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-slate-500">Debt</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Raccomandazione</th>
                </tr>
              </thead>
              <tbody>
                {PILLAR_BTI.map((row) => {
                  const label = PILLAR_LABELS[row.pillar as PillarCode] ?? row.pillar;
                  const debt = DEBT_BADGE[row.debt];
                  return (
                    <tr key={row.pillar} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <span className={cn('font-mono font-semibold', PILLAR_TEXT[row.pillar] ?? 'text-slate-700')}>
                          {label}
                        </span>
                        <div className="mt-1 h-1 w-24 rounded-full bg-slate-100">
                          <div
                            className={cn('h-1 rounded-full', PILLAR_BAR[row.pillar] ?? 'bg-slate-400')}
                            style={{ width: `${row.share * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-700">{eur(row.budget)}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-500">{(row.share * 100).toFixed(0)}%</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-700">{row.iu.toLocaleString('it-IT')}</td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-slate-700">€{row.cost_per_iu}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', debt.style)}>
                          {debt.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 leading-snug max-w-xs">{row.recommendation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Dati sintetici demo · synthetic_demo_data: true · Valori budget non alimentano il KORA Index
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            HR KPI CORRELATION PREVIEW
            ════════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-700">People KPI Correlation — preview</h3>
            <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
              Dati sintetici demo
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Lettura aggregata tra attivazione KORA e KPI HR. <span className="font-semibold text-amber-600">Correlazione ≠ causalità.</span> Nessuna performance individuale.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">KPI People</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500">Variazione osservata</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-slate-500">Confidenza</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Interpretazione direzionale</th>
                </tr>
              </thead>
              <tbody>
                {HR_KPI_DATA.map((row) => {
                  const conf = CONFIDENCE_BADGE[row.confidence];
                  const dirStyle = row.direction === 'up'
                    ? 'text-green-600 font-semibold'
                    : 'text-red-600 font-semibold';
                  const dirArrow = row.direction === 'up' ? '↑' : '↓';
                  return (
                    <tr key={row.kpi} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-3 font-medium text-slate-700">{row.kpi}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={dirStyle}>{dirArrow} {row.change}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{row.period}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', conf.style)}>
                          {row.confidence}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 leading-snug max-w-xs">{row.interpretation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 rounded border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 leading-relaxed">
            <span className="font-semibold">Nota metodologica: </span>
            Le variazioni KPI sono osservate su dati sintetici aggregati. KORA non afferma causalità, non garantisce retention, non prevede performance individuale. La lettura è direzionale — da confrontare con dati HR interni e analisi indipendente.
          </div>
        </div>

        {/* ── Correlation matrix ── */}
        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Matrice di correlazione direzionale</h3>
          <p className="text-xs text-slate-400 mb-3">
            La matrice usa dati sintetici aggregati. Serve a orientare domande e priorità, non a dimostrare causalità.
            Per Activation Debt la correlazione è letta in direzione inversa — riduzione del Debt si associa a segnali KPI positivi.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">Segnale KORA</th>
                  {CORR_COLS.map((col) => (
                    <th key={col} className="px-3 py-2.5 text-center font-semibold text-slate-500 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CORR_ROWS.map((row, ri) => (
                  <tr key={row} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap">{row}</td>
                    {CORR_MATRIX[ri].map((strength, ci) => {
                      const cell = CORR_CELL[strength];
                      return (
                        <td key={ci} className="px-3 py-2.5 text-center" title={cell.tip}>
                          <span className={cell.style}>{cell.symbol}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 px-3 py-2 flex flex-wrap gap-4 text-[10px] text-slate-400">
              <span><span className="font-bold text-green-600">●●</span> Associazione forte</span>
              <span><span className="font-medium text-teal-600">●</span> Associazione moderata</span>
              <span><span className="text-slate-300">○</span> Segnale debole</span>
              <span>Correlazione ≠ causalità · Dati sintetici</span>
            </div>
          </div>
        </div>

        {/* ── Scenario interpretation ── */}
        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Scenario direzionale</h3>
          <p className="text-xs text-slate-400 mb-3">
            Gli scenari sono simulazioni demo. Non rappresentano previsioni garantite.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {SCENARIOS_BTI.map((sc) => (
              <div key={sc.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700">{sc.label}</p>
                  <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0', sc.badge)}>
                    {sc.id === 'current' ? 'Attuale' : 'Direzionale'}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600 italic">{sc.description}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{sc.interpretation}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400 italic">
            Scenari direzionali su dati sintetici. Non sono previsioni garantite né impegni di risultato.
          </p>
        </div>

        {/* ── Investment recommendations ── */}
        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Raccomandazioni di investimento</h3>
          <p className="text-xs text-slate-400 mb-3">
            Indicazioni direzionali basate su Activation Debt, distribuzione pillar e segnali KPI aggregati.
            Tutti i valori budget sono scenari demo.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2.5 text-center font-semibold text-slate-500">Priorità</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Azione raccomandata</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500">Budget indicativo</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Segnale atteso</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-slate-500">Rischio</th>
                </tr>
              </thead>
              <tbody>
                {INVESTMENT_RECS.map((rec, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-3 text-center">
                      <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold', PRIORITY_BADGE[rec.priority])}>
                        {rec.priority}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-700">{rec.action}</td>
                    <td className="px-3 py-3 text-right font-mono text-slate-500">{rec.budget_note}</td>
                    <td className="px-3 py-3 text-slate-500 leading-snug">{rec.expected_signal}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', RISK_BADGE[rec.risk])}>
                        {rec.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Wording obbligatorio: &quot;potenziale&quot;, &quot;segnale atteso&quot;, &quot;scenario&quot;, &quot;da monitorare&quot; — nessuna garanzia di risultato.
          </p>
        </div>

        {/* ── Board Pack CTA ── */}
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-indigo-800">Porta questa lettura nel Board Pack</p>
              <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">
                Il Budget-to-Impact Bridge può alimentare il CFO Budget View e il People Activation Report.
                Costo per IU, Activation Debt direzionale, correlazione ≠ causalità, nessun ROI garantito.
              </p>
            </div>
            <Link
              href="/company/reports"
              className="shrink-0 rounded border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              Vai a Report & Board Pack →
            </Link>
          </div>
        </div>

        {/* ── Mandatory synthetic data and limitations block ── */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Dati sintetici — Limitazioni obbligatorie
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Dati sintetici demo. Questa vista non dimostra causalità, non garantisce ROI, non misura performance
            individuale e non sostituisce analisi HR, legale, fiscale o ESG. Serve a supportare decisioni
            direzionali su dati aggregati.
          </p>
          <ul className="space-y-0.5 pt-1">
            {[
              'Nessun PIB individuale — tutti i valori sono aggregati sopra soglia privacy (≥10 lavoratori).',
              'Correlazione ≠ causalità — le variazioni KPI osservate non sono attribuibili a KORA.',
              'KORA non garantisce ROI, riduzione assenteismo, retention o engagement.',
              'Budget figures informative only — non alimentano il KORA Index e non rappresentano fiscal compliance.',
              'EQ = Equity (equità distributiva dell\'attivazione) — non Evidence Quality.',
              'synthetic_demo_data: true · KORA Methodology v0.1 · pre_empirical_calibration',
            ].map((note) => (
              <li key={note} className="flex gap-1.5 text-[11px] text-slate-400">
                <span className="shrink-0 mt-0.5">·</span>
                {note}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
