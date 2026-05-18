'use client';

import { useRole, useScenario } from '@/lib/demo-state';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { ComponentBreakdown } from '@/components/kora-index/ComponentBreakdown';
import { PillarChart } from '@/components/charts/PillarChart';
import { WarningCard } from '@/components/cards/WarningCard';
import { NextActionCard } from '@/components/cards/NextActionCard';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';
import { cn } from '@/lib/utils';
import type { PillarCode } from '@/lib/types';

function MetricTile({ label, value, code, description }: { label: string; value: string; code: string; description?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      <p className="text-xs font-mono text-slate-400 mt-0.5">{code}</p>
      {description && (
        <p className="text-xs text-slate-400 mt-1.5 leading-snug border-t border-slate-100 pt-1.5 text-left">
          {description}
        </p>
      )}
    </div>
  );
}

function InsightTile({
  label, labelColor, title, body,
}: {
  label: string; labelColor: string; title: string; body: string;
}) {
  return (
    <div className={cn('rounded border p-3', labelColor)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 opacity-70">{label}</p>
      <p className="text-sm font-semibold text-slate-800 leading-snug">{title}</p>
      <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-3">{body}</p>
    </div>
  );
}

function pct(val: number) {
  return `${(val * 100).toFixed(0)}%`;
}

// C-01: Executive Cockpit
export default function ExecutiveCockpit() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();

  const output      = scoringSimulatorService.score('meridiana-group', activeScenario, '2025');
  const aggregate   = scoringSimulatorService.getCompanyAggregate('meridiana-group', activeScenario);
  const warnings    = explainabilityService.getWarnings('meridiana-group', activeScenario);
  const actions     = explainabilityService.getNextBestActions('meridiana-group', activeScenario);
  const weakComps   = explainabilityService.getTopWeakComponents('meridiana-group', activeScenario);
  const strongComps = explainabilityService.getTopStrongComponents('meridiana-group', activeScenario);

  const pillarData = aggregate?.pillar_distribution as Partial<Record<PillarCode, number>> | undefined;

  const mainWeakness = weakComps[0];
  const mainStrength = strongComps[0];
  const nextAction   = actions[0];

  return (
    <div className="space-y-6">

      {/* Narrative framing block */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <h1 className="text-xl font-bold text-slate-900">Organizational Activation Snapshot</h1>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-2xl">
          This cockpit shows where Meridiana&apos;s initiatives are activating the organization,
          where participation is weak or concentrated, and which actions will improve the KORA Index.
        </p>

        {/* 3 insight tiles */}
        {(mainWeakness || mainStrength || nextAction) && (
          <div className="grid gap-3 mt-4 sm:grid-cols-3">
            {mainWeakness && (
              <InsightTile
                label="Current weakness"
                labelColor="border-rose-200 bg-rose-50"
                title={`${mainWeakness.label} (${(mainWeakness.value * 100).toFixed(0)}%)`}
                body={mainWeakness.explanation}
              />
            )}
            {mainStrength && (
              <InsightTile
                label="Relative strength"
                labelColor="border-green-200 bg-green-50"
                title={`${mainStrength.label} (${(mainStrength.value * 100).toFixed(0)}%)`}
                body={mainStrength.explanation}
              />
            )}
            {nextAction && (
              <InsightTile
                label="Next priority"
                labelColor="border-blue-200 bg-blue-50"
                title={nextAction.action}
                body={nextAction.detail}
              />
            )}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200">
          The employer sees aggregate organizational intelligence only.
          Individual My KORA, PIB and Dynamic Impact CV remain worker-owned and employer-invisible.
        </p>
      </div>

      {/* KORA Index Hero (CS + Safeguard + Calibration non-suppressible) */}
      <KoraIndexHero output={output} />

      {/* Activation Summary */}
      {aggregate && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Activation Summary
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile label="Activation Rate"        value={pct(aggregate.activation_rate)}             code="AR"  description="Share of workforce with at least one approved impact unit." />
            <MetricTile label="Meaningful Activation"  value={pct(aggregate.meaningful_activation_rate)}  code="MAR" description="Share exceeding the materiality threshold — not just nominal." />
            <MetricTile label="Continuity Rate"        value={pct(aggregate.continuity_rate)}             code="CO"  description="Workers engaged across multiple reporting periods." />
            <MetricTile label="Verification Rate"      value={pct(aggregate.verification_rate)}           code="VR"  description="Activity backed by verified or partially verified evidence." />
          </div>
        </div>
      )}

      {/* Pillar Distribution + Component Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PillarChart data={pillarData} />
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            10-Component Breakdown
          </h2>
          <ComponentBreakdown components={output.components} />
        </div>
      </div>

      {/* Warnings + Next Actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Key Signals
          </h2>
          {warnings.length > 0 ? (
            <div className="space-y-2">
              {warnings.map((w) => (
                <WarningCard key={w.code} warning={w} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
              No critical signals for this scenario.
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
        Role: {activeRole} · Scenario: {activeScenario} · {output.reporting_period}
      </p>
    </div>
  );
}
