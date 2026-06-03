'use client';
// C-09: Decision Pack — output board-ready con scomposizione metodologica.
// Scopo: fornire a HR/CFO/ESG un documento strutturato, spiegabile e con confini espliciti.
// Confidence/Safeguard sempre visibili; nessun dato individuale.

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
import { PageMasthead } from '@/components/ui/PageMasthead';
import { DecisionContext } from '@/components/ui/DecisionContext';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ProvenanceFooter } from '@/components/company/cockpit/ProvenanceFooter';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { Explainer } from '@/components/ui/Explainer';
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

// ── Status → KORA tokens ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<DecisionPackStatus, string> = {
  draft:                   'Bozza',
  data_review_required:    'Dati in revisione',
  advisor_review_required: 'Revisione advisor',
  ready:                   'Pronto',
  exported:                'Esportato',
  archived:                'Archiviato',
  blocked:                 'Bloccato',
};

function statusToken(status: DecisionPackStatus): { bg: string; text: string } {
  switch (status) {
    case 'ready':                   return { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text  };
    case 'data_review_required':    return { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text   };
    case 'advisor_review_required': return { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text };
    case 'exported':                return { bg: `${TOKENS.accent}14`,      text: TOKENS.accent               };
    case 'blocked':                 return { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text   };
    default:                        return { bg: TOKENS.inkBorder,          text: TOKENS.inkSecondary         };
  }
}

function safeguardToken(status: string): { bg: string; text: string; dot: string } {
  if (status === 'CLEAR')   return TOKENS.safeguard.pass;
  if (status === 'FLAGGED') return TOKENS.safeguard.cap;
  return TOKENS.safeguard.watch;
}

function safeguardLabel(status: string): string {
  if (status === 'CLEAR')   return 'Clear';
  if (status === 'FLAGGED') return 'Flagged';
  return 'Warning';
}

// ── Generic content renderers ─────────────────────────────────────────────────

function MetricGrid({ metrics }: { metrics: DecisionPackMetric[] }) {
  if (!metrics.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map((m) => (
        <div
          key={m.code}
          style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '0.875rem' }}
        >
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6 }}>
            {m.label}
          </p>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.625rem', color: TOKENS.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {m.value}{m.unit && <span style={{ fontSize: '11px', fontWeight: 400, color: TOKENS.inkHint, marginLeft: 3 }}>{m.unit}</span>}
          </p>
          {m.delta !== undefined && (
            <p style={{ fontSize: '11px', fontWeight: 600, color: m.delta >= 0 ? TOKENS.safeguard.pass.text : TOKENS.safeguard.cap.text, marginTop: 4 }}>
              {m.delta >= 0 ? '+' : ''}{m.delta} vs S1
            </p>
          )}
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.55, marginTop: 4 }} className="line-clamp-2">{m.interpretation}</p>
          {m.confidence === 'low' && (
            <span style={{ display: 'inline-block', marginTop: 4, fontSize: '10px', background: TOKENS.safeguard.watch.bg, color: TOKENS.safeguard.watch.text, borderRadius: 4, padding: '2px 6px' }}>
              bassa fiducia
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const SEVERITY_TOKEN: Record<string, { leftColor: string; bg: string; text: string }> = {
  critical: { leftColor: TOKENS.safeguard.cap.dot,   bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text   },
  high:     { leftColor: TOKENS.safeguard.watch.dot, bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text },
  medium:   { leftColor: `${TOKENS.accent}88`,       bg: `${TOKENS.accent}08`,      text: TOKENS.inkSecondary         },
  low:      { leftColor: TOKENS.inkBorder,           bg: TOKENS.inkBorder,          text: TOKENS.inkSecondary         },
};

function InsightList({ insights }: { insights: DecisionPackInsight[] }) {
  if (!insights.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {insights.map((ins) => {
        const sv = SEVERITY_TOKEN[ins.severity] ?? SEVERITY_TOKEN.low;
        return (
          <div
            key={ins.id}
            style={{ borderLeft: `4px solid ${sv.leftColor}`, borderRadius: '0 6px 6px 0', padding: '10px 14px', background: sv.bg, fontSize: '12px', lineHeight: 1.6 }}
          >
            <p style={{ fontWeight: 600, color: TOKENS.ink, marginBottom: 3 }}>{ins.title}</p>
            <p style={{ color: sv.text }}>{ins.body}</p>
            {ins.limitation && <p style={{ marginTop: 6, color: TOKENS.inkHint, fontStyle: 'italic' }}>{ins.limitation}</p>}
          </div>
        );
      })}
    </div>
  );
}

const PRIORITY_TOKEN: Record<string, { leftColor: string; bg: string; tagBg: string; tagText: string }> = {
  alta:  { leftColor: TOKENS.safeguard.cap.dot,   bg: TOKENS.safeguard.cap.bg,   tagBg: TOKENS.safeguard.cap.bg,   tagText: TOKENS.safeguard.cap.text   },
  media: { leftColor: TOKENS.safeguard.watch.dot, bg: TOKENS.safeguard.watch.bg, tagBg: TOKENS.safeguard.watch.bg, tagText: TOKENS.safeguard.watch.text },
  bassa: { leftColor: TOKENS.inkHint,             bg: TOKENS.inkBorder,          tagBg: TOKENS.inkBorder,          tagText: TOKENS.inkSecondary         },
};

function RecList({ recommendations }: { recommendations: DecisionPackRecommendation[] }) {
  if (!recommendations.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {recommendations.map((rec) => {
        const pt = PRIORITY_TOKEN[rec.priority] ?? PRIORITY_TOKEN.bassa;
        return (
          <div key={rec.id} style={{ borderLeft: `4px solid ${pt.leftColor}`, borderRadius: '0 6px 6px 0', padding: '10px 14px', background: pt.bg }}>
            <div className="flex items-start justify-between gap-2">
              <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink }}>{rec.title}</p>
              <div className="flex shrink-0 gap-1.5 items-center">
                <span style={{ fontSize: '10px', fontWeight: 700, background: pt.tagBg, color: pt.tagText, borderRadius: 4, padding: '2px 6px' }}>
                  {rec.priority}
                </span>
                <span style={{ fontSize: '10px', background: TOKENS.inkBorder, color: TOKENS.inkSecondary, borderRadius: 4, padding: '2px 6px' }}>
                  {rec.horizon}
                </span>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, marginTop: 4 }}>{rec.recommended_action}</p>
            <p style={{ fontSize: '11px', color: TOKENS.inkHint, fontStyle: 'italic', marginTop: 3 }}>{rec.caveat}</p>
          </div>
        );
      })}
    </div>
  );
}

