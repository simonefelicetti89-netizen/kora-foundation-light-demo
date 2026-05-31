'use client';

import Link from 'next/link';
import { useDemoState } from '@/lib/demo-state';
import { reportGeneratorService } from '@/services/report-generator/ReportGeneratorService';
import { reportFactoryService } from '@/services/report-factory/ReportFactoryService';
import { useScoringResult } from '@/lib/scoring-result';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { DecisionPackHero } from '@/components/reports/DecisionPackHero';
import { EligibilitySummaryReport } from '@/components/reports/EligibilitySummaryReport';
import { BudgetImpactReport } from '@/components/reports/BudgetImpactReport';
import { ActionPlanReport } from '@/components/reports/ActionPlanReport';
import { PrivacyBoundaryNote } from '@/components/reports/PrivacyBoundaryNote';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { ComponentBreakdown } from '@/components/kora-index/ComponentBreakdown';
import { ActivationSafeguardPanel } from '@/components/kora-index/ActivationSafeguardPanel';
import type {
  DecisionPackSection, DecisionPackMetric, DecisionPackInsight,
  DecisionPackRecommendation, DecisionPackStatus, DecisionPackVersion,
  DecisionPackPeriodComparison, DecisionPackMetricDelta, DecisionPackMetricTrend,
} from '@/lib/types';

// ── Section navigation ────────────────────────────────────────────────────────

const SECTION_NAV = [
  { id: 'executive_summary',      label: 'Executive Summary',         description: 'Qual è lo stato attuale dell\'attivazione organizzativa?' },
  { id: 'kora_index_v3',          label: 'KORA Index',                description: 'Perché il punteggio è questo e cosa lo determina?' },
  { id: 'workforce_activation',   label: 'Activation & Workforce',    description: 'Chi si attiva, quanto profondamente e con quale continuità?' },
  { id: 'budget_to_human_impact', label: 'Budget-to-Human-Impact',    description: 'Quanto della spesa si traduce in attivazione verificata?' },
  { id: 'eligibility_gate',       label: 'Eligibility Gate',          description: 'Quali eventi sono eleggibili, limitati o esclusi per design?' },
  { id: 'pillar_analysis',        label: 'Pillar Balance',             description: 'Come si distribuisce l\'attivazione tra i 5 pillar?' },
  { id: 'recommendations',        label: 'Raccomandazioni',            description: 'Quali azioni prioritarie possono migliorare l\'indice?' },
  { id: 'methodology_boundaries', label: 'Metodologia & Confini',     description: 'Cosa KORA misura, cosa esclude, cosa non certifica.' },
];

// ── Status display ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<DecisionPackStatus, string> = {
  draft:                   'Bozza',
  data_review_required:    'Dati in revisione',
  advisor_review_required: 'Revisione advisor',
  ready:                   'Pronto',
  exported:                'Esportato',
  archived:                'Archiviato',
  blocked:                 'Bloccato',
};

const STATUS_STYLES: Record<DecisionPackStatus, string> = {
  data_review_required:    'bg-rose-50 text-rose-700 border-rose-200',
  advisor_review_required: 'bg-amber-50 text-amber-700 border-amber-200',
  ready:                   'bg-kora-fun-green/20 text-kora-cosmic-blue border-kora-fun-green/40',
  draft:                   'bg-slate-50 text-slate-500 border-slate-200',
  exported:                'bg-kora-violet/8 text-kora-violet border-kora-violet/20',
  archived:                'bg-slate-50 text-slate-400 border-slate-200',
  blocked:                 'bg-rose-50 text-rose-600 border-rose-200',
};

const SAFEGUARD_STYLES: Record<string, string> = {
  CLEAR:   'bg-kora-fun-green/20 text-kora-cosmic-blue border-kora-fun-green/40',
  WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
  FLAGGED: 'bg-rose-50 text-rose-700 border-rose-200',
};

// ── Generic content renderers ─────────────────────────────────────────────────

