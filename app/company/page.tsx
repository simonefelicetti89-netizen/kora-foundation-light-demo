'use client';

import { useRole, useScenario } from '@/lib/demo-state';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { ComponentBreakdown } from '@/components/kora-index/ComponentBreakdown';
import { ExplainabilityPanel } from '@/components/kora-index/ExplainabilityPanel';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';

// C-01: Executive Cockpit
export default function ExecutiveCockpit() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();
  const output = scoringSimulatorService.score('meridiana-group', activeScenario, '2025');
  const explanation = explainabilityService.getExplanation('meridiana-group', activeScenario);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Executive Cockpit</h1>
        <p className="text-sm text-slate-500">Meridiana Group S.r.l. — {output.reporting_period}</p>
      </div>
      <KoraIndexHero output={output} />
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-600 uppercase tracking-wide">
          10-Component Breakdown
        </h2>
        <ComponentBreakdown components={output.components} />
      </div>
      <ExplainabilityPanel record={explanation} />
      <p className="text-xs text-slate-400">Role: {activeRole} — Scenario: {activeScenario}</p>
    </div>
  );
}
