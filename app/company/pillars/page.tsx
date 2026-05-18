'use client';

import { useScenario } from '@/lib/demo-state';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { demoDataService } from '@/services/demo-data/DemoDataService';
import { koraContributionService } from '@/services/kora-contribution/KoraContributionService';
import { cn } from '@/lib/utils';
import { PILLAR_CODES, PILLAR_LABELS } from '@/lib/constants/kora';
import type { PillarCode } from '@/lib/types';

const PILLAR_COLORS: Record<PillarCode, string> = {
  LIFE:       'bg-green-500',
  GROWTH:     'bg-blue-500',
  CONNECTION: 'bg-purple-500',
  IMPACT:     'bg-orange-500',
  LEGACY:     'bg-amber-500',
};

const PILLAR_LIGHT: Record<PillarCode, string> = {
  LIFE:       'bg-green-50 border-green-200 text-green-700',
  GROWTH:     'bg-blue-50 border-blue-200 text-blue-700',
  CONNECTION: 'bg-purple-50 border-purple-200 text-purple-700',
  IMPACT:     'bg-orange-50 border-orange-200 text-orange-700',
  LEGACY:     'bg-amber-50 border-amber-200 text-amber-700',
};

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
  planning:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  archived:  'bg-slate-50 text-slate-400 border-slate-200',
};

const VERIFICATION_BADGE: Record<string, string> = {
  verified:     'text-green-600',
  partial:      'text-yellow-600',
  not_started:  'text-slate-400',
};

function pct(val: number) {
  return `${(val * 100).toFixed(0)}%`;
}

function eur(val: number) {
  return `€${val.toLocaleString('it-IT')}`;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  welfare_provider: 'Initiative Provider',
  lms_training:     'Learning Platform',
  esg_initiatives:  'ESG & Impact Initiatives',
  manual_upload:    'Manual Evidence Upload',
  partner_events:   'Partner Evidence Stream',
  hris_population:  'Workforce Population Source',
};

const ADDITIONALITY_BADGE: Record<string, string> = {
  mandatory_legal_minimum:       'bg-rose-50 text-rose-700 border-rose-200',
  additional_beyond_requirement: 'bg-green-50 text-green-700 border-green-200',
  strategic_company_initiative:  'bg-blue-50 text-blue-700 border-blue-200',
  collective_verified_initiative:'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const REVIEW_STATUS_BADGE: Record<string, string> = {
  approved:                   'bg-green-50 text-green-700 border-green-200',
  under_kora_review:          'bg-yellow-50 text-yellow-700 border-yellow-200',
  advisor_review_required:    'bg-orange-50 text-orange-700 border-orange-200',
  partner_validation_required:'bg-purple-50 text-purple-700 border-purple-200',
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  approved:                   'KORA Approved',
  under_kora_review:          'Under KORA Review',
  advisor_review_required:    'Advisor Review Required',
  partner_validation_required:'Partner Validation Required',
};

interface InitiativePreview {
  id: string;
  title: string;
  type: string;
  pillars: string[];
  additionality: string;
  additionality_label: string;
  review_status: string;
  evidence_requirement: string;
  kora_relevance: string;
  economic_contribution: string | null;
  kora_note: string | null;
}

