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
    </div>
  );
}
