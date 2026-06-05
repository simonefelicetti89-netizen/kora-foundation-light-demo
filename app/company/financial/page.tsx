'use client';
// C-06: Financial Governance — risponde a 'dove va il budget e quanto diventa attivazione profonda?'.
// Scopo: connettere spesa welfare, attivazione verificata, Activation Debt™ e Reallocation Opportunity™.
// La metrica chiave: BTI™. Il board ottiene risposta sul ROI direzionale — mai causale.

import Link from 'next/link';
import { useRole, useScenario } from '@/lib/demo-state';
import { useScoringResult } from '@/lib/scoring-result';
import { useCompanySession } from '../_providers/CompanySessionProvider';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { financialGovernanceService } from '@/services/financial-governance/FinancialGovernanceService';
import { budgetToHumanImpactService } from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { btiIntelligenceService } from '@/services/bti-intelligence/BTIIntelligenceService';
import type { PillarInvestmentStatus } from '@/services/bti-intelligence/BTIIntelligenceService';
import { LIFE_SUBCATEGORY_META } from '@/services/life-diversity/LifeDiversityService';
import type { ConcentrationStatus, LifePrivacyWarningLevel } from '@/services/life-diversity/LifeDiversityService';
import { PILLAR_LABELS, BTI_DOCTRINE } from '@/lib/constants/kora';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { Explainer } from '@/components/ui/Explainer';
import { PageMasthead } from '@/components/ui/PageMasthead';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { ProvenanceFooter } from '@/components/company/cockpit/ProvenanceFooter';
import { ExplainabilityHint } from '@/components/company/cockpit/ExplainabilityHint';
import { MethodologyBadge } from '@/components/ui/MethodologyBadge';
import { KPICard } from '@/components/ui/KPICard';
import { TM } from '@/components/ui/TM';
import { DecisionContext } from '@/components/ui/DecisionContext';
import type { PillarCode } from '@/lib/types';

// ─── Formatters ───────────────────────────────────────────────────────────────

function eur(val: number) {
  return `€${val.toLocaleString('it-IT')}`;
}

function pct(val: number, decimals = 0) {
  return `${(val * 100).toFixed(decimals)}%`;
}

// ─── Pillar ink ramp — no rainbow ─────────────────────────────────────────────

const PILLAR_RANK_FILL = [
  TOKENS.accent,                // 1° (leader) — viola accento
  'rgba(6,3,43,0.65)',
  'rgba(6,3,43,0.50)',
  'rgba(6,3,43,0.35)',
  'rgba(6,3,43,0.22)',
];

function pillarFill(rank: number): string {
  return PILLAR_RANK_FILL[rank] ?? 'rgba(6,3,43,0.18)';
}

// ─── Debt/Priority/Risk → KORA semantic tokens ────────────────────────────────

type DebtLevel     = 'basso' | 'medio' | 'alto';
type Priority      = 'Alta'  | 'Media';
type Risk          = 'Alto'  | 'Medio' | 'Basso';
type ConfidenceLevel = 'alta' | 'media' | 'bassa';

const DEBT_TOKEN: Record<DebtLevel, { bg: string; text: string; dot: string; label: string }> = {
  alto:  { ...TOKENS.safeguard.cap,   label: 'Debt alto'  },
  medio: { ...TOKENS.safeguard.watch, label: 'Debt medio' },
  basso: { ...TOKENS.safeguard.pass,  label: 'Debt basso' },
};

const PRIORITY_TOKEN: Record<Priority, { bg: string; text: string }> = {
  Alta:  { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text   },
  Media: { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text },
};

const RISK_TOKEN: Record<Risk, { bg: string; text: string }> = {
  Alto:  { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text   },
  Medio: { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text },
  Basso: { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text  },
};

const CONFIDENCE_TOKEN: Record<ConfidenceLevel, { bg: string; text: string }> = {
  alta:  { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text  },
  media: { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text },
  bassa: { bg: TOKENS.inkBorder,          text: TOKENS.inkSecondary          },
};

// ─── Per-pillar static metadata (debt + raccomandazione) ─────────────────────
// Debt level e recommendation sono etichette direzionali demo — non calcolate dal service.

const PILLAR_STATIC: Record<string, { debt: DebtLevel; recommendation: string }> = {
  LIFE:       { debt: 'alto',  recommendation: 'Espandere accesso alle sedi con bassa partecipazione — elevata concentrazione di benefit monetari in questo pillar' },
  GROWTH:     { debt: 'medio', recommendation: 'Programmi ricorrenti per il bottom 50% — indicatore direzionale CO / continuità — non causale' },
  CONNECTION: { debt: 'alto',  recommendation: 'Attivare Partner Network CONNECTION — copertura cross-reparto insufficiente' },
  IMPACT:     { debt: 'basso', recommendation: 'Pillar più efficiente — mantenere e ampliare il perimetro attuale' },
  LEGACY:     { debt: 'medio', recommendation: 'Attivare mentoring LEGACY — potenziale PB e CO, budget attuale sotto soglia di segnale' },
};

// ─── HR KPI Data ──────────────────────────────────────────────────────────────

interface HrKpiRow {
  kpi: string; direction: 'up' | 'down';
  change: string; period: string;
  confidence: ConfidenceLevel; interpretation: string;
}

const HR_KPI_DATA: HrKpiRow[] = [
  { kpi: 'Assenteismo',                         direction: 'down', change: '-4,2%',    period: 'vs periodo precedente', confidence: 'media', interpretation: 'Segnale direzionale osservato in correlazione con incremento attivazione LIFE. Correlazione ≠ causalità.' },
  { kpi: 'Turnover volontario',                  direction: 'down', change: '-2,1%',    period: 'vs periodo precedente', confidence: 'bassa', interpretation: 'Segnale da monitorare. Associato a miglioramento CO (Continuity) — lettura aggregata, non causalità.' },
  { kpi: 'Retention 12 mesi',                    direction: 'up',   change: '+3,8%',   period: 'vs periodo precedente', confidence: 'media', interpretation: 'Correlazione direzionale positiva con programmi GROWTH ricorrenti e engagement continuativo.' },
  { kpi: 'Engagement survey',                    direction: 'up',   change: '+6 punti', period: 'vs anno precedente',   confidence: 'alta',  interpretation: 'Segnale più robusto — associato a programmi con alta VR e partecipazione distribuita su più pillar.' },
  { kpi: 'Partecipazione formazione',            direction: 'up',   change: '+18%',    period: 'vs anno precedente',   confidence: 'alta',  interpretation: 'Trend osservato su GROWTH e LEGACY. Correlazione con iniziative verificate e ricorrenti.' },
  { kpi: 'Distribuzione attivazione bottom 50%', direction: 'up',   change: '+7 punti', period: 'vs periodo precedente', confidence: 'media', interpretation: 'Miglioramento EQ (Equity) — attivazione meno concentrata, segnale positivo sulla distribuzione workforce.' },
  { kpi: 'Diversity participation gap',          direction: 'down', change: '-5 punti', period: 'vs anno precedente',   confidence: 'bassa', interpretation: 'Segnale preliminare su EQ — da monitorare con più periodi di dati per validazione.' },
];

// ─── Correlation matrix ───────────────────────────────────────────────────────

type CorrStrength = 'forte' | 'moderata' | 'debole' | 'monitorare';

const CORR_ROWS = ['KORA Index', 'Activation Debt ↓', 'LIFE activation', 'GROWTH activation', 'CONNECTION activation', 'Continuity (CO)', 'Equity (EQ)'] as const;
const CORR_COLS = ['Assenteismo', 'Turnover', 'Retention', 'Engagement', 'Formazione'] as const;