function SectionBlock({ section, children }: { section: DecisionPackSection; children?: React.ReactNode }) {
  return (
    <div id={section.code} className="scroll-mt-24 space-y-4">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="flex flex-wrap items-center gap-2">
          <span style={{ fontFamily: 'monospace', fontSize: '10px', background: TOKENS.inkBorder, color: TOKENS.inkSecondary, borderRadius: 4, padding: '2px 6px' }}>
            {section.code}
          </span>
          {section.audience.map((a) => (
            <span key={a} style={{ fontSize: '10px', background: `${TOKENS.accent}12`, color: TOKENS.accent, borderRadius: 4, padding: '2px 6px', border: `1px solid ${TOKENS.accent}22` }}>
              {a}
            </span>
          ))}
        </div>
        <h3 style={{ fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, color: "var(--kora-ink)", fontSize: '1.25rem', letterSpacing: '-0.01em' }}>{section.title}</h3>
        {section.subtitle && <p style={{ fontSize: '12px', color: TOKENS.inkSecondary }}>{section.subtitle}</p>}
      </div>
      {section.summary && <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.7 }}>{section.summary}</p>}
      {children ?? (
        <>
          <MetricGrid metrics={section.metrics} />
          <InsightList insights={section.insights} />
          <RecList recommendations={section.recommendations} />
        </>
      )}
      {section.methodology_notes && (
        <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint, borderTop: TOKENS.cardBorder, paddingTop: 8, marginTop: 4 }}>
          {section.methodology_notes}
        </p>
      )}
    </div>
  );
}

function SectionDivider() {
  return <div style={{ borderTop: TOKENS.cardBorder, paddingTop: 24, marginTop: 8 }} />;
}

// ── Period comparison ─────────────────────────────────────────────────────────

const TREND_TOKEN: Record<DecisionPackMetricTrend, { label: string; icon: string; iconColor: string; bg: string; borderColor: string }> = {
  improved:       { label: 'Migliorato',    icon: '↑', iconColor: TOKENS.safeguard.pass.text,  bg: TOKENS.safeguard.pass.bg,  borderColor: `${TOKENS.safeguard.pass.dot}66`  },
  stable:         { label: 'Stabile',       icon: '→', iconColor: TOKENS.inkSecondary,         bg: TOKENS.inkBorder,          borderColor: TOKENS.inkBorder                 },
  declined:       { label: 'In calo',       icon: '↓', iconColor: TOKENS.safeguard.cap.text,   bg: TOKENS.safeguard.cap.bg,   borderColor: `${TOKENS.safeguard.cap.dot}66`   },
  not_comparable: { label: 'Non comparabile',icon: '≈', iconColor: TOKENS.safeguard.watch.text,bg: TOKENS.safeguard.watch.bg, borderColor: `${TOKENS.safeguard.watch.dot}66`},
  not_available:  { label: 'N/D',          icon: '—', iconColor: TOKENS.inkHint,              bg: TOKENS.inkBorder,          borderColor: TOKENS.inkBorder                 },
};