function MetricGrid({ metrics }: { metrics: DecisionPackMetric[] }) {
  if (!metrics.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.code} className="rounded-lg border border-slate-100 bg-white p-3 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{m.label}</p>
          <p className="text-lg font-bold text-slate-900 leading-tight">
            {m.value}{m.unit && <span className="text-xs font-normal text-slate-400 ml-0.5">{m.unit}</span>}
          </p>
          {m.delta !== undefined && (
            <p className={`text-[11px] font-medium ${m.delta >= 0 ? 'text-kora-violet' : 'text-rose-600'}`}>
              {m.delta >= 0 ? '+' : ''}{m.delta} vs S1
            </p>
          )}
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{m.interpretation}</p>
          {m.confidence === 'low' && (
            <span className="inline-block rounded bg-amber-50 border border-amber-100 px-1 py-0.5 text-[10px] text-amber-600">bassa fiducia</span>
          )}
        </div>
      ))}
    </div>
  );
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'border-l-rose-500 bg-rose-50 text-rose-800',
  high:     'border-l-amber-400 bg-amber-50 text-amber-800',
  medium:   'border-l-blue-400 bg-blue-50 text-blue-800',
  low:      'border-l-slate-300 bg-slate-50 text-slate-600',
};

function InsightList({ insights }: { insights: DecisionPackInsight[] }) {
  if (!insights.length) return null;
  return (
    <div className="space-y-2">
      {insights.map((ins) => (
        <div key={ins.id} className={`border-l-4 rounded-r px-3 py-2.5 text-xs leading-relaxed ${SEVERITY_STYLES[ins.severity]}`}>
          <p className="font-semibold mb-0.5">{ins.title}</p>
          <p>{ins.body}</p>
          {ins.limitation && <p className="mt-1 opacity-70 italic">{ins.limitation}</p>}
        </div>
      ))}
    </div>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  alta:  'border-l-rose-400 bg-rose-50',
  media: 'border-l-amber-400 bg-amber-50',
  bassa: 'border-l-slate-300 bg-slate-50',
};
const PRIORITY_TAG: Record<string, string> = {
  alta:  'text-rose-700 bg-rose-100 border-rose-200',
  media: 'text-amber-700 bg-amber-100 border-amber-200',
  bassa: 'text-slate-600 bg-slate-100 border-slate-200',
};

function RecList({ recommendations }: { recommendations: DecisionPackRecommendation[] }) {
  if (!recommendations.length) return null;
  return (
    <div className="space-y-2">
      {recommendations.map((rec) => (
        <div key={rec.id} className={`border-l-4 rounded-r px-3 py-2.5 space-y-1 ${PRIORITY_STYLES[rec.priority]}`}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-slate-800">{rec.title}</p>
            <div className="flex shrink-0 gap-1.5 items-center">
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_TAG[rec.priority]}`}>{rec.priority}</span>
              <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">{rec.horizon}</span>
            </div>
          </div>
          <p className="text-xs text-slate-600">{rec.recommended_action}</p>
          <p className="text-[11px] text-slate-400 italic">{rec.caveat}</p>
        </div>
      ))}
    </div>
  );
}

function SectionBlock({ section, children }: { section: DecisionPackSection; children?: React.ReactNode }) {
  return (
    <div id={section.code} className="scroll-mt-24 space-y-4">
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">{section.code}</span>
          {section.audience.map((a) => (
            <span key={a} className="rounded bg-kora-violet/8 border border-kora-violet/15 px-1.5 py-0.5 text-[10px] text-kora-violet">{a}</span>
          ))}
        </div>
        <h3 className="text-base font-bold text-slate-900">{section.title}</h3>
        {section.subtitle && <p className="text-xs text-slate-500">{section.subtitle}</p>}
      </div>
      {section.summary && <p className="text-sm text-slate-600 leading-relaxed">{section.summary}</p>}
      {children ?? (
        <>
          <MetricGrid metrics={section.metrics} />
          <InsightList insights={section.insights} />
          <RecList recommendations={section.recommendations} />
        </>
      )}
      {section.methodology_notes && (
        <p className="text-[11px] text-slate-400 font-mono border-t border-slate-100 pt-2">{section.methodology_notes}</p>
      )}
    </div>
  );
}

function SectionDivider() {
  return <div className="border-t border-slate-100 pt-6 mt-2" />;
}

// ── Semester comparison ───────────────────────────────────────────────────────

const TREND_CARD: Record<DecisionPackMetricTrend, { bg: string; label: string; icon: string }> = {
  improved:       { bg: 'border-kora-fun-green/40 bg-kora-fun-green/15', label: 'Migliorato',    icon: '↑' },
  stable:         { bg: 'border-slate-200 bg-slate-50',    label: 'Stabile',        icon: '→' },
  declined:       { bg: 'border-rose-200 bg-rose-50',      label: 'In calo',        icon: '↓' },
  not_comparable: { bg: 'border-amber-200 bg-amber-50',    label: 'Non comparabile',icon: '≈' },
  not_available:  { bg: 'border-slate-100 bg-slate-50',    label: 'N/D',            icon: '—' },
};

const TREND_ICON_COLOR: Record<DecisionPackMetricTrend, string> = {
  improved:       'text-kora-violet',
  stable:         'text-slate-400',
  declined:       'text-rose-600',
  not_comparable: 'text-amber-600',
  not_available:  'text-slate-300',
};

function DeltaCard({ delta }: { delta: DecisionPackMetricDelta }) {
  const style = TREND_CARD[delta.trend];
  return (
    <div className={`rounded-lg border px-3 py-2.5 space-y-1 ${style.bg}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{delta.label}</p>
      <div className="flex items-center gap-1.5">
        <span className={`text-base font-bold ${TREND_ICON_COLOR[delta.trend]}`}>{style.icon}</span>
        {delta.current_value !== null && delta.current_value !== undefined && (
          <span className="text-sm font-bold text-slate-800">
            {delta.metric_id === 'confidence_score' ? `${delta.current_value}%` : delta.current_value}
          </span>
        )}
        {delta.delta_abs !== undefined && (
          <span className={`text-[11px] font-semibold ${delta.delta_abs >= 0 ? 'text-kora-violet' : 'text-rose-700'}`}>
            {delta.delta_abs >= 0 ? '+' : ''}{delta.metric_id === 'confidence_score' ? `${delta.delta_abs}pt` : delta.delta_abs.toFixed(1)}
          </span>
        )}
      </div>
      {delta.previous_value !== null && delta.previous_value !== undefined && (
        <p className="text-[10px] text-slate-400">
          Precedente: {delta.metric_id === 'confidence_score' ? `${delta.previous_value}%` : delta.previous_value}
        </p>
      )}
      <p className={`text-[9px] font-semibold ${TREND_ICON_COLOR[delta.trend]}`}>{style.label}</p>
    </div>
  );
}

function PeriodComparisonSection({ comparison }: { comparison: DecisionPackPeriodComparison }) {
  const isAvailable = comparison.comparable_with_previous;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Variazione rispetto al semestre precedente
        </p>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-slate-400">{comparison.reporting_period_label}</span>
          {comparison.previous_period_label && (
            <>
              <span className="text-slate-300">vs</span>
              <span className="text-slate-400">{comparison.previous_period_label}</span>
            </>
          )}
        </div>
      </div>

      {!isAvailable ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-center space-y-1">
          <p className="text-sm font-semibold text-slate-500">Confronto semestrale non ancora disponibile</p>
          <p className="text-xs text-slate-400">{comparison.comparability_notes}</p>
          <p className="text-[10px] text-slate-400 mt-2">
            Il Decision Pack può essere generato ogni semestre. Gli indicatori mostreranno miglioramento, stabilità o decrescita quando i dati saranno comparabili.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Comparability banner */}
          <div className={`rounded-lg border px-3 py-2 text-[10px] space-y-0.5 ${
            comparison.methodology_comparable
              ? 'border-kora-fun-green/40 bg-kora-fun-green/15 text-kora-cosmic-blue'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            <p className="font-semibold">
              {comparison.methodology_comparable
                ? 'Confronto diretto valido — stessa metodologia'
                : 'Confronto indicativo — metodologia cambiata tra i periodi'}
            </p>
            <p>{comparison.comparability_notes}</p>
            {comparison.methodology_version_id_previous && (
              <p className="font-mono opacity-70">
                {comparison.methodology_version_id_previous} → {comparison.methodology_version_id_current}
              </p>
            )}
          </div>

          {/* Delta cards */}
          {comparison.metric_deltas.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {comparison.metric_deltas.map((d) => (
                <DeltaCard key={d.metric_id} delta={d} />
              ))}
            </div>
          )}

          {/* Doctrine */}
          <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-500 space-y-0.5">
            <p>Il confronto semestrale misura evoluzione aggregata dell&apos;organizzazione, non performance individuale.</p>
            <p>Decision Pack misura l&apos;organizzazione, non gli individui. Il PIB individuale resta privato al lavoratore.</p>
            <p className="italic">Se cambia la metodologia, il confronto viene marcato come non pienamente comparabile.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Version card ──────────────────────────────────────────────────────────────

function VersionCard({ version, isLatest }: { version: DecisionPackVersion; isLatest: boolean }) {
  return (
    <div
      className="rounded-xl border p-4 space-y-3 transition-colors"
      style={isLatest
        ? { borderColor: 'rgba(97,86,245,0.25)', background: 'rgba(97,86,245,0.04)' }
        : { borderColor: 'rgba(6,3,43,0.1)', background: '#FFFFFF' }
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-mono text-slate-400">{version.version_id}</p>
            {isLatest && (
              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wide" style={{ background: '#6156F5' }}>
                Corrente
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-800 mt-1">
            {version.title ?? `Decision Pack · ${version.period}`}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{version.period}</p>
        </div>
        <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${STATUS_STYLES[version.status]}`}>
          {STATUS_LABELS[version.status]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px]">
        {version.kora_index_value !== null && version.kora_index_value !== undefined ? (
          <div>
            <p className="text-slate-400">KORA Index</p>
            <p className="font-bold text-base" style={{ color: '#6156F5' }}>{version.kora_index_value}</p>
          </div>
        ) : (
          <div>
            <p className="text-slate-400">KORA Index</p>
            <p className="text-slate-300">—</p>
          </div>
        )}
        {version.confidence_score > 0 && (
          <div>
            <p className="text-slate-400">Confidence Score</p>
            <p className="font-semibold text-slate-700">{(version.confidence_score * 100).toFixed(0)}%
              <span className="text-[9px] font-normal text-slate-400 ml-1">esterno</span>
            </p>
          </div>
        )}
        {version.activation_safeguard_status && (
          <div>
            <p className="text-slate-400">Safeguard</p>
            <span className={`rounded border px-1 py-0.5 text-[9px] font-semibold ${SAFEGUARD_STYLES[version.activation_safeguard_status] ?? 'border-slate-200 text-slate-500'}`}>
              {version.activation_safeguard_status}
            </span>
          </div>
        )}
      </div>

      {version.change_summary && (
        <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
          {version.change_summary}
        </p>
      )}

      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>{new Date(version.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        {version.sections_included && version.sections_included.length > 0 && (
          <span>{SECTION_NAV.length} sezioni executive · {version.data_readiness} readiness</span>
        )}
      </div>
    </div>
  );
}

// ── Canonical pillar aggregate (S1 Baseline — KORA_DOCTRINE §4) ─────────────

const CANONICAL_PILLAR_AGGREGATE = [
  { pillar: 'LIFE',       share: 44, color: 'bg-blue-400' },
  { pillar: 'GROWTH',     share: 27, color: 'bg-violet-400' },
  { pillar: 'CONNECTION', share: 12, color: 'bg-purple-400' },
  { pillar: 'IMPACT',     share: 11, color: 'bg-lime-400' },
  { pillar: 'LEGACY',     share:  6, color: 'bg-indigo-400' },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

// C-07: Reports — KORA Company Decision Pack Console
export default function Reports() {
  const { activeScenario, activeRole } = useDemoState();
  const COMPANY_ID = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';

  // Factory layer
  const factoryStatus = reportFactoryService.getDecisionPackFactoryStatus(COMPANY_ID);
  const versionHistory = reportFactoryService.getDecisionPackVersionHistory(COMPANY_ID);
  const latestVersion = versionHistory[0] ?? null;
  const exportActions = reportFactoryService.getDecisionPackExportActions(COMPANY_ID);
  const limitations = reportFactoryService.getDecisionPackLimitations(COMPANY_ID);

  // Company metadata
  const tenant = tenantService.getTenant(COMPANY_ID);
  const companyName = tenant?.company_name ?? COMPANY_ID;

  const { data: scoring }   = useScoringResult({ tenantId: COMPANY_ID, scenarioId: activeScenario });
  const { data: scoringS1 } = useScoringResult({ tenantId: COMPANY_ID, scenarioId: 'S1' });
  // Determine if we can render the full report — fallback to S1 when active scenario has no data
  const koraIndex = scoring?.koraIndex ?? scoringS1?.koraIndex ?? null;
  const hasFullReport = koraIndex !== null;

  // Full pack — only generated when KORA Index is available
  const pack = hasFullReport ? reportGeneratorService.getCurrentCompanyDecisionPack(COMPANY_ID, activeScenario) : null;
  const sectionMap = pack ? Object.fromEntries(pack.sections.map((s) => [s.code, s])) : {};
  const safeguardExp = pack?.explanation?.safeguard_explanation;

  // Change summary between v1 and v2 (Meridiana only)
  const changeSummary = versionHistory.length >= 2
    ? reportFactoryService.getDecisionPackChangeSummary(COMPANY_ID, versionHistory[1].version_id, versionHistory[0].version_id)
    : null;

  // Semester comparison
  const periodComparison = latestVersion
    ? reportFactoryService.getDecisionPackPeriodComparison(COMPANY_ID, latestVersion.version_id)
    : null;

  return (
    <div className="space-y-0 max-w-4xl">

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION A — DECISION PACK IDENTITY HERO
          2-zone: left identity, right current output + primary CTA
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{ background: 'linear-gradient(155deg, #06032B 0%, #0D0A3B 55%, #080620 100%)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-0">

          {/* Left: Identity */}
          <div className="flex-1 px-8 py-8 space-y-4 lg:border-r lg:border-white/10">
            <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/30">
              KORA Decision Pack · Foundation Light v0.1
            </p>
            <div>
              <h1
                className="font-kora-editorial font-bold text-white leading-tight"
                style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.02em' }}
              >
                {companyName}
              </h1>
              <p className="text-sm text-white/40 mt-1.5 max-w-sm leading-relaxed">
                Da attivazione organizzativa verificata a output direzionale board-ready.
              </p>
            </div>
            {latestVersion && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-mono text-white/25">{latestVersion.version_id}</span>
                <span className="text-white/15">·</span>
                <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[latestVersion.status]}`}>
                  {STATUS_LABELS[latestVersion.status]}
                </span>
              </div>
            )}
          </div>

          {/* Right: Current output + primary CTA */}
          <div className="px-8 py-8 flex flex-col justify-between gap-6 lg:w-72 shrink-0">
            {hasFullReport && koraIndex ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">KORA Index v3</p>
                    <div className="flex items-end gap-1.5 mt-0.5">
                      <span className="text-3xl font-bold font-kora-editorial text-white tabular-nums">
                        {koraIndex.kora_index_value}
                      </span>
                      <span className="text-xs text-white/20 mb-0.5">/100</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">Confidence</p>
                    <span className="text-xl font-bold tabular-nums mt-0.5 block" style={{ color: '#6156F5' }}>
                      {(koraIndex.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded border px-2 py-0.5 text-[11px] font-bold ${SAFEGUARD_STYLES[koraIndex.safeguard_status] ?? 'border-white/20 text-white'}`}>
                    {koraIndex.safeguard_status}
                  </span>
                  <span className="text-[9px] text-white/20 font-mono">Activation Safeguard</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-400/25 bg-amber-500/8 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">KORA Index</p>
                <p className="text-sm font-semibold text-amber-200 mt-0.5">Non disponibile</p>
                <p className="text-[10px] text-amber-300/60 mt-0.5">{factoryStatus.next_action}</p>
              </div>
            )}
            {/* Primary CTA */}
            <div className="space-y-2">
              <Link
                href="/company/reports/board-pack"
                className="flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-kora-cosmic-blue hover:bg-kora-gray-base transition-colors"
              >
                Apri Board Pack →
              </Link>
              <p className="text-[9px] text-center text-white/20">
                PDF-ready · Stampa da browser · Foundation Light
              </p>
            </div>
          </div>
        </div>

        {/* Governance footer strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-8 py-3 border-t border-white/8">
          {pack && <span className="text-[9px] font-mono text-white/25">{pack.methodology_version}</span>}
          <span className="text-[9px] font-mono text-amber-400/60">pre_empirical_calibration</span>
          <span className="text-[9px] font-mono text-white/20">production_ready: false</span>
          <span className="text-[9px] font-mono text-white/20">synthetic_demo_data: true</span>
          {pack && <span className="text-[9px] font-mono text-white/20">{pack.period}</span>}
        </div>
      </div>

      {/* ── Stato Decision Pack — compact strip ─────────────────────────────── */}
      <div className="mb-6">
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-600">
              Stato
            </p>
            <p className="text-xs font-semibold text-amber-900">
              Bozza disponibile — revisione advisor richiesta
            </p>
            {factoryStatus.warnings.length > 0 && (
              <p className="text-[10px] text-amber-700">{factoryStatus.warnings[0]}</p>
            )}
          </div>
          <div className="flex gap-2 text-[10px] shrink-0 items-center flex-wrap">
            <span className="rounded border border-amber-200 bg-white px-2 py-1 text-amber-700 font-semibold">
              {versionHistory.length} {versionHistory.length === 1 ? 'versione' : 'versioni'}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION C — VERSION TIMELINE
      ═══════════════════════════════════════════════════════════════════════ */}
      {versionHistory.length > 0 && (
        <div className="mb-6 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Cronologia Versioni · {versionHistory.length} {versionHistory.length === 1 ? 'versione' : 'versioni'}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {versionHistory.map((version, idx) => (
              <VersionCard key={version.version_id} version={version} isLatest={idx === 0} />
            ))}
          </div>

          {/* Change summary between versions */}
          {changeSummary && changeSummary.main_changes.length > 0 && (
            <div className="rounded-lg border border-kora-fun-green/40 bg-kora-fun-green/15 px-4 py-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-kora-cosmic-blue">
                Variazioni v1 → v2
              </p>
              {changeSummary.main_changes.map((c, i) => (
                <p key={i} className="text-xs text-kora-cosmic-blue">· {c}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION C.2 — SEMESTER COMPARISON
          Always rendered when at least one version exists
      ═══════════════════════════════════════════════════════════════════════ */}
      {periodComparison && (
        <div className="mb-6">
          <PeriodComparisonSection comparison={periodComparison} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          NO-DATA STATE — for companies without KORA Index
      ═══════════════════════════════════════════════════════════════════════ */}
      {!hasFullReport && (
        <div className="mb-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center space-y-3">
            <p className="text-base font-semibold text-slate-700">Decision Pack non ancora disponibile</p>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              Il Decision Pack sarà generato quando data intake, validazione e scoring readiness saranno completati.
            </p>
            {factoryStatus.blocking_reasons.length > 0 && (
              <div className="text-left max-w-lg mx-auto space-y-1 pt-2">
                {factoryStatus.blocking_reasons.map((r, i) => (
                  <p key={i} className="text-xs text-slate-600">· {r}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION D — INTELLIGENCE MODULES OVERVIEW
          Not chip links — modules with purpose descriptions
      ═══════════════════════════════════════════════════════════════════════ */}
      {hasFullReport && (
        <div className="mb-6 space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-kora-cosmic-blue/40">
              Moduli di intelligence
            </p>
            <p className="text-xs text-kora-cosmic-blue/50 mt-0.5">
              Questo Decision Pack risponde a 8 domande organizzative chiave
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
            {SECTION_NAV.map((nav) => (
              <a
                key={nav.id}
                href={`#${nav.id}`}
                className="group rounded-xl border border-kora-cosmic-blue/8 bg-white px-4 py-3 space-y-1 hover:border-kora-violet/25 hover:bg-kora-violet/3 transition-colors"
              >
                <p className="text-[10px] font-semibold text-kora-cosmic-blue group-hover:text-kora-violet transition-colors">
                  {nav.label}
                </p>
                {nav.description && (
                  <p className="text-[9px] text-kora-cosmic-blue/45 leading-snug">{nav.description}</p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION E — EXPORT / SHARING PANEL
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="mb-6 space-y-3 print:hidden">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Export & Distribuzione
        </p>
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <p className="text-xs text-slate-500">
            Il Board Pack Preview è disponibile come documento stampabile PDF-ready.
            Export PDF automatico non attivo in Foundation Light — usare il browser per Salva come PDF.
          </p>
          <Link
            href="/company/reports/board-pack"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Apri Board Pack Preview →
            <span className="font-normal text-slate-400 text-[10px]">Scarica/stampa da browser · Export PDF automatico non attivo in Foundation Light</span>
          </Link>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {exportActions.map((action) => (
              <div
                key={action.action_id ?? action.label}
                className={`rounded-lg border p-3 text-center space-y-1.5 ${
                  action.enabled
                    ? 'border-indigo-200 bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-colors'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <p className="text-xs font-semibold text-slate-600">{action.label}</p>
                {action.future_capability && (
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                    In arrivo
                  </span>
                )}
                {!action.future_capability && !action.enabled && (
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                    Demo
                  </span>
                )}
                {action.reason_disabled && (
                  <p className="text-[9px] text-slate-400 leading-tight">{action.reason_disabled}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Report body — 8 canonical sections ──────────────────────────────── */}
      {hasFullReport && pack && (
        <div className="space-y-8">
          <div className="border-t border-slate-200 pt-6">

            {/* 1: Executive Summary */}
            {sectionMap.executive_summary && (
              <>
                <SectionBlock section={sectionMap.executive_summary}>
                  <DecisionPackHero
                    output={pack.kora_index_output}
                    s1Output={pack.s1_kora_output}
                    s2Output={pack.s2_kora_output}
                    activeScenario={activeScenario}
                    safeguard={pack.activation_safeguard}
                    confidence={pack.confidence_record}
                    s1Macroblocks={pack.s1_macroblocks}
                    s2Macroblocks={pack.s2_macroblocks}
                  />
                  <InsightList insights={sectionMap.executive_summary.insights} />
                  <RecList recommendations={sectionMap.executive_summary.recommendations} />
                </SectionBlock>
                <SectionDivider />
              </>
            )}

            {/* 2: KORA Index */}
            {sectionMap.kora_index_v3 && (
              <>
                <SectionBlock section={sectionMap.kora_index_v3}>
                  <KoraIndexHero output={pack.kora_index_output} />
                  <ComponentBreakdown components={pack.kora_index_output.components} />
                  <InsightList insights={sectionMap.kora_index_v3.insights} />
                  <RecList recommendations={sectionMap.kora_index_v3.recommendations} />
                </SectionBlock>

                {/* Technical Preview — collapsed, visually demoted, NOT an official KORA Index */}
                {sectionMap.dynamic_scoring_preview && (
                  <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-slate-400 select-none">
                      Technical Preview / Methodology Debug — Non sostituisce il KORA Index v3
                    </summary>
                    <div className="mt-3 rounded border border-slate-200 bg-white px-3 py-2.5 font-mono text-[10px] text-slate-400 space-y-1">
                      <p>calculation_mode: {pack.dynamic_preview.calculation_mode}</p>
                      <p>production_ready: false · official_index_source: {pack.dynamic_preview.official_index_source}</p>
                      <p>Preview Score: {pack.dynamic_preview.dynamic_preview_score}/100 · Canonical KORA Index: {pack.dynamic_preview.canonical_kora_index}/100 · Δ: {pack.dynamic_preview.delta_vs_canonical >= 0 ? '+' : ''}{pack.dynamic_preview.delta_vs_canonical}</p>
                      <p className="italic text-slate-300">Low confidence technical preview · Non è il KORA Index ufficiale · Not production-ready</p>
                    </div>
                  </details>
                )}
                <SectionDivider />
              </>
            )}

            {/* 3: Activation & Workforce */}
            {sectionMap.workforce_activation && (
              <>
                <SectionBlock section={sectionMap.workforce_activation}>
                  <ActivationSafeguardPanel result={pack.activation_safeguard} explanation={safeguardExp} />
                  <MetricGrid metrics={sectionMap.workforce_activation.metrics} />
                  <InsightList insights={sectionMap.workforce_activation.insights} />
                  <RecList recommendations={sectionMap.workforce_activation.recommendations} />
                </SectionBlock>
                <SectionDivider />
              </>
            )}

            {/* 4: Budget-to-Human-Impact (Economic Relief inline) */}
            {sectionMap.budget_to_human_impact && (
              <>
                <SectionBlock section={sectionMap.budget_to_human_impact}>
                  <BudgetImpactReport
                    s1Record={pack.bti_record_s1 ?? undefined}
                    s2Record={pack.bti_record_s2 ?? undefined}
                    s1Macroblocks={pack.s1_macroblocks}
                    s2Macroblocks={pack.s2_macroblocks}
                    activeScenario={activeScenario}
                  />
                  <InsightList insights={sectionMap.budget_to_human_impact.insights} />
                  <RecList recommendations={sectionMap.budget_to_human_impact.recommendations} />
                  {sectionMap.economic_relief && (
                    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {sectionMap.economic_relief.title}
                      </p>
                      <p className="text-xs text-slate-600">{sectionMap.economic_relief.summary}</p>
                      <InsightList insights={sectionMap.economic_relief.insights} />
                    </div>
                  )}
                </SectionBlock>
                <SectionDivider />
              </>
            )}

            {/* 5: Eligibility Gate */}
            {sectionMap.eligibility_gate && (
              <>
                <SectionBlock section={sectionMap.eligibility_gate}>
                  <EligibilitySummaryReport summary={pack.eligibility_gate} />
                  <InsightList insights={sectionMap.eligibility_gate.insights} />
                </SectionBlock>
                <SectionDivider />
              </>
            )}

            {/* 6: Pillar Balance — canonical aggregate share (not batch IU values) */}
            {sectionMap.pillar_analysis && (
              <>
                <div id="pillar_analysis" className="scroll-mt-24 space-y-4">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">pillar_analysis</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Pillar Balance</h3>
                    <p className="text-xs text-slate-500">Distribuzione aggregata aziendale · dati sintetici demo canonici</p>
                  </div>
                  <div className="space-y-2">
                    {CANONICAL_PILLAR_AGGREGATE.map(({ pillar, share, color }) => (
                      <div key={pillar} className="flex items-center gap-3">
                        <span className="w-24 text-xs font-mono text-slate-600">{pillar}</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100">
                          <div className={`h-2 rounded-full ${color}`} style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-xs font-mono text-slate-500 w-10 text-right">{share}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Aggregato aziendale canonico Q1–Q3 2025 · Dati sintetici demo · Valori IU batch demo esclusi da questa vista.
                  </p>
                  <RecList recommendations={sectionMap.pillar_analysis.recommendations} />
                </div>
                <SectionDivider />
              </>
            )}

            {/* 7: Raccomandazioni + Piano 90gg */}
            {sectionMap.recommendations && (
              <>
                <SectionBlock section={sectionMap.recommendations}>
                  <RecList recommendations={sectionMap.recommendations.recommendations} />
                  {sectionMap.ninety_day_action_plan && (
                    <div className="mt-4 space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Piano d&apos;azione 90 giorni
                      </p>
                      <ActionPlanReport
                        s1Record={pack.bti_record_s1 ?? undefined}
                        s2Record={pack.bti_record_s2 ?? undefined}
                        recommendations={pack.bti_recommendations}
                        eligibilityGate={pack.eligibility_gate}
                      />
                      <RecList recommendations={sectionMap.ninety_day_action_plan.recommendations} />
                    </div>
                  )}
                </SectionBlock>
                <SectionDivider />
              </>
            )}

            {/* 8: Metodologia & Confini */}
            {sectionMap.methodology_boundaries && (
              <SectionBlock section={sectionMap.methodology_boundaries} />
            )}
          </div>

          <PrivacyBoundaryNote />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION G — LIMITATIONS / METHODOLOGY BOUNDARIES
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="mt-8 rounded-xl border border-kora-cosmic-blue/10 p-6 space-y-4"
        style={{ background: 'rgba(6,3,43,0.03)' }}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-kora-violet mb-1">
            Confini Metodologici
          </p>
          <p className="text-sm font-semibold text-kora-cosmic-blue">
            Decision Pack misura l&apos;organizzazione, non gli individui.
          </p>
        </div>
        <ul className="space-y-1.5 text-xs text-kora-cosmic-blue/70 leading-relaxed">
          <li>· Dati sintetici demo — non rappresentativi della situazione reale dell&apos;azienda.</li>
          <li>· Foundation Light v0.1 · pre_empirical_calibration — output direzionale, non certificazione pubblica o attestazione regolatoria.</li>
          <li>· Confidence Score: indicatore esterno di affidabilità dati, peso = 0 nel KORA Index v3. Non è una componente del punteggio.</li>
          <li>· Correlazione ≠ causalità — tutti i segnali KORA sono associativi, non predittivi.</li>
          <li>· KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.</li>
        </ul>
        {limitations.length > 0 && (
          <div className="border-t border-kora-cosmic-blue/10 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kora-cosmic-blue/40 mb-2">
              Limitazioni specifiche
            </p>
            <ul className="space-y-1">
              {limitations.slice(0, 6).map((l, i) => (
                <li key={i} className="flex gap-1.5 text-[11px] text-kora-cosmic-blue/60">
                  <span className="text-kora-cosmic-blue/25 shrink-0">·</span>{l}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-[10px] font-mono text-kora-cosmic-blue/35">
          {pack?.methodology_version ?? 'KORA Methodology v0.1'} · pre_empirical_calibration · production_ready: false · synthetic_demo_data: true
        </p>
      </div>

    </div>
  );
}