const CORR_MATRIX: CorrStrength[][] = [
  ['moderata', 'moderata', 'moderata', 'forte',    'moderata'],
  ['moderata', 'debole',   'debole',   'moderata', 'debole'  ],
  ['forte',    'moderata', 'moderata', 'forte',    'debole'  ],
  ['debole',   'moderata', 'forte',    'forte',    'forte'   ],
  ['debole',   'debole',   'moderata', 'forte',    'debole'  ],
  ['moderata', 'forte',    'forte',    'forte',    'moderata'],
  ['moderata', 'debole',   'moderata', 'moderata', 'moderata'],
];

const CORR_CELL: Record<CorrStrength, { symbol: string; color: string; tip: string }> = {
  forte:      { symbol: '●●', color: TOKENS.accent,                   tip: 'Associazione forte'    },
  moderata:   { symbol: '●',  color: 'rgba(6,3,43,0.60)',           tip: 'Associazione moderata' },
  debole:     { symbol: '○',  color: 'rgba(6,3,43,0.22)',           tip: 'Segnale debole'        },
  monitorare: { symbol: '△',  color: TOKENS.safeguard.watch.text,     tip: 'Da monitorare'         },
};

// ─── Directional scenarios ────────────────────────────────────────────────────

const SCENARIOS_BTI = [
  { id: 'current',   label: 'Scenario attuale',        isActive: true,  description: 'KORA Index stabile, Activation Debt alto, concentrazione elevata.',                        interpretation: 'Il programma genera valore, ma coinvolge una parte limitata della workforce. Il top 12% genera il 64% degli IU — Activation Debt prioritario.' },
  { id: 'rebalance', label: 'Scenario ribilanciamento', isActive: false, description: '+15% budget LIFE / CONNECTION verso sedi sotto target.',                                   interpretation: 'Potenziale aumento AR/MAR e riduzione silent majority. Segnale atteso: miglioramento EQ e AR. Correlazione direzionale, non garantita.'         },
  { id: 'continuity',label: 'Scenario continuità',      isActive: false, description: 'Introduzione iniziative ricorrenti GROWTH e mentoring LEGACY.',                            interpretation: 'Potenziale miglioramento CO, PB e continuità — segnale direzionale, non causale. Costo per IU atteso in riduzione con programmi ricorrenti consolidati.' },
] as const;

// ─── Investment recommendations ──────────────────────────────────────────────

interface InvestmentRec { priority: Priority; action: string; budget_note: string; expected_signal: string; risk: Risk; }

const INVESTMENT_RECS: InvestmentRec[] = [
  { priority: 'Alta',  action: 'Ribilanciare budget LIFE su sedi a basso accesso',               budget_note: '+€25.000 demo',          expected_signal: 'Potenziale miglioramento AR / MAR',                               risk: 'Medio' },
  { priority: 'Alta',  action: 'Ridurre concentrazione su top 12% con iniziative accessibili',   budget_note: 'Riallocazione, non extra budget',  expected_signal: 'Segnale atteso: riduzione Activation Debt',              risk: 'Basso' },
  { priority: 'Media', action: 'Ampliare GROWTH ricorrente per il bottom 50%',                   budget_note: '+€18.000 demo',          expected_signal: 'Segnale direzionale: miglioramento CO / continuità — non causale', risk: 'Medio' },
  { priority: 'Media', action: 'Attivare Partner Network su CONNECTION',                          budget_note: '+€12.000 demo',          expected_signal: 'Segnale atteso: miglioramento PB / cross-pillar spread',          risk: 'Basso' },
];

// ─── Shared primitive components ─────────────────────────────────────────────

function FinCard({ label, value, sub, note, accent }: {
  label: string; value: string; sub?: string; note?: string; accent?: boolean;
}) {
  return (
    <div
      style={{
        background:   TOKENS.surface,
        border:       accent ? `1px solid ${TOKENS.accent}33` : TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
        padding:      '1.125rem',
      }}
    >
      <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: TOKENS.inkHint }}>
        {label}
      </p>
      <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.625rem', color: accent ? TOKENS.accent : TOKENS.ink, lineHeight: 1, marginTop: 8, marginBottom: 4, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      {sub  && <p style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>{sub}</p>}
      {note && <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 6, fontStyle: 'italic', lineHeight: 1.5 }}>{note}</p>}
    </div>
  );
}

function Pill({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '10px', fontWeight: 500, background: bg, color: text, borderRadius: 4, padding: '2px 7px' }}>
      {label}
    </span>
  );
}