function DeltaCard({ delta }: { delta: DecisionPackMetricDelta }) {
  const tt = TREND_TOKEN[delta.trend] ?? TREND_TOKEN.not_available;
  return (
    <div style={{ background: tt.bg, border: `1px solid ${tt.borderColor}`, borderRadius: TOKENS.cardRadius, padding: '10px 12px' }}>
      <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6 }}>
        {delta.label}
      </p>
      <div className="flex items-center gap-1.5">
        <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.125rem', color: tt.iconColor }}>{tt.icon}</span>
        {delta.current_value !== null && delta.current_value !== undefined && (
          <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.125rem', color: TOKENS.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.015em' }}>
            {delta.metric_id === 'confidence_score' ? `${delta.current_value}%` : delta.current_value}
          </span>
        )}
        {delta.delta_abs !== undefined && (
          <span style={{ fontSize: '11px', fontWeight: 600, color: delta.delta_abs >= 0 ? TOKENS.safeguard.pass.text : TOKENS.safeguard.cap.text, fontVariantNumeric: 'tabular-nums' }}>
            {delta.delta_abs >= 0 ? '+' : ''}{delta.metric_id === 'confidence_score' ? `${delta.delta_abs}pt` : delta.delta_abs.toFixed(1)}
          </span>
        )}
      </div>
      {delta.previous_value !== null && delta.previous_value !== undefined && (
        <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
          Precedente: {delta.metric_id === 'confidence_score' ? `${delta.previous_value}%` : delta.previous_value}
        </p>
      )}
      <p style={{ fontSize: '9px', fontWeight: 600, color: tt.iconColor, marginTop: 4 }}>{tt.label}</p>
    </div>
  );
}

