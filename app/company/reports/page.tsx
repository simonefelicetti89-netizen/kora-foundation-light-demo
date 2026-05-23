'use client';

import { useDemoState } from '@/lib/demo-state';
import { reportGeneratorService } from '@/services/report-generator/ReportGeneratorService';
import { DecisionPackHero } from '@/components/reports/DecisionPackHero';
import { EligibilitySummaryReport } from '@/components/reports/EligibilitySummaryReport';
import { BudgetImpactReport } from '@/components/reports/BudgetImpactReport';
import { ActionPlanReport } from '@/components/reports/ActionPlanReport';
import { PrivacyBoundaryNote } from '@/components/reports/PrivacyBoundaryNote';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { ComponentBreakdown } from '@/components/kora-index/ComponentBreakdown';
import { ActivationSafeguardPanel } from '@/components/kora-index/ActivationSafeguardPanel';
import type { DecisionPackSection, DecisionPackMetric, DecisionPackInsight, DecisionPackRecommendation, DecisionPackStatus } from '@/lib/types';

const COMPANY_ID = 'meridiana-group';

// ── Section navigation config ──────────────────────────────────────────────────

const SECTION_NAV = [
  { id: 'cover',                    label: 'A · Cover' },
  { id: 'executive_summary',        label: 'B · Executive' },
  { id: 'kora_index_v3',            label: 'C · KORA Index' },
  { id: 'dynamic_scoring_preview',  label: 'D · Preview' },
  { id: 'eligibility_gate',         label: 'E · Eligibility' },
  { id: 'budget_to_human_impact',   label: 'F · BTI' },
  { id: 'economic_relief',          label: 'G · Relief' },
  { id: 'uef_review_data_quality',  label: 'H · UEF' },
  { id: 'people_context_hr_kpi',    label: 'I · People' },
  { id: 'workforce_activation',     label: 'J · Workforce' },
  { id: 'pillar_analysis',          label: 'K · Pillar' },
  { id: 'recommendations',          label: 'L · Rec.' },
  { id: 'ninety_day_action_plan',   label: 'M · 90gg' },
  { id: 'methodology_boundaries',   label: 'N · Metod.' },
];

// ── Status display ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<DecisionPackStatus, string> = {
  draft:                   'Bozza',
  data_review_required:    'Dati in revisione',
  advisor_review_required: 'Revisione advisor consigliata',
  ready:                   'Pronto',
  exported:                'Esportato',
  archived:                'Archiviato',
};

const STATUS_STYLES: Record<DecisionPackStatus, string> = {
  data_review_required:    'bg-rose-50 text-rose-700 border-rose-200',
  advisor_review_required: 'bg-amber-50 text-amber-700 border-amber-200',
  ready:                   'bg-emerald-50 text-emerald-700 border-emerald-200',
  draft:                   'bg-slate-50 text-slate-600 border-slate-200',
  exported:                'bg-indigo-50 text-indigo-700 border-indigo-200',
  archived:                'bg-slate-50 text-slate-500 border-slate-200',
};