function TableHead({ cols }: { cols: { label: string; align?: 'left' | 'right' | 'center' }[] }) {
  return (
    <thead>
      <tr style={{ borderBottom: `2px solid ${TOKENS.ink}` }}>
        {cols.map((c) => (
          <th
            key={c.label}
            style={{
              padding: '10px 14px',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              color: TOKENS.inkHint,
              textAlign: c.align ?? 'left',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// C-08: Financial Governance + Budget-to-Human-Impact
export default function FinancialGovernance() {
  const { isLive, tenantId: liveId, sessionLoading } = useCompanySession();
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();

  const demoId     = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';
  const COMPANY_ID = isLive ? (liveId ?? demoId) : demoId;
  const tenant     = isLive ? null : tenantService.getTenant(COMPANY_ID);
  const companyName = isLive ? 'La tua organizzazione' : (tenant?.company_name ?? COMPANY_ID);

  // B59: Live scoring result contains BTI macroblock score.
  const { data: liveScoring, loading: liveLoading } = useScoringResult({
    tenantId:         COMPANY_ID,
    scenarioId:       activeScenario,
    forceEnvironment: isLive ? 'live' : undefined,
  });
  const liveBtiScore = isLive
    ? (liveScoring?.koraIndex?.macroblocks?.find((m: { code: string }) => m.code === 'BTI')?.score ?? null)
    : null;

  const result = isLive
    ? { allowed: true, record: null, reason: null }  // live: bypass demo access check
    : financialGovernanceService.getFinancialGovernance(COMPANY_ID, activeScenario, activeRole);

  const btiResult  = isLive
    ? { allowed: true, record: null }
    : budgetToHumanImpactService.getBudgetToHumanImpactByScenario(COMPANY_ID, activeScenario, activeRole);
  const btiRecord  = btiResult.allowed ? btiResult.record : undefined;
  const spendByPillar = btiRecord?.spend_by_pillar   ?? {};
  const deepByPillar  = btiRecord?.deep_activation_by_pillar ?? {};

  // B66: intelligence layer — rule-based, no LLM, aggregate-only
  const btiIntelligence = btiRecord ? btiIntelligenceService.compute(btiRecord, activeRole) : null;

  // B59: Live session early returns
  if ((sessionLoading || liveLoading) && isLive) {
    return <div style={{ padding: 48, textAlign: 'center' }}><p style={{ fontSize: '13px', color: 'rgba(6,3,43,0.40)' }}>Caricamento…</p></div>;
  }
  if (isLive && liveScoring?.status === 'insufficient_data') {
    return (
      <div className="space-y-5">
        <PageMasthead eyebrow="Governance finanziaria" title="Budget-to-Human-Impact™"
          subline="La tua organizzazione · dati live non ancora disponibili" />
        <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink }}>Dati BTI™ non ancora disponibili</p>
          <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, marginTop: 6 }}>
            Completa intake e scoring per visualizzare Budget-to-Human-Impact™ live.
          </p>
        </div>
      </div>
    );
  }

  // ── Access denied state ──────────────────────────────────────────────────────
  if (!result.allowed) {
    return (
      <div className="space-y-5">
        <PageMasthead
          eyebrow="Governance finanziaria"
          title="Governance finanziaria"
          subline="Lettura informativa del rapporto tra budget people, attivazione profonda e opportunità di riallocazione."
        />
        <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink }}>Accesso limitato</p>
          <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, marginTop: 6, maxWidth: 400, margin: '8px auto 0' }}>
            {result.reason ?? 'I dati di governance finanziaria sono riservati ai ruoli Finance, HR e Admin.'}
          </p>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '11px', color: TOKENS.inkHint, marginTop: 12 }}>
            Ruolo attivo: {activeRole}
          </p>
        </div>
      </div>
    );
  }

  const rec = result.record;
  // For live sessions: if demo record unavailable, we continue (liveBtiScore provides BTI data).
  // For demo sessions: show no-data state.
  if (!rec && !isLive) {
    return (
      <div className="space-y-5">
        <PageMasthead
          eyebrow="Governance finanziaria"
          title="Governance finanziaria"
          subline="Lettura informativa del rapporto tra budget people, attivazione profonda e opportunità di riallocazione."
        />
        <p style={{ fontSize: '13px', color: TOKENS.inkHint }}>
          Nessun dato di governance finanziaria disponibile per questo scenario.
        </p>
      </div>
    );
  }

  // For live sessions without a demo record, render the BTI panel only (already shown above)
  // then show a clear "example structure" notice for the demo panels.
  if (isLive && !rec) {
    return (
      <div className="space-y-6">
        {liveBtiScore !== null && (
          <div className="rounded-xl border border-[rgba(47,125,85,0.25)] bg-[rgba(47,125,85,0.06)] px-5 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#2F7D55] uppercase tracking-wide">BTI™ Score live · La tua organizzazione</p>
              <span className="rounded border border-[rgba(47,125,85,0.22)] bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">LIVE</span>
            </div>
            <p className="text-3xl font-bold text-[#06032B]">{Math.round(liveBtiScore)}<span className="text-sm text-[rgba(6,3,43,0.40)] ml-1">/100</span></p>
            <p className="text-[10px] text-[rgba(6,3,43,0.52)]">Budget-to-Human-Impact™ — macroblocco KORA Index (peso 20%). Misura quanto il budget welfare si converte in attivazione profonda.</p>
          </div>
        )}
        <PageMasthead eyebrow="Governance finanziaria · LIVE" title="Budget-to-Human-Impact™ Engine"
          subline={`La tua organizzazione · ${liveScoring?.koraIndex?.reporting_period ?? 'Periodo attivo'}`} />
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-xs text-[rgba(6,3,43,0.52)]">
          Il dettaglio dei sottomacroblocchi BTI™ (Activation Debt, Economic Relief, Compliance Split) richiede la visualizzazione dal pannello Admin.
          Il BTI Score è disponibile nel KORA Index live.
        </div>
      </div>
    );
  }

  // Pillar spend sorted for ink ramp
  const pillarOrder: PillarCode[] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];
  const pillarRanked = [...pillarOrder].sort((a, b) => {
    const ba = (spendByPillar as Record<string, number>)[a] ?? 0;
    const bb = (spendByPillar as Record<string, number>)[b] ?? 0;
    return bb - ba;
  });
  const pillarRankMap: Record<string, number> = {};
  pillarRanked.forEach((p, i) => { pillarRankMap[p] = i; });

  const utilizationAbove70 = rec!.budget_utilization_rate >= 0.70;

  return (
    <div className="space-y-6">

      {/* B59: Live BTI score panel — shown for authenticated company sessions */}
      {isLive && liveBtiScore !== null && (
        <div className="rounded-xl border border-[rgba(47,125,85,0.25)] bg-[rgba(47,125,85,0.06)] px-5 py-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#2F7D55] uppercase tracking-wide">BTI™ Score live · La tua organizzazione</p>
            <span className="rounded border border-[rgba(47,125,85,0.22)] bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">LIVE</span>
          </div>
          <p className="text-3xl font-bold text-[#06032B]">{Math.round(liveBtiScore)}<span className="text-sm text-[rgba(6,3,43,0.40)] ml-1">/100</span></p>
          <p className="text-[10px] text-[rgba(6,3,43,0.52)]">Budget-to-Human-Impact™ — macroblocco KORA Index (peso 20%). Misura quanto il budget welfare si converte in attivazione profonda.</p>
          <p className="text-[10px] text-[rgba(47,125,85,0.70)] italic">I pannelli di dettaglio sotto mostrano la struttura con dati demo di esempio.</p>
        </div>
      )}

      {/* ── 1. PageMasthead ────────────────────────────────────────────────── */}
      <PageMasthead
        eyebrow={`Governance Finanziaria · ${isLive ? 'LIVE' : activeScenario} · ${rec?.reporting_period ?? (isLive ? 'Periodo attivo' : activeScenario)}`}
        title={<><TM>Budget-to-Human-Impact</TM> Engine</>}
        subline="Rapporto tra budget people, attivazione profonda e opportunità di riallocazione. Non certificativo, non causale."
        meta={`${companyName} · Foundation Light Preview · ${isLive ? 'dati live' : 'dati sintetici demo'}`}
      />
      <DecisionContext
        question="Come si converte il budget welfare in attivazione profonda e dove si accumula Activation Debt™?"
        boundary="Solo dati sintetici Meridiana Group · nessun dato individuale · Foundation Light v0.1"
      />

      {/* ── 1b. KPI decision strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          code="BTI™"
          label="Budget-to-Human-Impact"
          value={rec!.bti_indicators?.bti_score ?? '—'}
          period="Punteggio macroblocco"
          status={!rec!.bti_indicators ? 'neutral' : rec!.bti_indicators.bti_score >= 70 ? 'positive' : rec!.bti_indicators.bti_score >= 50 ? 'warning' : 'critical'}
          important
          size="md"
        />
        <KPICard
          code="€ TOTALE"
          label="Welfare spend"
          value={eur(rec!.budget_allocated_total)}
          period={rec!.currency}
          size="md"
        />
        <KPICard
          code="DA%"
          label="Deep Activation Share™"
          value={rec!.bti_indicators ? pct(rec!.bti_indicators.deep_activation_share) : '—'}
          period="Del budget totale"
          status={!rec!.bti_indicators ? 'neutral' : rec!.bti_indicators.deep_activation_share >= 0.5 ? 'positive' : rec!.bti_indicators.deep_activation_share >= 0.3 ? 'warning' : 'critical'}
          important
          size="md"
        />
        <KPICard
          code="€/IU"
          label="Costo per Impact Unit™"
          value={`€${rec!.cost_per_iu_indicator.toFixed(0)}`}
          period="Per IU generata"
          size="md"
        />
      </div>

      {/* ── Explainer KPI strip — BTI™, DA%, costo per IU ─ */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <Explainer
          what="BTI™ misura quanto efficacemente il budget welfare si converte in attivazione profonda (Impact Units reali)."
          how="0–100. <50 = alta quota in economic relief o compliance; >70 = budget ben orientato all'attivazione."
          compact
        />
        <Explainer
          what="Deep Activation Share™: quota del budget che va a programmi che generano Impact Units verificate."
          how=">50% = target solido. <30% = urgenza di riallocazione verso attivazione profonda."
          compact
        />
        <Explainer
          what="Costo per Impact Unit™: euro spesi per ogni unità di attivazione verificata generata."
          how="Più basso = maggiore efficienza. Non è un KPI isolato: leggere insieme ad AR e BTI™."
          compact
        />
      </div>

      {/* ── 2. Executive Reading Block ─────────────────────────────────────── */}
      <div
        style={{
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          padding:      '1.25rem 1.5rem',
        }}
      >
        <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '13px', color: TOKENS.ink, marginBottom: 8 }}>
          Lettura di governance — non certificativa
        </p>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.7, maxWidth: '72ch' }}>
          La spesa people mostra margini di riallocazione verso programmi a maggiore profondità di attivazione.
          KORA distingue benefit monetari, attivazione profonda e debito di attivazione stimato,
          senza produrre rendicontazione certificativa.
          Questa pagina è uno strumento di lettura direzionale a supporto di decisioni interne —
          non sostituisce analisi fiscale, legale o ESG obbligatoria.
        </p>
        <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 10, lineHeight: 1.6 }}>
          {rec!.disclaimer}
        </p>
      </div>

      {/* ── 3. Financial Intelligence Row ──────────────────────────────────── */}
      <SectionLabel>Quadro finanziario — {activeScenario}</SectionLabel>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <FinCard
          label="Budget allocato"
          value={eur(rec!.budget_allocated_total)}
          sub={rec!.currency}
          note="Budget allocato ≠ Budget attivato"
        />
        <FinCard
          label="Budget utilizzato"
          value={eur(rec!.budget_used_total)}
          sub={`${(rec!.budget_utilization_rate * 100).toFixed(0)}% utilizzo`}
          accent={utilizationAbove70}
        />
        <FinCard
          label="Impegnato"
          value={eur(rec!.budget_committed_total)}
          sub="in attesa di conferma"
        />
        <FinCard
          label="Residuo"
          value={eur(rec!.budget_residual)}
          sub="non convertito in attivazione"
          note="Componente dell'Activation Debt"
        />
        <FinCard
          label="Costo per IU"
          value={`€${rec!.cost_per_iu_indicator}`}
          sub="per IU verificata"
          note="Solo attivazioni budget-mediated"
        />
        <FinCard
          label="Quota benefit monetari"
          value={btiRecord ? pct(btiRecord.economic_relief_share) : '—'}
          sub="spesa che non genera IU"
          note="Non è spesa sbagliata — può diventare più intelligente"
        />
      </div>

      {/* ── 4. Barra utilizzo + narrative ──────────────────────────────────── */}
      <SectionLabel>Utilizzo e composizione del budget</SectionLabel>
      <ChartFrame>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Barra utilizzo */}
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink }}>Utilizzo budget</p>
              <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '18px', color: utilizationAbove70 ? TOKENS.accent : TOKENS.safeguard.watch.text, fontVariantNumeric: 'tabular-nums' }}>
                {(rec!.budget_utilization_rate * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 9999, background: TOKENS.inkTrack, overflow: 'hidden' }}>
              <div style={{ height: 8, borderRadius: 9999, width: `${rec!.budget_utilization_rate * 100}%`, background: utilizationAbove70 ? TOKENS.accent : TOKENS.safeguard.watch.dot }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span style={{ fontSize: '11px', color: TOKENS.inkHint }}>{eur(rec!.budget_used_total)} utilizzati</span>
              <span style={{ fontSize: '11px', color: TOKENS.inkHint }}>{eur(rec!.budget_allocated_total)} allocati</span>
            </div>
            <div className="mt-3" style={{ borderTop: TOKENS.cardBorder, paddingTop: 12 }}>
              <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, fontVariantNumeric: 'tabular-nums' }}>
                Costo per IU (informativo): <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, color: TOKENS.ink }}>€{rec!.cost_per_iu_indicator}</span>
              </p>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 4, lineHeight: 1.55 }}>{rec!.cost_per_iu_note}</p>
            </div>
          </div>

          {/* Narrative */}
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink, marginBottom: 8 }}>Contesto periodo</p>
            <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.7 }}>{rec!.narrative}</p>
          </div>
        </div>
      </ChartFrame>

      {/* ── 5. Natura dei dati — boundary ─────────────────────────────────── */}
      <SectionLabel>Natura dei dati — misurato · stimato · informativo · non certificato</SectionLabel>
      <div
        style={{
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          overflow:     'hidden',
        }}
      >
        <table className="w-full">
          <TableHead cols={[
            { label: 'Categoria' },
            { label: 'Cosa include' },
            { label: 'Natura' },
            { label: 'Perimetro' },
          ]} />
          <tbody>
            {[
              { cat: 'Misurato',        include: 'AR, MAR, VR, CO, WB, PC, PB, EQ, KORA Index, BTI score',   nature: 'Calcolato dal motore KORA su dati verificati',   perimetro: 'Aggregato aziendale · ≥10 lavoratori per segmento' },
              { cat: 'Stimato',         include: 'Activation Debt €, Costo per IU, Reallocation Opportunity', nature: 'Direzionale · stima da modello sintetico demo',   perimetro: 'Indicativo — non garantito' },
              { cat: 'Informativo',     include: 'Budget allocato, correlazioni KPI People, scenari',          nature: 'Lettura aggregata su dati sintetici',             perimetro: 'Non alimenta il KORA Index · non causale' },
              { cat: 'Non certificato', include: 'ROI, retention, engagement, compliance ESG/fiscale',         nature: 'Fuori perimetro KORA Foundation Light',           perimetro: 'Richiede analisi indipendente e consulenza specialistica' },
            ].map((row, i) => (
              <tr key={row.cat} style={{ background: i % 2 === 0 ? TOKENS.surface : 'rgba(6,3,43,0.02)', borderBottom: TOKENS.cardBorder }}>
                <td style={{ padding: '11px 14px', fontSize: '12px', fontWeight: 600, color: TOKENS.ink, whiteSpace: 'nowrap' }}>{row.cat}</td>
                <td style={{ padding: '11px 14px', fontSize: '11px', color: TOKENS.inkSecondary }}>{row.include}</td>
                <td style={{ padding: '11px 14px', fontSize: '11px', color: TOKENS.inkSecondary }}>{row.nature}</td>
                <td style={{ padding: '11px 14px', fontSize: '11px', color: TOKENS.inkHint }}>{row.perimetro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 6. Budget-to-Human-Impact ──────────────────────────────────────── */}
      <SectionLabel>Budget-to-Human-Impact</SectionLabel>

      {/* BTI doctrine + boundary */}
      <div
        style={{
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          padding:      '1.25rem',
        }}
      >
        <p style={{ fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, color: "var(--kora-ink)", fontSize: '1.0625rem', letterSpacing: '-0.01em', marginBottom: 12 }}>
          Dal budget all&apos;attivazione profonda
        </p>
        <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.7, maxWidth: '80ch', marginBottom: 16 }}>
          KORA collega la spesa people e welfare all&apos;attivazione verificata, alle Impact Units
          e alle priorità di riallocazione.
          Il motore BTI non misura ROI e non dimostra causalità — fornisce una lettura
          direzionale aggregata a supporto di decisioni interne.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" style={{ marginBottom: 16 }}>
          {[
            { key: BTI_DOCTRINE.budget_neq_activation },
            { key: BTI_DOCTRINE.spend_neq_impact },
            { key: BTI_DOCTRINE.relief_neq_activation },
            { key: BTI_DOCTRINE.limited_reframe },
          ].map(({ key }) => (
            <div key={key} style={{ background: 'rgba(199,111,61,0.04)', border: '1px solid rgba(199,111,61,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: '11px', color: TOKENS.ink, lineHeight: 1.55, fontStyle: 'italic' }}>
              {key}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4" style={{ paddingTop: 12, borderTop: TOKENS.cardBorder }}>
          <span style={{ fontSize: '11px', color: TOKENS.inkHint, fontStyle: 'italic' }}>{BTI_DOCTRINE.policy_neq_partner}</span>
          <span style={{ fontSize: '11px', color: TOKENS.inkHint, fontStyle: 'italic' }}>{BTI_DOCTRINE.structural_recognizable}</span>
        </div>
        <div style={{ marginTop: 12, padding: '10px 12px', background: TOKENS.inkBorder, borderRadius: 8, fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600, color: TOKENS.ink }}>Nota metodologica: </span>
          Gli indicatori BTI mostrati qui alimentano il motore BTI — non entrano direttamente nel calcolo del KORA Index come componenti separati.
          Il punteggio BTI (macroblocco al 20%) è calcolato dal motore BTI,
          non dai valori dei componenti analitici AR, MAR, NI, VR, CO, WB, PC, PB, EQ.
        </div>
      </div>

      {/* BTI Executive Hero — 4 KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <FinCard
          label="Budget people / welfare"
          value={btiRecord ? eur(btiRecord.total_people_welfare_budget) : '—'}
          sub="welfare, formazione, iniziative people"
          note="Budget allocated ≠ Budget activated"
        />
        <FinCard
          label="Quota benefit monetari"
          value={btiRecord ? pct(btiRecord.economic_relief_share) : '—'}
          sub="spesa che non genera Impact Units"
          note="Non è spesa sbagliata — può diventare più intelligente"
        />
        <FinCard
          label="Costo per Impact Unit™"
          value={btiRecord ? `€${btiRecord.cost_per_impact_unit.toFixed(1)}` : '—'}
          sub="per IU verificata · solo budget-mediated"
          note={btiIntelligence
            ? `Efficienza: ${btiIntelligence.costPerIUConfidence} · ${btiIntelligence.costPerIUConfidence === 'alta' ? 'ottimizzata' : btiIntelligence.costPerIUConfidence === 'media' ? 'margine di miglioramento' : 'priorità di riallocazione'}`
            : 'Indicatore direzionale — non ROI certificato'}
          accent={btiIntelligence?.costPerIUConfidence === 'alta'}
        />
        <FinCard
          label="Activation Debt™"
          value={btiRecord ? eur(btiRecord.activation_debt_eur) : '—'}
          sub="budget non convertito in attivazione"
          note="Stima direzionale — non garantito"
        />
      </div>

      {/* ── B66: Executive Narrative ──────────────────────────────────────── */}
      {btiIntelligence && (
        <div
          style={{
            background:   TOKENS.surface,
            border:       `1px solid ${TOKENS.accent}22`,
            borderRadius: TOKENS.cardRadius,
            padding:      '1.25rem 1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: TOKENS.ink }}>
              Lettura executive — Budget-to-Human-Impact™
            </p>
            <span style={{
              fontSize: '10px', fontWeight: 500, fontFamily: 'var(--font-jakarta)',
              background: TOKENS.inkBorder, color: TOKENS.inkSecondary,
              borderRadius: 4, padding: '2px 7px',
            }}>
              regola · non AI
            </span>
          </div>
          <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.75, maxWidth: '80ch' }}>
            {btiIntelligence.executiveNarrative}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 10, borderTop: TOKENS.cardBorder }}>
            <span style={{ fontSize: '11px', color: TOKENS.inkHint }}>
              Pillar Investment Balance:
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-jakarta)',
              background: btiIntelligence.pillarInvestmentBalanceSignal === 'bilanciato'
                ? TOKENS.safeguard.pass.bg
                : btiIntelligence.pillarInvestmentBalanceSignal === 'moderato'
                  ? TOKENS.safeguard.watch.bg
                  : TOKENS.safeguard.cap.bg,
              color: btiIntelligence.pillarInvestmentBalanceSignal === 'bilanciato'
                ? TOKENS.safeguard.pass.text
                : btiIntelligence.pillarInvestmentBalanceSignal === 'moderato'
                  ? TOKENS.safeguard.watch.text
                  : TOKENS.safeguard.cap.text,
              borderRadius: 4, padding: '2px 8px',
            }}>
              {btiIntelligence.pillarInvestmentBalanceSignal}
            </span>
            <span style={{ fontSize: '11px', color: TOKENS.inkHint }}>
              ({btiRecord ? Math.round(btiRecord.pillar_investment_balance * 100) : '—'}
              /100) · segnale direzionale
            </span>
          </div>
        </div>
      )}

      {/* Activation Debt description + non-budget-mediated note */}
      {btiRecord?.activation_debt_description_it && (
        <div
          style={{
            background:   TOKENS.surface,
            border:       TOKENS.cardBorder,
            borderRadius: TOKENS.cardRadius,
            padding:      '1rem 1.25rem',
            fontSize:     '12px',
            color:        TOKENS.inkSecondary,
            lineHeight:   1.7,
          }}
        >
          <span style={{ fontWeight: 600, color: TOKENS.ink }}>Activation Debt — dettaglio: </span>
          {btiRecord.activation_debt_description_it}
        </div>
      )}

      {/* ── B66: Reallocation WHY Trace ────────────────────────────────────── */}
      {btiIntelligence && btiIntelligence.reallocationAnalysis.reasons.length > 0 && (
        <div
          style={{
            background:   TOKENS.surface,
            border:       TOKENS.cardBorder,
            borderRadius: TOKENS.cardRadius,
            padding:      '1.125rem 1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: TOKENS.ink }}>
              Reallocation Opportunity™ — perché
            </p>
            <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: TOKENS.accent, fontVariantNumeric: 'tabular-nums' }}>
              €{btiIntelligence.reallocationAnalysis.totalOpportunity.toLocaleString('it-IT')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {btiIntelligence.reallocationAnalysis.reasons.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  background: r.contribution === 'primary' ? 'rgba(199,111,61,0.04)' : 'rgba(6,3,43,0.02)',
                  border: r.contribution === 'primary' ? '1px solid rgba(199,111,61,0.14)' : TOKENS.cardBorder,
                  borderRadius: 8, padding: '10px 12px',
                }}
              >
                <span style={{
                  flexShrink: 0, marginTop: 1,
                  fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-jakarta)',
                  background: r.contribution === 'primary' ? `${TOKENS.accent}18` : TOKENS.inkBorder,
                  color: r.contribution === 'primary' ? TOKENS.accent : TOKENS.inkSecondary,
                  borderRadius: 4, padding: '2px 7px',
                }}>
                  {r.contribution === 'primary' ? 'primario' : 'secondario'}
                </span>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink, marginBottom: 2 }}>{r.driver}</p>
                  <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>{r.evidence}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 10, lineHeight: 1.6, fontStyle: 'italic' }}>
            Reallocation Opportunity™ è una stima direzionale — non una garanzia di risultato. KORA non gestisce fondi. Correlazione ≠ causalità.
          </p>
        </div>
      )}

      {btiRecord?.non_budget_mediated_activation_note && (
        <div
          style={{
            background:   'rgba(199,111,61,0.05)',
            border:       '1px solid rgba(199,111,61,0.14)',
            borderRadius: TOKENS.cardRadius,
            padding:      '1rem 1.25rem',
            fontSize:     '12px',
            color:        TOKENS.ink,
            lineHeight:   1.7,
          }}
        >
          <span style={{ fontWeight: 600, color: TOKENS.accent }}>IU non-budget-mediated: </span>
          {btiRecord.non_budget_mediated_activation_note}
        </div>
      )}
      <p style={{ fontSize: '11px', color: TOKENS.inkHint, fontStyle: 'italic' }}>
        Dati BTI service — scenario {activeScenario}. Non rappresentano ROI certificato, risparmio garantito o causalità.
      </p>

      {/* ── 7. Suddivisione budget per pillar ─────────────────────────────── */}
      <SectionLabel>Suddivisione budget per pillar</SectionLabel>

      {/* Barre pillar — ink ramp */}
      <ChartFrame subtitle="Budget e attivazione profonda da BTI service · Debt e raccomandazioni: etichette direzionali demo · synthetic_demo_data: true">
        <div className="space-y-3">
          {pillarOrder.map((pillar) => {
            const budget = (spendByPillar as Record<string, number>)[pillar] ?? 0;
            const total  = btiRecord?.total_people_welfare_budget ?? 0;
            const share  = total > 0 ? budget / total : 0;
            const rank   = pillarRankMap[pillar] ?? 4;
            const label  = PILLAR_LABELS[pillar as PillarCode] ?? pillar;
            return (
              <div key={pillar}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink }}>
                    {label}
                    <span style={{ fontSize: '11px', fontWeight: 400, color: TOKENS.inkHint, marginLeft: 6 }}>{pillar}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: rank === 0 ? TOKENS.accent : TOKENS.ink, fontVariantNumeric: 'tabular-nums' }}>
                    {budget > 0 ? eur(budget) : '—'}
                    <span style={{ fontWeight: 400, color: TOKENS.inkHint, marginLeft: 6 }}>
                      {budget > 0 ? `(${(share * 100).toFixed(0)}%)` : ''}
                    </span>
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 9999, background: TOKENS.inkTrack, overflow: 'hidden' }}>
                  <div style={{ height: 6, borderRadius: 9999, width: `${share * 100}%`, background: pillarFill(rank) }} />
                </div>
              </div>
            );
          })}
        </div>
      </ChartFrame>

      {/* Pillar table — budget/deep/debt/raccomandazione */}
      <div
        style={{
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          overflow:     'hidden',
        }}
      >
        <table className="w-full">
          <TableHead cols={[
            { label: 'Pillar' },
            { label: 'Budget spend', align: 'right' },
            { label: '%', align: 'right' },
            { label: 'Attivazione profonda', align: 'right' },
            { label: 'Debt', align: 'center' },
            { label: 'Raccomandazione direzionale' },
          ]} />
          <tbody>
            {pillarOrder.map((pillar, i) => {
              const budget = (spendByPillar as Record<string, number>)[pillar] ?? 0;
              const deep   = (deepByPillar  as Record<string, number>)[pillar] ?? 0;
              const total  = btiRecord?.total_people_welfare_budget ?? 0;
              const share  = total > 0 ? budget / total : 0;
              const label  = PILLAR_LABELS[pillar as PillarCode] ?? pillar;
              const rank   = pillarRankMap[pillar] ?? 4;
              const staticData = PILLAR_STATIC[pillar];
              const dt = DEBT_TOKEN[staticData?.debt ?? 'medio'];
              return (
                <tr key={pillar} style={{ background: i % 2 === 0 ? TOKENS.surface : 'rgba(6,3,43,0.02)', borderBottom: TOKENS.cardBorder }}>
                  <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 4, height: 28, borderRadius: 2, background: pillarFill(rank), flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink }}>{label}</p>
                        <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>{pillar}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'top', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', color: TOKENS.ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {budget > 0 ? eur(budget) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'top', fontFamily: 'var(--font-jakarta)', fontSize: '12px', color: TOKENS.inkSecondary, fontVariantNumeric: 'tabular-nums' }}>
                    {budget > 0 ? `${(share * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'top', fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '12px', color: TOKENS.ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {deep > 0 ? eur(deep) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'top' }}>
                    <Pill label={dt.label} bg={dt.bg} text={dt.text} />
                  </td>
                  <td style={{ padding: '12px 14px', verticalAlign: 'top', fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
                    {staticData?.recommendation ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ padding: '10px 14px', fontSize: '11px', color: TOKENS.inkHint, borderTop: TOKENS.cardBorder }}>
          Le cifre di budget sono solo informative. Non alimentano il calcolo del KORA Index.
          {rec!.pillar_budget_note && <span style={{ marginLeft: 8 }}>{rec!.pillar_budget_note}</span>}
        </p>
      </div>

      {/* ── B66: Pillar Investment Balance classification ───────────────────── */}
      {btiIntelligence && (
        <div
          style={{
            background:   TOKENS.surface,
            border:       TOKENS.cardBorder,
            borderRadius: TOKENS.cardRadius,
            overflow:     'hidden',
          }}
        >
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: TOKENS.cardBorder, display: 'flex', alignItems: 'center', gap: 10 }}>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: TOKENS.ink }}>
              Pillar Investment Balance — classificazione
            </p>
            <span style={{
              fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-jakarta)',
              background: btiIntelligence.pillarInvestmentBalanceSignal === 'bilanciato'
                ? TOKENS.safeguard.pass.bg
                : btiIntelligence.pillarInvestmentBalanceSignal === 'moderato'
                  ? TOKENS.safeguard.watch.bg
                  : TOKENS.safeguard.cap.bg,
              color: btiIntelligence.pillarInvestmentBalanceSignal === 'bilanciato'
                ? TOKENS.safeguard.pass.text
                : btiIntelligence.pillarInvestmentBalanceSignal === 'moderato'
                  ? TOKENS.safeguard.watch.text
                  : TOKENS.safeguard.cap.text,
              borderRadius: 4, padding: '2px 8px',
            }}>
              {btiIntelligence.pillarInvestmentBalanceSignal}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0 }}>
            {btiIntelligence.pillarClassifications.map((pc, i) => {
              const statusColor: Record<PillarInvestmentStatus, { bg: string; text: string; label: string }> = {
                over_concentrated: { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text,   label: 'sovra-concentrato' },
                balanced:          { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text,  label: 'bilanciato'        },
                under_invested:    { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text, label: 'sotto-investito'   },
              };
              const sc = statusColor[pc.status];
              return (
                <div
                  key={pc.pillar}
                  style={{
                    padding: '12px 14px',
                    borderRight: i < 4 ? TOKENS.cardBorder : 'none',
                    background: i % 2 === 0 ? TOKENS.surface : 'rgba(6,3,43,0.015)',
                  }}
                >
                  <p style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.ink, marginBottom: 4 }}>{pc.label}</p>
                  <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '15px', color: TOKENS.ink, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(pc.budgetShare * 100)}%
                  </p>
                  <span style={{
                    display: 'inline-block', marginBottom: 6,
                    fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-jakarta)',
                    background: sc.bg, color: sc.text, borderRadius: 4, padding: '2px 7px',
                  }}>
                    {sc.label}
                  </span>
                  <p style={{ fontSize: '10px', color: TOKENS.inkHint, lineHeight: 1.5 }}>{pc.reason}</p>
                  {pc.deepActivationConversionRate > 0 && (
                    <p style={{ fontSize: '10px', color: TOKENS.inkSecondary, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                      Conversione: {Math.round(pc.deepActivationConversionRate * 100)}%
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ padding: '10px 14px', fontSize: '10px', color: TOKENS.inkHint, borderTop: TOKENS.cardBorder, fontStyle: 'italic' }}>
            Classificazione direzionale da BTIIntelligenceService · regole deterministiche · nessun dato individuale · synthetic_demo_data: true
          </p>
        </div>
      )}

      {/* ── B68-B: LIFE Diversity Intelligence™ ──────────────────────────── */}
      {btiIntelligence?.lifeDiversityProfile && (() => {
        const ld = btiIntelligence.lifeDiversityProfile!;

        const CONCENTRATION_TOKEN: Record<ConcentrationStatus, { label: string; bg: string; text: string }> = {
          diverse:                  { label: 'diversificato',          bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text  },
          moderately_concentrated:  { label: 'moderatamente concentrato', bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text },
          highly_concentrated:      { label: 'altamente concentrato',  bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text   },
          single_category_dominant: { label: 'singola categoria',      bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text   },
          no_life_data:             { label: 'nessun dato LIFE',       bg: TOKENS.inkBorder,          text: TOKENS.inkSecondary          },
        };
        const WARNING_TOKEN: Record<LifePrivacyWarningLevel, { bg: string; text: string; border: string }> = {
          none: { bg: 'transparent', text: TOKENS.inkHint, border: 'transparent' },
          soft: { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text, border: TOKENS.safeguard.watch.bg },
          hard: { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text,   border: TOKENS.safeguard.cap.bg   },
        };
        const ct = CONCENTRATION_TOKEN[ld.concentrationStatus];
        const wt = WARNING_TOKEN[ld.privacyWarningLevel];
        return (
          <div
            style={{
              background:   TOKENS.surface,
              border:       TOKENS.cardBorder,
              borderRadius: TOKENS.cardRadius,
              overflow:     'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: TOKENS.cardBorder, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: TOKENS.ink }}>
                LIFE Diversity Intelligence™
              </p>
              <span style={{ fontSize: '10px', fontWeight: 500, fontFamily: 'var(--font-jakarta)', background: TOKENS.inkBorder, color: TOKENS.inkSecondary, borderRadius: 4, padding: '2px 7px' }}>
                regola · non AI
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-jakarta)', background: ct.bg, color: ct.text, borderRadius: 4, padding: '2px 8px' }}>
                {ct.label}
              </span>
              <span style={{ fontSize: '10px', color: TOKENS.inkHint, marginLeft: 'auto' }}>
                LIFE Diversity Score: <span style={{ fontWeight: 700, fontFamily: 'var(--font-jakarta)', color: TOKENS.ink }}>{Math.round(ld.diversityScore * 100)}%</span> ({ld.activeSubcategories.length}/10 subcategorie)
              </span>
            </div>

            <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Active subcategories */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.inkSecondary, marginBottom: 8 }}>Subcategorie LIFE attive</p>
                {ld.activeSubcategories.length === 0 ? (
                  <p style={{ fontSize: '11px', color: TOKENS.inkHint, fontStyle: 'italic' }}>Nessuna subcategoria rilevata</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ld.activeSubcategories.map((code) => {
                      const meta = LIFE_SUBCATEGORY_META[code];
                      const isDominant = code === ld.dominantSubcategory;
                      return (
                        <span
                          key={code}
                          style={{
                            fontSize: '10px', fontWeight: isDominant ? 700 : 500,
                            background: isDominant ? `${TOKENS.accent}14` : TOKENS.inkBorder,
                            color: isDominant ? TOKENS.accent : TOKENS.inkSecondary,
                            border: isDominant ? `1px solid ${TOKENS.accent}30` : `1px solid transparent`,
                            borderRadius: 4, padding: '2px 8px',
                          }}
                          title={meta.description}
                        >
                          {meta.label}{isDominant ? ' ↑' : ''}
                        </span>
                      );
                    })}
                  </div>
                )}
                {ld.dominantSubcategory && (
                  <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 8 }}>
                    Dominante: {LIFE_SUBCATEGORY_META[ld.dominantSubcategory].label} ({Math.round(ld.dominantSubcategoryShare * 100)}% dei programmi LIFE)
                  </p>
                )}
              </div>

              {/* Recommendations */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.inkSecondary, marginBottom: 8 }}>Raccomandazioni portfolio LIFE</p>
                {ld.recommendations.length === 0 ? (
                  <p style={{ fontSize: '11px', color: TOKENS.inkHint, fontStyle: 'italic' }}>Portfolio LIFE ben diversificato.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ld.recommendations.slice(0, 2).map((rec) => (
                      <div key={rec.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{
                          flexShrink: 0, marginTop: 1,
                          fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-jakarta)',
                          background: rec.priority === 'alta' ? `${TOKENS.accent}18` : TOKENS.inkBorder,
                          color: rec.priority === 'alta' ? TOKENS.accent : TOKENS.inkSecondary,
                          borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase' as const, letterSpacing: '0.04em',
                        }}>
                          {rec.priority}
                        </span>
                        <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>{rec.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Privacy warning */}
            {ld.privacyWarningLevel !== 'none' && ld.privacyWarningMessage && (
              <div style={{ margin: '0 1.25rem 1rem', padding: '8px 12px', borderRadius: 6, background: wt.bg, border: `1px solid ${wt.border}` }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: wt.text, lineHeight: 1.55 }}>
                  ⚠ Privacy — {ld.privacyWarningMessage}
                </p>
              </div>
            )}

            <p style={{ padding: '8px 14px', fontSize: '10px', color: TOKENS.inkHint, borderTop: TOKENS.cardBorder, fontStyle: 'italic' }}>
              LIFE Diversity Intelligence™ · pre_empirical_calibration · non modifica KORA Index™ · not_kora_index_component · synthetic_demo_data: true
            </p>
          </div>
        );
      })()}

      {/* ── 8. People KPI Correlation ──────────────────────────────────────── */}
      <SectionLabel>People KPI — lettura direzionale</SectionLabel>
      <div
        style={{
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          overflow:     'hidden',
        }}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: TOKENS.cardBorder }}>
          <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            Lettura aggregata tra attivazione KORA e KPI HR su dati sintetici.{' '}
            <span style={{ fontWeight: 600, color: TOKENS.safeguard.watch.text }}>Correlazione ≠ causalità.</span>{' '}
            Nessuna performance individuale.
          </p>
        </div>
        <table className="w-full">
          <TableHead cols={[
            { label: 'KPI People' },
            { label: 'Variazione osservata', align: 'right' },
            { label: 'Confidenza', align: 'center' },
            { label: 'Interpretazione direzionale' },
          ]} />
          <tbody>
            {HR_KPI_DATA.map((row, i) => {
              const ct = CONFIDENCE_TOKEN[row.confidence];
              const dirColor = row.direction === 'up' ? TOKENS.safeguard.pass.text : TOKENS.safeguard.cap.text;
              const dirArrow = row.direction === 'up' ? '↑' : '↓';
              return (
                <tr key={row.kpi} style={{ background: i % 2 === 0 ? TOKENS.surface : 'rgba(6,3,43,0.02)', borderBottom: TOKENS.cardBorder }}>
                  <td style={{ padding: '11px 14px', fontSize: '12px', fontWeight: 500, color: TOKENS.ink }}>{row.kpi}</td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: dirColor, fontVariantNumeric: 'tabular-nums' }}>
                      {dirArrow} {row.change}
                    </span>
                    <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 2 }}>{row.period}</p>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'center', verticalAlign: 'top' }}>
                    <Pill label={row.confidence} bg={ct.bg} text={ct.text} />
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>{row.interpretation}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: '10px 14px', borderTop: TOKENS.cardBorder, background: TOKENS.safeguard.watch.bg }}>
          <p style={{ fontSize: '11px', color: TOKENS.safeguard.watch.text, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 600 }}>Nota metodologica: </span>
            Le variazioni KPI sono osservate su dati sintetici aggregati. KORA non afferma causalità, non garantisce retention,
            non prevede performance individuale. La lettura è direzionale — da confrontare con dati HR interni e analisi indipendente.
          </p>
        </div>
      </div>

      {/* ── 9. Correlation matrix ──────────────────────────────────────────── */}
      <SectionLabel>Matrice di correlazione direzionale</SectionLabel>
      <div
        style={{
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          overflow:     'hidden',
        }}
      >
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: TOKENS.cardBorder }}>
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            La matrice usa dati sintetici aggregati. Serve a orientare domande e priorità, non a dimostrare causalità.
            Per Activation Debt la correlazione è letta in direzione inversa — riduzione del Debt si associa a segnali KPI positivi.
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="min-w-full">
            <thead>
              <tr style={{ borderBottom: `2px solid ${TOKENS.ink}` }}>
                <th style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: TOKENS.inkHint, textAlign: 'left', whiteSpace: 'nowrap' }}>
                  Segnale KORA
                </th>
                {CORR_COLS.map((col) => (
                  <th key={col} style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: TOKENS.inkHint, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CORR_ROWS.map((row, ri) => (
                <tr key={row} style={{ background: ri % 2 === 0 ? TOKENS.surface : 'rgba(6,3,43,0.02)', borderBottom: TOKENS.cardBorder }}>
                  <td style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: TOKENS.ink, whiteSpace: 'nowrap' }}>{row}</td>
                  {CORR_MATRIX[ri].map((strength, ci) => {
                    const cell = CORR_CELL[strength];
                    return (
                      <td key={ci} title={cell.tip} style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{ fontWeight: strength === 'forte' ? 700 : 500, color: cell.color, fontSize: '14px' }}>
                          {cell.symbol}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '8px 14px', borderTop: TOKENS.cardBorder, display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {[
              { symbol: '●●', color: TOKENS.accent,             label: 'Associazione forte'    },
              { symbol: '●',  color: 'rgba(6,3,43,0.60)',     label: 'Associazione moderata' },
              { symbol: '○',  color: 'rgba(6,3,43,0.22)',     label: 'Segnale debole'        },
            ].map(({ symbol, color, label }) => (
              <span key={label} style={{ fontSize: '11px', color: TOKENS.inkHint }}>
                <span style={{ fontWeight: 700, color, marginRight: 4 }}>{symbol}</span>{label}
              </span>
            ))}
            <span style={{ fontSize: '11px', color: TOKENS.inkHint }}>Correlazione ≠ causalità · Dati sintetici</span>
          </div>
        </div>
      </div>

      {/* ── 10. Scenario direzionale ────────────────────────────────────────── */}
      <SectionLabel>Scenari direzionali</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-3">
        {SCENARIOS_BTI.map((sc) => (
          <div
            key={sc.id}
            style={{
              background:   TOKENS.surface,
              border:       sc.isActive ? `1px solid ${TOKENS.accent}44` : TOKENS.cardBorder,
              borderRadius: TOKENS.cardRadius,
              padding:      '1.125rem',
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink }}>{sc.label}</p>
              <Pill
                label={sc.isActive ? 'Attuale' : 'Direzionale'}
                bg={sc.isActive ? `${TOKENS.accent}18` : TOKENS.inkBorder}
                text={sc.isActive ? TOKENS.accent : TOKENS.inkSecondary}
              />
            </div>
            <p style={{ fontSize: '12px', color: TOKENS.ink, fontStyle: 'italic', marginBottom: 8 }}>{sc.description}</p>
            <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>{sc.interpretation}</p>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '11px', color: TOKENS.inkHint, fontStyle: 'italic' }}>
        Scenari direzionali su dati sintetici. Non sono previsioni garantite né impegni di risultato.
      </p>

      {/* ── 11. Raccomandazioni di investimento ────────────────────────────── */}
      <SectionLabel>Raccomandazioni di allocazione</SectionLabel>
      <div
        style={{
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          overflow:     'hidden',
        }}
      >
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: TOKENS.cardBorder }}>
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            Indicazioni direzionali basate su Activation Debt, distribuzione pillar e segnali KPI aggregati.
            Tutti i valori budget sono scenari demo.
          </p>
        </div>
        <table className="w-full">
          <TableHead cols={[
            { label: 'Priorità', align: 'center' },
            { label: 'Azione raccomandata' },
            { label: 'Budget indicativo', align: 'right' },
            { label: 'Segnale atteso' },
            { label: 'Rischio', align: 'center' },
          ]} />
          <tbody>
            {INVESTMENT_RECS.map((r, i) => {
              const pt = PRIORITY_TOKEN[r.priority];
              const rt = RISK_TOKEN[r.risk];
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? TOKENS.surface : 'rgba(6,3,43,0.02)', borderBottom: TOKENS.cardBorder }}>
                  <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'top' }}>
                    <Pill label={r.priority} bg={pt.bg} text={pt.text} />
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 500, color: TOKENS.ink, verticalAlign: 'top' }}>{r.action}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '12px', color: TOKENS.inkSecondary, fontVariantNumeric: 'tabular-nums', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    {r.budget_note}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.55, verticalAlign: 'top' }}>{r.expected_signal}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'top' }}>
                    <Pill label={r.risk} bg={rt.bg} text={rt.text} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ padding: '10px 14px', fontSize: '11px', color: TOKENS.inkHint, borderTop: TOKENS.cardBorder }}>
          Wording obbligatorio: «potenziale», «segnale atteso», «scenario», «da monitorare» — nessuna garanzia di risultato.
        </p>
      </div>

      {/* ── 12. Board Pack CTA ─────────────────────────────────────────────── */}
      <div
        style={{
          background:   TOKENS.surface,
          border:       `1px solid ${TOKENS.accent}33`,
          borderRadius: TOKENS.cardRadius,
          padding:      '1.125rem 1.25rem',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          gap:          '1rem',
          flexWrap:     'wrap',
        }}
      >
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink }}>Porta questa lettura nel Board Pack</p>
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 4, lineHeight: 1.6, maxWidth: '60ch' }}>
            Il Budget-to-Human-Impact può alimentare il CFO Budget View e il People Activation Report.
            Costo per IU, Activation Debt direzionale, correlazione ≠ causalità, nessun ROI garantito.
          </p>
        </div>
        <Link
          href="/company/reports"
          style={{
            flexShrink: 0,
            borderRadius: 6,
            border: `1px solid ${TOKENS.accent}55`,
            background: `${TOKENS.accent}0a`,
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 600,
            color: TOKENS.accent,
            textDecoration: 'none',
          }}
        >
          Vai a Report & Board Pack →
        </Link>
      </div>

      {/* ── 13. Perimetro informativo e limitazioni ─────────────────────────── */}
      <SectionLabel>Perimetro informativo e limitazioni</SectionLabel>
      <div
        style={{
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          padding:      '1.25rem',
        }}
      >
        <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink, marginBottom: 10 }}>
          Dati sintetici — limitazioni obbligatorie
        </p>
        <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.7, marginBottom: 12, maxWidth: '80ch' }}>
          Questa vista non dimostra causalità, non garantisce ROI, non misura performance individuale
          e non sostituisce analisi HR, legale, fiscale o ESG. Serve a supportare decisioni direzionali
          su dati aggregati sintetici.
        </p>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'Nessun PIB individuale — tutti i valori sono aggregati sopra soglia privacy (≥10 lavoratori).',
            'Correlazione ≠ causalità — le variazioni KPI osservate non sono attribuibili a KORA.',
            'KORA non garantisce ROI, riduzione assenteismo, retention o engagement.',
            'Budget figures informative only — non alimentano il KORA Index e non rappresentano fiscal compliance.',
            'EQ = Equity (equità distributiva dell\'attivazione) — non Evidence Quality.',
            'synthetic_demo_data: true · KORA Methodology v0.1 · pre_empirical_calibration',
          ].map((note) => (
            <li key={note} style={{ display: 'flex', gap: 8, fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
              <span style={{ flexShrink: 0, marginTop: 2, color: TOKENS.inkHint }}>·</span>
              {note}
            </li>
          ))}
        </ul>
      </div>

      {/* ── 14. ExplainabilityHint ─────────────────────────────────────────── */}
      <ExplainabilityHint />

      {/* ── 15. ProvenanceFooter ───────────────────────────────────────────── */}
      <ProvenanceFooter
        methodologyVersionId="KORA Index v3 / KORA Methodology v0.1"
        calibrationStatus="pre_empirical_calibration"
        reportingPeriod={rec!.reporting_period}
      />

    </div>
  );
}
