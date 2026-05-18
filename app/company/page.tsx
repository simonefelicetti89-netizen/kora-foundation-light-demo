'use client';

import { useRole, useScenario } from '@/lib/demo-state';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { ComponentBreakdown } from '@/components/kora-index/ComponentBreakdown';
import { PillarChart } from '@/components/charts/PillarChart';
import { WarningCard } from '@/components/cards/WarningCard';
import { NextActionCard } from '@/components/cards/NextActionCard';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';
import type { PillarCode } from '@/lib/types';

function MetricTile({ label, value, code }: { label: string; value: string; code: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      <p className="text-xs font-mono text-slate-400 mt-0.5">{code}</p>
    </div>
  );
}

function pct(val: number) {
  return `${(val * 100).toFixed(0)}%`;
}

// C-01: Executive Cockpit — 6 widget groups
export default function ExecutiveCockpit() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();

  const output    = scoringSimulatorService.score('meridiana-group', activeScenario, '2025');
  const aggregate = scoringSimulatorService.getCompanyAggregate('meridiana-group', activeScenario);
  const warnings  = explainabilityService.getWarnings('meridiana-group', activeScenario);
  const actions   = explainabilityService.getNextBestActions('meridiana-group', activeScenario);

  const pillarData = aggregate?.pillar_distribution as Partial<Record<PillarCode, number>> | undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Executive Cockpit</h1>
        <p className="text-sm text-slate-500">
          Meridiana Group S.r.l. — {output.reporting_period}
        </p>
      </div>

      {/* Widget 1: KORA Index Hero (CS + Safeguard + Calibration non-suppressible) */}
      <KoraIndexHero output={output} />

      {/* Widget 2: Activation Summary */}
      {aggregate && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Activation Summary
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile label="Activation Rate"        value={pct(aggregate.activation_rate)}             code="AR"  />
            <MetricTile label="Meaningful Activation"  value={pct(aggregate.meaningful_activation_rate)}  code="MAR" />
            <MetricTile label="Continuity Rate"        value={pct(aggregate.continuity_rate)}             code="CO"  />
            <MetricTile label="Verification Rate"      value={pct(aggregate.verification_rate)}           code="VR"  />
          </div>
        </div>
      )}

      {/* Widget 3 & 4: Pillar Distribution + Component Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PillarChart data={pillarData} />
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            10-Component Breakdown
          </h2>
          <ComponentBreakdown components={output.components} />
        </div>
      </div>

      {/* Widget 5 & 6: Warnings + Next Actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Key Warnings
          </h2>
          {warnings.length > 0 ? (
            <div className="space-y-2">
              {warnings.map((w) => (
                <WarningCard key={w.code} warning={w} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
              No critical warnings for this scenario.
            </p>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Recommended Actions
          </h2>
          {actions.length > 0 ? (
            <div className="space-y-2">
              {actions.slice(0, 3).map((a) => (
                <NextActionCard key={a.priority} action={a} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
              No actions available for this scenario.
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Role: {activeRole} — Scenario: {activeScenario}
      </p>
    </div>
  );
}