// ── Generic section renderer ───────────────────────────────────────────────────

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
            <p className={`text-[11px] font-medium ${m.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_TAG[rec.priority]}`}>
                {rec.priority}
              </span>
              <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">
                {rec.horizon}
              </span>
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
      <div className="flex items-start gap-3">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
              {section.code}
            </span>
            {section.audience.map((a) => (
              <span key={a} className="rounded bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-600">
                {a}
              </span>
            ))}
          </div>
          <h3 className="text-base font-bold text-slate-900">{section.title}</h3>
          {section.subtitle && (
            <p className="text-xs text-slate-500">{section.subtitle}</p>
          )}
        </div>
      </div>
      {section.summary && (
        <p className="text-sm text-slate-600 leading-relaxed">{section.summary}</p>
      )}
      {children ?? (
        <>
          <MetricGrid metrics={section.metrics} />
          <InsightList insights={section.insights} />
          <RecList recommendations={section.recommendations} />
        </>
      )}
      {section.limitations.length > 0 && (
        <div className="rounded bg-slate-50 border border-slate-100 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Limiti</p>
          <ul className="space-y-1">
            {section.limitations.filter(Boolean).map((l, i) => (
              <li key={i} className="flex gap-1.5 text-[11px] text-slate-500">
                <span className="text-slate-300 shrink-0">·</span>
                {l}
              </li>
            ))}
          </ul>
        </div>
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

// ── Page ─────────────────────────────────────────────────────────────────────

// C-07: Reports — KORA Company Decision Pack
export default function Reports() {
  const { activeScenario } = useDemoState();

  const pack = reportGeneratorService.getCurrentCompanyDecisionPack(COMPANY_ID, activeScenario);
  const sectionMap = Object.fromEntries(pack.sections.map((s) => [s.code, s]));

  const safeguardExp = pack.explanation?.safeguard_explanation;

  return (
    <div className="space-y-8 max-w-4xl">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">KORA Company Decision Pack</h1>
        <p className="text-sm text-slate-500 mt-1">
          Report diagnostico unificato — {pack.company_name} · {pack.period}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Dati sintetici demo
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-500">
            {pack.methodology_version}
          </span>
          <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[pack.status]}`}>
            {STATUS_LABELS[pack.status]}
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-rose-100 bg-rose-50 px-2 py-0.5 text-[11px] font-mono text-rose-600">
            production_ready: false
          </span>
        </div>
      </div>

      {/* ── Section navigation ── */}
      <div className="overflow-x-auto -mx-4 px-4 print:hidden">
        <div className="flex gap-1.5 min-w-max pb-1">
          {SECTION_NAV.map((nav) => (
            <a
              key={nav.id}
              href={`#${nav.id}`}
              className="rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors whitespace-nowrap"
            >
              {nav.label}
            </a>
          ))}
        </div>
      </div>

      {/* ── Export actions ── */}
      <div className="flex flex-wrap gap-2 items-center print:hidden">
        {pack.export_actions.map((action) => (
          <button
            key={action.label}
            disabled={action.disabled}
            title={action.note}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed opacity-60"
          >
            {action.label}
            <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
              demo
            </span>
          </button>
        ))}
      </div>

      {/* ── A: Cover ── */}
      {sectionMap.cover && (
        <SectionBlock section={sectionMap.cover} />
      )}

      <SectionDivider />

      {/* ── B: Executive Summary ── */}
      {sectionMap.executive_summary && (
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
      )}

      <SectionDivider />

      {/* ── C: KORA Index v3 ── */}
      {sectionMap.kora_index_v3 && (
        <SectionBlock section={sectionMap.kora_index_v3}>
          <KoraIndexHero output={pack.kora_index_output} />
          <ComponentBreakdown components={pack.kora_index_output.components} />
          <InsightList insights={sectionMap.kora_index_v3.insights} />
          <RecList recommendations={sectionMap.kora_index_v3.recommendations} />
          {sectionMap.kora_index_v3.limitations.length > 0 && (
            <div className="rounded bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Limiti</p>
              <ul className="space-y-1">
                {sectionMap.kora_index_v3.limitations.filter(Boolean).map((l, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] text-slate-500">
                    <span className="text-slate-300 shrink-0">·</span>{l}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionBlock>
      )}

      <SectionDivider />

      {/* ── D: Dynamic Scoring Preview ── */}
      {sectionMap.dynamic_scoring_preview && (
        <SectionBlock section={sectionMap.dynamic_scoring_preview}>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-1">
            <p className="font-bold">calculation_mode: {pack.dynamic_preview.calculation_mode}</p>
            <p>production_ready: false · official_index_source: {pack.dynamic_preview.official_index_source}</p>
            <p>Preview Score: <strong>{pack.dynamic_preview.dynamic_preview_score}</strong>/100 · Canonical: <strong>{pack.dynamic_preview.canonical_kora_index}</strong>/100 · Delta: {pack.dynamic_preview.delta_vs_canonical >= 0 ? '+' : ''}{pack.dynamic_preview.delta_vs_canonical}</p>
          </div>
          <MetricGrid metrics={sectionMap.dynamic_scoring_preview.metrics} />
          <InsightList insights={sectionMap.dynamic_scoring_preview.insights} />
          {sectionMap.dynamic_scoring_preview.limitations.length > 0 && (
            <div className="rounded bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Limiti</p>
              <ul className="space-y-1">
                {sectionMap.dynamic_scoring_preview.limitations.filter(Boolean).map((l, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] text-slate-500">
                    <span className="text-slate-300 shrink-0">·</span>{l}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionBlock>
      )}

      <SectionDivider />

      {/* ── E: Eligibility Gate ── */}
      {sectionMap.eligibility_gate && (
        <SectionBlock section={sectionMap.eligibility_gate}>
          <EligibilitySummaryReport summary={pack.eligibility_gate} />
          <InsightList insights={sectionMap.eligibility_gate.insights} />
        </SectionBlock>
      )}

      <SectionDivider />

      {/* ── F: Budget-to-Human-Impact ── */}
      {sectionMap.budget_to_human_impact && (
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
        </SectionBlock>
      )}

      <SectionDivider />

      {/* ── G: Economic Relief ── */}
      {sectionMap.economic_relief && (
        <SectionBlock section={sectionMap.economic_relief} />
      )}

      <SectionDivider />

      {/* ── H: UEF Review & Data Quality ── */}
      {sectionMap.uef_review_data_quality && (
        <SectionBlock section={sectionMap.uef_review_data_quality} />
      )}

      <SectionDivider />

      {/* ── I: People Context & HR KPI ── */}
      {sectionMap.people_context_hr_kpi && (
        <SectionBlock section={sectionMap.people_context_hr_kpi} />
      )}

      <SectionDivider />

      {/* ── J: Workforce Activation ── */}
      {sectionMap.workforce_activation && (
        <SectionBlock section={sectionMap.workforce_activation}>
          <ActivationSafeguardPanel
            result={pack.activation_safeguard}
            explanation={safeguardExp}
          />
          <MetricGrid metrics={sectionMap.workforce_activation.metrics} />
          <InsightList insights={sectionMap.workforce_activation.insights} />
          <RecList recommendations={sectionMap.workforce_activation.recommendations} />
        </SectionBlock>
      )}

      <SectionDivider />

      {/* ── K: Pillar Analysis ── */}
      {sectionMap.pillar_analysis && (
        <SectionBlock section={sectionMap.pillar_analysis} />
      )}

      <SectionDivider />

      {/* ── L: Recommendations ── */}
      {sectionMap.recommendations && (
        <SectionBlock section={sectionMap.recommendations}>
          <RecList recommendations={sectionMap.recommendations.recommendations} />
          {sectionMap.recommendations.limitations.length > 0 && (
            <div className="rounded bg-slate-50 border border-slate-100 px-3 py-2.5">
              <ul className="space-y-1">
                {sectionMap.recommendations.limitations.map((l, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] text-slate-500">
                    <span className="text-slate-300 shrink-0">·</span>{l}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionBlock>
      )}

      <SectionDivider />

      {/* ── M: 90-Day Action Plan ── */}
      {sectionMap.ninety_day_action_plan && (
        <SectionBlock section={sectionMap.ninety_day_action_plan}>
          <ActionPlanReport
            s1Record={pack.bti_record_s1 ?? undefined}
            s2Record={pack.bti_record_s2 ?? undefined}
            recommendations={pack.bti_recommendations}
            eligibilityGate={pack.eligibility_gate}
          />
          <RecList recommendations={sectionMap.ninety_day_action_plan.recommendations} />
        </SectionBlock>
      )}

      <SectionDivider />

      {/* ── N: Methodology & Boundaries ── */}
      {sectionMap.methodology_boundaries && (
        <SectionBlock section={sectionMap.methodology_boundaries} />
      )}

      {/* ── Privacy boundary ── */}
      <PrivacyBoundaryNote />

      {/* ── Version history ── */}
      <div className="border-t border-slate-200 pt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Versioni Report</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-600">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-1.5 pr-4 font-semibold text-slate-400">ID</th>
                <th className="text-left py-1.5 pr-4 font-semibold text-slate-400">Periodo</th>
                <th className="text-left py-1.5 pr-4 font-semibold text-slate-400">Stato</th>
                <th className="text-left py-1.5 pr-4 font-semibold text-slate-400">CS</th>
                <th className="text-left py-1.5 pr-4 font-semibold text-slate-400">Advisor</th>
                <th className="text-left py-1.5 font-semibold text-slate-400">Generato</th>
              </tr>
            </thead>
            <tbody>
              {pack.version_history.map((v) => (
                <tr key={v.version_id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 pr-4 font-mono text-[11px] text-slate-500">{v.version_id}</td>
                  <td className="py-2 pr-4">{v.period}</td>
                  <td className="py-2 pr-4">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[v.status]}`}>
                      {STATUS_LABELS[v.status]}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{Math.round(v.confidence_score * 100)}%</td>
                  <td className="py-2 pr-4">{v.advisor_review_status}</td>
                  <td className="py-2 text-slate-400">{new Date(v.created_at).toLocaleDateString('it-IT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pack limitations ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-500 mb-2">Limiti del Report</p>
        <ul className="space-y-1.5">
          {pack.limitations.map((l, i) => (
            <li key={i} className="flex gap-1.5 text-[11px] text-slate-500 leading-relaxed">
              <span className="text-slate-300 shrink-0 mt-0.5">·</span>
              {l}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