const INITIATIVE_PREVIEW: InitiativePreview[] = [
  {
    id: 'ip-01',
    title: 'Advanced Safety Culture Workshop',
    type: 'Internal Company Initiative',
    pillars: ['LIFE', 'CONNECTION'],
    additionality: 'additional_beyond_requirement',
    additionality_label: 'Beyond legal minimum',
    review_status: 'advisor_review_required',
    evidence_requirement: 'Verified attendance + structured session evidence',
    kora_relevance: 'Improves MAR and CO — meaningful activation with continuity signal across LIFE and CONNECTION',
    economic_contribution: null,
    kora_note: 'KORA rewards additionality. Mandatory legal safety courses receive low activation value — this workshop goes beyond the legal minimum and generates stronger IU.',
  },
  {
    id: 'ip-02',
    title: 'Sustainability Day',
    type: 'Internal Company Initiative',
    pillars: ['IMPACT', 'CONNECTION'],
    additionality: 'strategic_company_initiative',
    additionality_label: 'Strategic initiative',
    review_status: 'under_kora_review',
    evidence_requirement: 'Aggregate participation record + structured activity evidence',
    kora_relevance: 'Addresses IMPACT pillar gap — improves PC (Pillar Coverage) and PB (Pillar Balance)',
    economic_contribution: null,
    kora_note: null,
  },
  {
    id: 'ip-03',
    title: 'Cross-Company Volunteering Initiative',
    type: 'Collective Initiative',
    pillars: ['IMPACT', 'LEGACY', 'CONNECTION'],
    additionality: 'collective_verified_initiative',
    additionality_label: 'Collective — verified',
    review_status: 'partner_validation_required',
    evidence_requirement: 'Partner verification + aggregate participation above threshold',
    kora_relevance: 'High KORA Contribution relevance — cross-company, territorial scope, partner evidence required',
    economic_contribution: 'Co-funding intent declared',
    kora_note: 'KORA Contribution eligible if verified and above participation threshold. Money alone is not impact — economic contribution activates only when paired with verified worker participation.',
  },
  {
    id: 'ip-04',
    title: 'Mandatory Legal Safety Course (D.Lgs. 81/2008)',
    type: 'Compliance Activity',
    pillars: ['LIFE'],
    additionality: 'mandatory_legal_minimum',
    additionality_label: 'Legal minimum',
    review_status: 'approved',
    evidence_requirement: 'Attendance record — evidence context only, no strong IU generation',
    kora_relevance: 'Low activation value. Contributes to Confidence Score as evidence context — not strong KORA Index uplift.',
    economic_contribution: null,
    kora_note: 'KORA rewards additionality, verified activation and distributed participation — not mere compliance. Legal minimum obligations generate minimal activation value.',
  },
];

