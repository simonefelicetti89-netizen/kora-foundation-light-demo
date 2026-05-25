'use client';

import { useDemoState } from '@/lib/demo-state';
import { reportGeneratorService } from '@/services/report-generator/ReportGeneratorService';
import { reportFactoryService } from '@/services/report-factory/ReportFactoryService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
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
  { id: 'executive_summary',      label: 'Executive Summary' },
  { id: 'kora_index_v3',          label: 'KORA Index' },
  { id: 'workforce_activation',   label: 'Activation & Workforce' },
  { id: 'budget_to_human_impact', label: 'Budget-to-Human-Impact' },
  { id: 'eligibility_gate',       label: 'Eligibility Gate' },
  { id: 'pillar_analysis',        label: 'Pillar Balance' },
  { id: 'recommendations',        label: 'Raccomandazioni' },
  { id: 'methodology_boundaries', label: 'Metodologia & Confini' },
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
  exported:                'bg-indigo-50 text-indigo-600 border-indigo-200',
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
            <span key={a} className="rounded bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-600">{a}</span>
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
    <div className={`rounded-xl border p-4 space-y-3 transition-colors ${
      isLatest
        ? 'border-indigo-200 bg-indigo-50'
        : 'border-slate-200 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-mono text-slate-400">{version.version_id}</p>
            {isLatest && (
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wide">
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
            <p className="font-bold text-indigo-700 text-base">{version.kora_index_value}</p>
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
          <span>{version.sections_included.length} sezioni · {version.data_readiness} readiness</span>
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

  // Determine if we can render the full report
  const koraIndex = scoringSimulatorService.getKoraIndexOutput(COMPANY_ID, activeScenario)
    ?? scoringSimulatorService.getKoraIndexOutput(COMPANY_ID, 'S1');
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
          SECTION A — REPORT HERO
          Premium cover: company identity + governance metadata
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 mb-6 text-white">
        <div className="flex flex-col gap-6">

          {/* Eyebrow */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300 mb-1">
              KORA Company Decision Pack · Foundation Light v0.1
            </p>
            <h1 className="text-2xl font-bold text-white leading-tight">{companyName}</h1>
            <p className="text-sm text-slate-300 mt-1">
              Decision Pack versionato — output direzionale company-scoped.
              Foundation Light v0.1 è in pre-empirical calibration.
            </p>
          </div>

          {/* Key metrics row */}
          <div className="flex flex-wrap items-center gap-4">
            {hasFullReport && koraIndex ? (
              <>
                <div className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300">KORA Index v3</p>
                  <p className="text-3xl font-bold text-white mt-0.5">{koraIndex.kora_index_value}</p>
                  <p className="text-[10px] text-indigo-300">/100</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300">Confidence Score</p>
                  <p className="text-2xl font-bold text-white mt-0.5">{(koraIndex.confidence_score * 100).toFixed(0)}%</p>
                  <p className="text-[9px] text-indigo-400 mt-0.5">indicatore esterno · peso 0</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300">Activation Safeguard</p>
                  <span className={`mt-1 inline-block rounded border px-2 py-0.5 text-[11px] font-bold ${SAFEGUARD_STYLES[koraIndex.safeguard_status] ?? 'border-white/20 text-white'}`}>
                    {koraIndex.safeguard_status}
                  </span>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">KORA Index</p>
                <p className="text-sm font-semibold text-amber-200 mt-0.5">Non disponibile</p>
                <p className="text-[10px] text-amber-300/70 mt-0.5">{factoryStatus.next_action}</p>
              </div>
            )}

            {latestVersion && (
              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300">Versione corrente</p>
                <p className="text-xs font-mono text-white mt-0.5">{latestVersion.version_id}</p>
                <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[latestVersion.status]}`}>
                  {STATUS_LABELS[latestVersion.status]}
                </span>
              </div>
            )}
          </div>

          {/* Governance footer */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
            {pack && (
              <span className="text-[10px] font-mono text-slate-400">{pack.methodology_version}</span>
            )}
            <span className="text-[10px] font-mono text-amber-400/80">pre_empirical_calibration</span>
            <span className="text-[10px] font-mono text-rose-400/80">production_ready: false</span>
            <span className="text-[10px] font-mono text-slate-400">synthetic_demo_data: true</span>
            {pack && <span className="text-[10px] font-mono text-slate-400">{pack.period}</span>}
          </div>
        </div>
      </div>

      {/* ── Stato Decision Pack ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
              Stato Decision Pack
            </p>
            <p className="text-sm font-semibold text-amber-900">
              Bozza disponibile — revisione advisor richiesta prima del Board Pack finale
            </p>
            {factoryStatus.warnings.length > 0 && (
              <p className="text-xs text-amber-700">{factoryStatus.warnings[0]}</p>
            )}
          </div>
          <div className="flex gap-2 text-[10px] shrink-0">
            <span className="rounded border border-amber-200 bg-white px-2 py-1 text-amber-700 font-semibold">
              {versionHistory.length} {versionHistory.length === 1 ? 'versione' : 'versioni'}
            </span>
            <span className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-400">
              PDF export · in arrivo
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
          SECTION D — CHAPTER NAVIGATION (only when report available)
      ═══════════════════════════════════════════════════════════════════════ */}
      {hasFullReport && (
        <div className="mb-6 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Sezioni Decision Pack
          </p>
          <div className="overflow-x-auto -mx-1 px-1 print:hidden">
            <div className="flex gap-1.5 min-w-max pb-1">
              {SECTION_NAV.map((nav) => (
                <a
                  key={nav.id}
                  href={`#${nav.id}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors whitespace-nowrap"
                >
                  {nav.label}
                </a>
              ))}
            </div>
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
            PDF Export sarà abilitato nel blocco successivo. Questa sezione prepara versioning, governance e readiness del Decision Pack.
          </p>
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
      <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50 p-6 space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500 mb-1">
            Confini Metodologici
          </p>
          <p className="text-sm font-semibold text-indigo-900">
            Decision Pack misura l&apos;organizzazione, non gli individui.
          </p>
        </div>
        <ul className="space-y-1.5 text-xs text-indigo-800 leading-relaxed">
          <li>· Dati sintetici demo — non rappresentativi della situazione reale dell&apos;azienda.</li>
          <li>· Foundation Light v0.1 · pre_empirical_calibration — output direzionale, non certificazione pubblica o attestazione regolatoria.</li>
          <li>· Confidence Score: indicatore esterno di affidabilità dati, peso = 0 nel KORA Index v3. Non è una componente del punteggio.</li>
          <li>· Correlazione ≠ causalità — tutti i segnali KORA sono associativi, non predittivi.</li>
          <li>· KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.</li>
        </ul>
        {limitations.length > 0 && (
          <div className="border-t border-indigo-200 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-2">
              Limitazioni specifiche
            </p>
            <ul className="space-y-1">
              {limitations.slice(0, 6).map((l, i) => (
                <li key={i} className="flex gap-1.5 text-[11px] text-indigo-700">
                  <span className="text-indigo-300 shrink-0">·</span>{l}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-[10px] font-mono text-indigo-400">
          {pack?.methodology_version ?? 'KORA Methodology v0.1'} · pre_empirical_calibration · production_ready: false · synthetic_demo_data: true
        </p>
      </div>

    </div>
  );
}