function PeriodComparisonSection({ comparison }: { comparison: DecisionPackPeriodComparison }) {
  const isAvailable = comparison.comparable_with_previous;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint }}>
          Variazione rispetto al semestre precedente
        </p>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '11px', color: TOKENS.inkHint }}>{comparison.reporting_period_label}</span>
          {comparison.previous_period_label && (
            <>
              <span style={{ fontSize: '11px', color: TOKENS.inkHint, opacity: 0.5 }}>vs</span>
              <span style={{ fontSize: '11px', color: TOKENS.inkHint }}>{comparison.previous_period_label}</span>
            </>
          )}
        </div>
      </div>

      {!isAvailable ? (
        <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink }}>Confronto semestrale non ancora disponibile</p>
          <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, marginTop: 6 }}>{comparison.comparability_notes}</p>
          <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 10, lineHeight: 1.6 }}>
            Il Decision Pack può essere generato ogni semestre. Gli indicatori mostreranno miglioramento, stabilità o decrescita quando i dati saranno comparabili.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            borderRadius: 8, padding: '10px 14px', fontSize: '11px', lineHeight: 1.6,
            background: comparison.methodology_comparable ? TOKENS.safeguard.pass.bg : TOKENS.safeguard.watch.bg,
            color: comparison.methodology_comparable ? TOKENS.safeguard.pass.text : TOKENS.safeguard.watch.text,
            border: `1px solid ${comparison.methodology_comparable ? TOKENS.safeguard.pass.dot : TOKENS.safeguard.watch.dot}44`,
          }}>
            <p style={{ fontWeight: 600 }}>
              {comparison.methodology_comparable
                ? 'Confronto diretto valido — stessa metodologia'
                : 'Confronto indicativo — metodologia cambiata tra i periodi'}
            </p>
            <p>{comparison.comparability_notes}</p>
            {comparison.methodology_version_id_previous && (
              <p style={{ fontFamily: 'monospace', fontSize: '10px', opacity: 0.7, marginTop: 4 }}>
                {comparison.methodology_version_id_previous} → {comparison.methodology_version_id_current}
              </p>
            )}
          </div>
          {comparison.metric_deltas.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {comparison.metric_deltas.map((d) => <DeltaCard key={d.metric_id} delta={d} />)}
            </div>
          )}
          <div style={{ background: TOKENS.inkBorder, borderRadius: 8, padding: '10px 14px', fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <p>Il confronto semestrale misura evoluzione aggregata dell&apos;organizzazione, non performance individuale.</p>
            <p style={{ marginTop: 4 }}>Decision Pack misura l&apos;organizzazione, non gli individui. Il PIB individuale resta privato al lavoratore.</p>
            <p style={{ marginTop: 4, fontStyle: 'italic', color: TOKENS.inkHint }}>Se cambia la metodologia, il confronto viene marcato come non pienamente comparabile.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Version card ──────────────────────────────────────────────────────────────

function VersionCard({ version, isLatest }: { version: DecisionPackVersion; isLatest: boolean }) {
  const st = statusToken(version.status);
  const sg = version.activation_safeguard_status ? safeguardToken(version.activation_safeguard_status) : null;
  return (
    <div style={{
      background: isLatest ? `${TOKENS.accent}06` : TOKENS.surface,
      border: isLatest ? `1px solid ${TOKENS.accent}33` : TOKENS.cardBorder,
      borderRadius: TOKENS.cardRadius,
      padding: '1rem',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint }}>{version.version_id}</p>
            {isLatest && (
              <span style={{ fontSize: '9px', fontWeight: 700, background: TOKENS.accent, color: '#FFFFFF', borderRadius: 9999, padding: '2px 7px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Corrente
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginTop: 4 }}>
            {version.title ?? `Decision Pack · ${version.period}`}
          </p>
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 2 }}>{version.period}</p>
        </div>
        <span style={{ fontSize: '10px', fontWeight: 600, background: st.bg, color: st.text, borderRadius: 4, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {STATUS_LABELS[version.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {version.kora_index_value !== null && version.kora_index_value !== undefined ? (
          <div>
            <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>KORA Index</p>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.5rem', color: TOKENS.accent, lineHeight: 1, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
              {version.kora_index_value}
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>KORA Index</p>
            <p style={{ fontSize: '13px', color: TOKENS.inkHint, marginTop: 3 }}>—</p>
          </div>
        )}
        {version.confidence_score > 0 && (
          <div>
            <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>Confidence Score</p>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '1.125rem', color: TOKENS.ink, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
              {(version.confidence_score * 100).toFixed(0)}%
              <span style={{ fontSize: '9px', fontWeight: 400, color: TOKENS.inkHint, marginLeft: 4 }}>esterno</span>
            </p>
          </div>
        )}
        {sg && version.activation_safeguard_status && (
          <div>
            <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>Safeguard</p>
            <span style={{ display: 'inline-block', marginTop: 3, fontSize: '10px', fontWeight: 600, background: sg.bg, color: sg.text, borderRadius: 4, padding: '2px 7px' }}>
              {safeguardLabel(version.activation_safeguard_status)}
            </span>
          </div>
        )}
      </div>

      {version.change_summary && (
        <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6, borderTop: TOKENS.cardBorder, paddingTop: 10 }}>
          {version.change_summary}
        </p>
      )}

      <div className="flex items-center justify-between" style={{ fontSize: '10px', color: TOKENS.inkHint }}>
        <span>{new Date(version.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        {version.sections_included && version.sections_included.length > 0 && (
          <span>{SECTION_NAV.length} sezioni executive · {version.data_readiness} readiness</span>
        )}
      </div>
    </div>
  );
}

// ── Pillar bars — ink ramp, no rainbow ────────────────────────────────────────

const PILLAR_RAMP = [
  TOKENS.accent,
  'rgba(6,3,43,0.65)',
  'rgba(6,3,43,0.50)',
  'rgba(6,3,43,0.35)',
  'rgba(6,3,43,0.22)',
];

const CANONICAL_PILLAR_AGGREGATE = [
  { pillar: 'LIFE',       share: 44 },
  { pillar: 'GROWTH',     share: 27 },
  { pillar: 'CONNECTION', share: 12 },
  { pillar: 'IMPACT',     share: 11 },
  { pillar: 'LEGACY',     share:  6 },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

// C-07: Reports — KORA Company Decision Pack Console
export default function Reports() {
  const { activeScenario, activeRole } = useDemoState();
  const COMPANY_ID = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';

  const factoryStatus  = reportFactoryService.getDecisionPackFactoryStatus(COMPANY_ID);
  const versionHistory = reportFactoryService.getDecisionPackVersionHistory(COMPANY_ID);
  const latestVersion  = versionHistory[0] ?? null;
  const exportActions  = reportFactoryService.getDecisionPackExportActions(COMPANY_ID);
  const limitations    = reportFactoryService.getDecisionPackLimitations(COMPANY_ID);

  const tenant      = tenantService.getTenant(COMPANY_ID);
  const companyName = tenant?.company_name ?? COMPANY_ID;

  const { data: scoring }   = useScoringResult({ tenantId: COMPANY_ID, scenarioId: activeScenario });
  const { data: scoringS1 } = useScoringResult({ tenantId: COMPANY_ID, scenarioId: 'S1' });
  const koraIndex    = scoring?.koraIndex ?? scoringS1?.koraIndex ?? null;
  const hasFullReport = koraIndex !== null;

  const pack       = hasFullReport ? reportGeneratorService.getCurrentCompanyDecisionPack(COMPANY_ID, activeScenario) : null;
  const sectionMap = pack ? Object.fromEntries(pack.sections.map((s) => [s.code, s])) : {};
  const safeguardExp = pack?.explanation?.safeguard_explanation;

  const changeSummary = versionHistory.length >= 2
    ? reportFactoryService.getDecisionPackChangeSummary(COMPANY_ID, versionHistory[1].version_id, versionHistory[0].version_id)
    : null;

  const periodComparison = latestVersion
    ? reportFactoryService.getDecisionPackPeriodComparison(COMPANY_ID, latestVersion.version_id)
    : null;

  const safegTk = koraIndex ? safeguardToken(koraIndex.safeguard_status) : null;
  const latestSt = latestVersion ? statusToken(latestVersion.status) : null;

  return (
    <div className="space-y-6">

      {/* ── 1. PageMasthead ─────────────────────────────────────────────────── */}
      <PageMasthead
        eyebrow={`Decision Pack · ${activeScenario} · ${companyName}`}
        title="Report direzionali"
        subline="Output board-ready per HR, Finance, ESG e board. Evidenze strutturate, attivazione e raccomandazioni in formato decisionale."
        meta="Foundation Light v0.1 · pre_empirical_calibration · dati sintetici demo"
      />
      <DecisionContext
        question="Quali output portare al board, agli advisor ESG e alle funzioni HR e Finance?"
        boundary="Foundation Light v0.1 · pre_empirical_calibration · non certificativo · dati sintetici"
      />

      {/* ── 2. Executive Output Reading ─────────────────────────────────────── */}
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem 1.5rem' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginBottom: 8 }}>
          Lettura direzionale — non certificativa
        </p>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.7 }}>
          KORA converte dati aggregati, KORA Index, Confidence Score, Safeguard e raccomandazioni in output direzionali.
          Il Decision Pack è un supporto informativo per il confronto interno — non una certificazione ESG, non un report regolatorio automatico,
          non un&apos;attestazione pubblica.
          Serve a HR, finance, ESG e board per leggere e discutere l&apos;attivazione umana dell&apos;organizzazione.
        </p>
      </div>

      {/* ── 3. Primary Decision Pack Card — deliverable principale ──────────── */}
      <div
        style={{
          background:   TOKENS.surface,
          border:       `1px solid ${TOKENS.accent}44`,
          borderLeft:   `4px solid ${TOKENS.accent}`,
          borderRadius: TOKENS.cardRadius,
          padding:      '1.5rem',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.accent, marginBottom: 4 }}>
              KORA Decision Pack · Foundation Light v0.1
            </p>
            <p style={{ fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, color: "var(--kora-ink)", fontSize: '1.5rem', letterSpacing: '-0.015em', lineHeight: 1.15 }}>
              {companyName}
            </p>
            <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, marginTop: 4 }}>
              Output direzionale company-scoped · Foundation Light v0.1 · pre-empirical calibration
            </p>
          </div>
          {latestVersion && latestSt && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint }}>{latestVersion.version_id}</p>
              <span style={{ display: 'inline-block', marginTop: 4, fontSize: '11px', fontWeight: 500, background: latestSt.bg, color: latestSt.text, borderRadius: 4, padding: '3px 9px' }}>
                {STATUS_LABELS[latestVersion.status]}
              </span>
            </div>
          )}
        </div>

        {/* KI / CS / Safeguard */}
        {hasFullReport && koraIndex ? (
          <div className="grid grid-cols-1 gap-4 mb-5 sm:grid-cols-3">
            <div style={{ background: TOKENS.inkBorder, borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 6 }}>KORA Index v3</p>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2.5rem', color: TOKENS.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {koraIndex.kora_index_value}
              </p>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 4 }}>/100</p>
            </div>
            <div style={{ background: `${TOKENS.accent}08`, border: `1px solid ${TOKENS.accent}22`, borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 6 }}>Confidence Score</p>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2.5rem', color: TOKENS.accent, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {(koraIndex.confidence_score * 100).toFixed(0)}%
              </p>
              <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 4 }}>indicatore esterno · peso 0</p>
            </div>
            {safegTk && (
              <div style={{ background: safegTk.bg, border: `1px solid ${safegTk.dot}44`, borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: safegTk.text, opacity: 0.75, marginBottom: 6 }}>Activation Safeguard</p>
                <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.75rem', color: safegTk.text, lineHeight: 1 }}>
                  {safeguardLabel(koraIndex.safeguard_status)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: TOKENS.safeguard.watch.bg, border: `1px solid ${TOKENS.safeguard.watch.dot}44`, borderRadius: 10, padding: '1rem', marginBottom: 20 }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.safeguard.watch.text }}>KORA Index non disponibile</p>
            <p style={{ fontSize: '11px', color: TOKENS.safeguard.watch.text, opacity: 0.85, marginTop: 4 }}>{factoryStatus.next_action}</p>
          </div>
        )}

        {/* Metadata governance */}
        <div className="flex flex-wrap gap-4 pb-5" style={{ borderBottom: TOKENS.cardBorder, marginBottom: 20 }}>
          {pack && <span style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint }}>{pack.methodology_version}</span>}
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.safeguard.watch.text }}>pre_empirical_calibration</span>
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.safeguard.cap.text }}>production_ready: false</span>
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint }}>synthetic_demo_data: true</span>
          {pack && <span style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint }}>{pack.period}</span>}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/company/reports/board-pack"
            style={{ borderRadius: 6, background: TOKENS.ink, padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'none' }}
          >
            Apri Board Pack Preview →
          </Link>
          <span style={{ fontSize: '11px', color: TOKENS.inkHint }}>
            Stampa/salva come PDF da browser · Export automatico non attivo in Foundation Light
          </span>
        </div>
      </div>

      {/* ── 4. Stato Decision Pack ──────────────────────────────────────────── */}
      <SectionLabel>Stato Decision Pack</SectionLabel>
      <div
        style={{
          background:   TOKENS.safeguard.watch.bg,
          border:       `1px solid ${TOKENS.safeguard.watch.dot}44`,
          borderRadius: TOKENS.cardRadius,
          padding:      '1rem 1.25rem',
          display:      'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}
      >
        <div>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.safeguard.watch.text, marginBottom: 4 }}>
            Stato Decision Pack
          </p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.safeguard.watch.text }}>
            Bozza disponibile — revisione advisor richiesta
          </p>
          {factoryStatus.warnings.length > 0 && (
            <p style={{ fontSize: '12px', color: TOKENS.safeguard.watch.text, opacity: 0.85, marginTop: 4 }}>{factoryStatus.warnings[0]}</p>
          )}
        </div>
        <div className="flex gap-2 items-center flex-wrap shrink-0">
          <span style={{ fontSize: '11px', fontWeight: 600, background: TOKENS.surface, color: TOKENS.safeguard.watch.text, borderRadius: 4, padding: '4px 10px', border: `1px solid ${TOKENS.safeguard.watch.dot}44` }}>
            {versionHistory.length} {versionHistory.length === 1 ? 'versione' : 'versioni'}
          </span>
          <Link
            href="/company/reports/board-pack"
            style={{ borderRadius: 6, background: TOKENS.ink, padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Board Pack Preview →
          </Link>
        </div>
      </div>

      {/* ── 5. Version Timeline ─────────────────────────────────────────────── */}
      {versionHistory.length > 0 && (
        <>
          <SectionLabel>Cronologia versioni · {versionHistory.length} {versionHistory.length === 1 ? 'versione' : 'versioni'}</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            {versionHistory.map((version, idx) => (
              <VersionCard key={version.version_id} version={version} isLatest={idx === 0} />
            ))}
          </div>
          {changeSummary && changeSummary.main_changes.length > 0 && (
            <div style={{ background: TOKENS.safeguard.pass.bg, border: `1px solid ${TOKENS.safeguard.pass.dot}44`, borderRadius: TOKENS.cardRadius, padding: '1rem 1.25rem' }}>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.safeguard.pass.text, marginBottom: 8 }}>
                Variazioni v1 → v2
              </p>
              {changeSummary.main_changes.map((c, i) => (
                <p key={i} style={{ fontSize: '12px', color: TOKENS.safeguard.pass.text, lineHeight: 1.6 }}>· {c}</p>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── 6. Period Comparison ────────────────────────────────────────────── */}
      {periodComparison && (
        <>
          <SectionLabel>Confronto semestrale</SectionLabel>
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
            <PeriodComparisonSection comparison={periodComparison} />
          </div>
        </>
      )}

      {/* ── 7. No-data state ────────────────────────────────────────────────── */}
      {!hasFullReport && (
        <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '3rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: TOKENS.ink }}>Decision Pack non ancora disponibile</p>
          <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, maxWidth: '36rem', margin: '8px auto 0', lineHeight: 1.65 }}>
            Il Decision Pack sarà generato quando data intake, validazione e scoring readiness saranno completati.
          </p>
          {factoryStatus.blocking_reasons.length > 0 && (
            <div style={{ textAlign: 'left', maxWidth: '36rem', margin: '16px auto 0' }}>
              {factoryStatus.blocking_reasons.map((r, i) => (
                <p key={i} style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>· {r}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 8. Chapter Navigation (print:hidden) ────────────────────────────── */}
      {hasFullReport && (
        <>
          <SectionLabel>Sezioni Decision Pack</SectionLabel>
          <div className="overflow-x-auto print:hidden">
            <div className="flex gap-2 min-w-max pb-1">
              {SECTION_NAV.map((nav) => (
                <a
                  key={nav.id}
                  href={`#${nav.id}`}
                  style={{
                    borderRadius: 6, border: TOKENS.cardBorder, background: TOKENS.surface,
                    padding: '6px 14px', fontSize: '11.5px', fontWeight: 500, color: TOKENS.inkSecondary,
                    textDecoration: 'none', whiteSpace: 'nowrap', transition: 'border-color 0.15s',
                  }}
                >
                  {nav.label}
                </a>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── 9. Export & Distribuzione ───────────────────────────────────────── */}
      <SectionLabel>Export & distribuzione</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
        <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65, marginBottom: 14 }}>
          Il Board Pack Preview è disponibile come documento stampabile PDF-ready.
          Export PDF automatico non attivo in Foundation Light — usare il browser per Salva come PDF.
        </p>
        <Link
          href="/company/reports/board-pack"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 6, background: TOKENS.ink, padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'none', marginBottom: 16 }}
        >
          Apri Board Pack Preview →
          <span style={{ fontWeight: 400, fontSize: '10px', color: 'rgba(244,241,233,0.60)' }}>
            Scarica/stampa da browser · Export PDF automatico non attivo in Foundation Light
          </span>
        </Link>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {exportActions.map((action) => (
            <div
              key={action.action_id ?? action.label}
              style={{
                borderRadius: TOKENS.cardRadius,
                border: action.enabled ? `1px solid ${TOKENS.accent}33` : TOKENS.cardBorder,
                background: action.enabled ? `${TOKENS.accent}08` : TOKENS.inkBorder,
                padding: '0.875rem',
                textAlign: 'center',
                opacity: action.enabled ? 1 : 0.6,
              }}
            >
              <p style={{ fontSize: '12px', fontWeight: 500, color: TOKENS.ink }}>{action.label}</p>
              {action.future_capability && (
                <span style={{ display: 'inline-block', marginTop: 6, fontSize: '9px', fontWeight: 700, background: TOKENS.inkBorder, color: TOKENS.inkSecondary, borderRadius: 9999, padding: '2px 7px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  In arrivo
                </span>
              )}
              {!action.future_capability && !action.enabled && (
                <span style={{ display: 'inline-block', marginTop: 6, fontSize: '9px', fontWeight: 700, background: TOKENS.inkBorder, color: TOKENS.inkHint, borderRadius: 9999, padding: '2px 7px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Demo
                </span>
              )}
              {action.reason_disabled && (
                <p style={{ fontSize: '9px', color: TOKENS.inkHint, marginTop: 4, lineHeight: 1.5 }}>{action.reason_disabled}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 10. Report body — 8 sezioni canoniche ───────────────────────────── */}
      {hasFullReport && pack && (
        <div style={{ borderTop: `2px solid ${TOKENS.ink}`, paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Section 1: Executive Summary */}
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

          {/* Section 2: KORA Index v3 */}
          {sectionMap.kora_index_v3 && (
            <>
              <SectionBlock section={sectionMap.kora_index_v3}>
                <KoraIndexHero output={pack.kora_index_output} />
                <ComponentBreakdown components={pack.kora_index_output.components} />
                <InsightList insights={sectionMap.kora_index_v3.insights} />
                <RecList recommendations={sectionMap.kora_index_v3.recommendations} />
              </SectionBlock>
              {sectionMap.dynamic_scoring_preview && (
                <details
                  style={{ borderRadius: TOKENS.cardRadius, border: TOKENS.cardBorder, background: TOKENS.inkBorder, padding: '0.875rem 1rem', marginTop: 8 }}
                >
                  <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-jakarta)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint, userSelect: 'none' }}>
                    Technical Preview / Methodology Debug — Non sostituisce il KORA Index v3
                  </summary>
                  <div style={{ marginTop: 12, background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: 6, padding: '10px 12px', fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p>calculation_mode: {pack.dynamic_preview.calculation_mode}</p>
                    <p>production_ready: false · official_index_source: {pack.dynamic_preview.official_index_source}</p>
                    <p>Preview Score: {pack.dynamic_preview.dynamic_preview_score}/100 · Canonical KORA Index: {pack.dynamic_preview.canonical_kora_index}/100 · Δ: {pack.dynamic_preview.delta_vs_canonical >= 0 ? '+' : ''}{pack.dynamic_preview.delta_vs_canonical}</p>
                    <p style={{ fontStyle: 'italic', color: TOKENS.inkHint, opacity: 0.6 }}>Low confidence technical preview · Non è il KORA Index ufficiale · Not production-ready</p>
                  </div>
                </details>
              )}
              <SectionDivider />
            </>
          )}

          {/* Section 3: Activation & Workforce */}
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

          {/* Section 4: Budget-to-Human-Impact */}
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
                  <div style={{ marginTop: 12, background: TOKENS.inkBorder, borderRadius: 8, padding: '0.875rem 1rem' }}>
                    <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 8 }}>
                      {sectionMap.economic_relief.title}
                    </p>
                    <p style={{ fontSize: '12px', color: TOKENS.inkSecondary }}>{sectionMap.economic_relief.summary}</p>
                    <InsightList insights={sectionMap.economic_relief.insights} />
                  </div>
                )}
              </SectionBlock>
              <SectionDivider />
            </>
          )}

          {/* Section 5: Eligibility Gate */}
          {sectionMap.eligibility_gate && (
            <>
              <SectionBlock section={sectionMap.eligibility_gate}>
                <EligibilitySummaryReport summary={pack.eligibility_gate} />
                <InsightList insights={sectionMap.eligibility_gate.insights} />
              </SectionBlock>
              <SectionDivider />
            </>
          )}

          {/* Section 6: Pillar Balance — ink ramp */}
          {sectionMap.pillar_analysis && (
            <>
              <div id="pillar_analysis" className="scroll-mt-24" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', background: TOKENS.inkBorder, color: TOKENS.inkSecondary, borderRadius: 4, padding: '2px 6px' }}>pillar_analysis</span>
                  </div>
                  <h3 style={{ fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, color: "var(--kora-ink)", fontSize: '1.25rem', letterSpacing: '-0.01em', marginTop: 4 }}>Pillar Balance</h3>
                  <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, marginTop: 2 }}>Distribuzione aggregata aziendale · dati sintetici demo canonici</p>
                </div>
                <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {CANONICAL_PILLAR_AGGREGATE.map(({ pillar, share }, rank) => (
                    <div key={pillar} className="flex items-center gap-3">
                      <span style={{ width: 96, fontSize: '12px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, color: TOKENS.ink }}>{pillar}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 9999, background: TOKENS.inkTrack, overflow: 'hidden' }}>
                        <div style={{ height: 6, borderRadius: 9999, width: `${share}%`, background: PILLAR_RAMP[rank] ?? PILLAR_RAMP[4] }} />
                      </div>
                      <span style={{ fontSize: '12px', fontFamily: 'var(--font-jakarta)', fontWeight: 600, color: TOKENS.inkSecondary, width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {share}%
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>
                  Aggregato aziendale canonico Q1–Q3 2025 · Dati sintetici demo · Valori IU batch demo esclusi da questa vista.
                </p>
                <RecList recommendations={sectionMap.pillar_analysis.recommendations} />
              </div>
              <SectionDivider />
            </>
          )}

          {/* Section 7: Raccomandazioni + Piano 90gg */}
          {sectionMap.recommendations && (
            <>
              <SectionBlock section={sectionMap.recommendations}>
                <RecList recommendations={sectionMap.recommendations.recommendations} />
                {sectionMap.ninety_day_action_plan && (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint }}>
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

          {/* Section 8: Metodologia & Confini */}
          {sectionMap.methodology_boundaries && (
            <SectionBlock section={sectionMap.methodology_boundaries} />
          )}

          <PrivacyBoundaryNote />
        </div>
      )}

      {/* ── 11. Confini metodologici — leggibili, tono istituzionale ─────────── */}
      <SectionLabel>Confini metodologici e perimetro informativo</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginBottom: 12 }}>
          Decision Pack misura l&apos;organizzazione, non gli individui.
        </p>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            'Dati sintetici demo — non rappresentativi della situazione reale dell\'azienda.',
            'Foundation Light v0.1 · pre_empirical_calibration — output direzionale, non certificazione pubblica o attestazione regolatoria.',
            'Confidence Score: indicatore esterno di affidabilità dati, peso = 0 nel KORA Index v3. Non è una componente del punteggio.',
            'Correlazione ≠ causalità — tutti i segnali KORA sono associativi, non predittivi.',
            'KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.',
          ].map((note) => (
            <li key={note} style={{ display: 'flex', gap: 8, fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>
              <span style={{ flexShrink: 0, color: TOKENS.inkHint, marginTop: 2 }}>·</span>
              {note}
            </li>
          ))}
        </ul>
        {limitations.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: TOKENS.cardBorder }}>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 8 }}>
              Limitazioni specifiche
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {limitations.slice(0, 6).map((l, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
                  <span style={{ flexShrink: 0, color: TOKENS.inkHint }}>·</span>{l}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── 12. ProvenanceFooter ─────────────────────────────────────────────── */}
      <ProvenanceFooter
        methodologyVersionId={pack?.methodology_version ?? 'KORA Methodology v0.1'}
        calibrationStatus="pre_empirical_calibration"
        reportingPeriod={pack?.period ?? activeScenario}
      />

    </div>
  );
}