// C-05: Pillars & Initiatives
export default function PillarsInitiatives() {
  const { activeScenario } = useScenario();

  const aggregate   = scoringSimulatorService.getCompanyAggregate('meridiana-group', activeScenario);
  const programs    = demoDataService.getPrograms('meridiana-group');
  const initiatives = koraContributionService.getCollectiveInitiatives('meridiana-group', activeScenario);

  const pillarDist = aggregate?.pillar_distribution as Partial<Record<PillarCode, number>> | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Pillars & Initiatives</h1>
        <p className="text-sm text-slate-500">
          Meridiana Group S.r.l. — {aggregate?.reporting_period ?? activeScenario}
        </p>
      </div>

      {/* Pillar distribution overview */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Pillar Distribution — Aggregate IU
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          {PILLAR_CODES.map((code) => {
            const val = pillarDist?.[code] ?? 0;
            const barColor = PILLAR_COLORS[code];
            return (
              <div key={code}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">{PILLAR_LABELS[code]}</span>
                  <span className="font-mono font-semibold text-slate-600">{pct(val)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div className={cn('h-2 rounded-full', barColor)} style={{ width: `${val * 100}%` }} />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-slate-400 pt-1">
            Aggregate company-level distribution. No individual worker data.
          </p>
        </div>
      </div>

      {/* Program portfolio */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Program Portfolio
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Program</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Pillar</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Source</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Budget</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">
                  Part. Rate ({activeScenario})
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((prog) => {
                const rate =
                  activeScenario === 'S2'
                    ? prog.expected_participation_rate_s2
                    : prog.expected_participation_rate_s1;
                const allPillars = [...prog.pillars_primary, ...prog.pillars_secondary];
                return (
                  <tr key={prog.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-800">{prog.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{prog.description}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {allPillars.map((p) => (
                          <span
                            key={p}
                            className={cn(
                              'rounded border px-1.5 py-0.5 text-xs font-mono',
                              PILLAR_LIGHT[p as PillarCode] ?? 'bg-slate-100 text-slate-600 border-slate-200',
                            )}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {SOURCE_TYPE_LABELS[prog.source_type] ?? prog.source_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-mono text-slate-700">
                      {eur(prog.budget_eur_approx)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={cn(
                        'text-xs font-semibold',
                        rate >= 0.40 ? 'text-green-600' :
                        rate >= 0.20 ? 'text-yellow-600' : 'text-red-500',
                      )}>
                        {pct(rate)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'rounded border px-1.5 py-0.5 text-xs capitalize',
                        STATUS_BADGE[prog.status] ?? STATUS_BADGE.active,
                      )}>
                        {prog.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Budget figures are informational only. Participation rates are scenario estimates.
        </p>
      </div>

      {/* Collective initiatives */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Collective Initiatives
        </h2>
        {initiatives.length > 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Initiative</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Pillar</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Territory</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Participants</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Verification</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {initiatives.map((init) => {
                  const verifStyle = VERIFICATION_BADGE[init.verification_status] ?? 'text-slate-400';
                  const statusStyle = STATUS_BADGE[init.status] ?? STATUS_BADGE.planning;
                  const pillarStyle = PILLAR_LIGHT[init.pillar as PillarCode] ?? 'bg-slate-100 text-slate-600 border-slate-200';
                  return (
                    <tr key={init.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-800">{init.name}</p>
                        {init.companies_involved.length > 1 && (
                          <p className="text-xs text-indigo-500 mt-0.5">Cross-company</p>
                        )}
                        {init.partner_name && (
                          <p className="text-xs text-slate-400 mt-0.5">Partner: {init.partner_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-xs font-mono', pillarStyle)}>
                          {init.pillar}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{init.territory}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-mono text-slate-700">
                        {init.aggregate_participation_count}
                        <span className="text-slate-400"> / {init.aggregate_target_participants}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('text-xs font-medium capitalize', verifStyle)}>
                          {init.verification_status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-xs capitalize', statusStyle)}>
                          {init.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
            No collective initiatives recorded for this scenario.
          </div>
        )}
        <p className="mt-1.5 text-xs text-slate-400">
          Aggregate participation only. No individual worker data is shown.
        </p>
      </div>

      {/* Initiative Studio Preview */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Initiative Studio
          </h2>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
            Foundation Light Preview
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed max-w-2xl">
          Create, propose or join initiatives that KORA can validate, orchestrate and measure.
          KORA moves from measuring what happened to orchestrating what should happen next.
        </p>

        <div className="space-y-3">
          {INITIATIVE_PREVIEW.map((init) => (
            <div key={init.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              {/* Header row */}
              <div className="flex flex-wrap items-start gap-2">
                <p className="text-sm font-semibold text-slate-800 flex-1 min-w-0">{init.title}</p>
                <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-500 shrink-0">
                  {init.type}
                </span>
                <span className={cn(
                  'rounded border px-1.5 py-0.5 text-xs font-medium shrink-0',
                  REVIEW_STATUS_BADGE[init.review_status] ?? 'bg-slate-50 text-slate-500 border-slate-200',
                )}>
                  {REVIEW_STATUS_LABELS[init.review_status] ?? init.review_status}
                </span>
              </div>

              {/* Pillars + additionality */}
              <div className="flex flex-wrap items-center gap-1.5">
                {init.pillars.map((p) => (
                  <span key={p} className={cn(
                    'rounded border px-1.5 py-0.5 text-xs font-mono',
                    PILLAR_LIGHT[p as PillarCode] ?? 'bg-slate-100 text-slate-600 border-slate-200',
                  )}>
                    {p}
                  </span>
                ))}
                <span className={cn(
                  'rounded border px-1.5 py-0.5 text-xs font-medium',
                  ADDITIONALITY_BADGE[init.additionality] ?? 'bg-slate-50 text-slate-500 border-slate-200',
                )}>
                  {init.additionality_label}
                </span>
              </div>

              {/* Evidence + relevance grid */}
              <div className="grid gap-1.5 sm:grid-cols-2 text-xs">
                <div className="text-slate-600">
                  <span className="font-medium text-slate-400">Evidence required: </span>
                  {init.evidence_requirement}
                </div>
                <div className="text-slate-600">
                  <span className="font-medium text-slate-400">KORA relevance: </span>
                  {init.kora_relevance}
                </div>
                {init.economic_contribution && (
                  <div className="sm:col-span-2 text-slate-600">
                    <span className="font-medium text-slate-400">Economic contribution: </span>
                    <span className="text-indigo-600">{init.economic_contribution}</span>
                    <span className="text-slate-400 ml-1">— governance intent only, not payment execution</span>
                  </div>
                )}
              </div>

              {/* KORA methodology note */}
              {init.kora_note && (
                <div className="rounded border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700 leading-relaxed">
                  {init.kora_note}
                </div>
              )}

              {/* Disabled CTA */}
              <div>
                <button
                  disabled
                  className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 cursor-not-allowed"
                >
                  {init.additionality === 'mandatory_legal_minimum'
                    ? 'Register Compliance Activity — Available in pilot phase'
                    : 'Propose Initiative — Available in pilot phase'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Foundation Light Preview. </span>
            No initiative is submitted, approved, funded or activated from this screen.
            Initiative Studio and KORA orchestration workflows are available in the pilot phase.
          </p>
        </div>
      </div>
    </div>
  );
}
