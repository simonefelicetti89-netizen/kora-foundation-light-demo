'use client';

import { useScenario } from '@/lib/demo-state';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { ComponentBreakdown } from '@/components/kora-index/ComponentBreakdown';
import { ComponentBreakdownChart } from '@/components/charts/ComponentBreakdownChart';
import { ActivationSafeguardPanel } from '@/components/kora-index/ActivationSafeguardPanel';
import { ConfidenceBreakdown } from '@/components/kora-index/ConfidenceBreakdown';
import { ExplainabilityPanel } from '@/components/kora-index/ExplainabilityPanel';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';

// C-02: KORA Index Detail
export default function KoraIndexDetail() {
  const { activeScenario } = useScenario();

  const output       = scoringSimulatorService.score('meridiana-group', activeScenario, '2025');
  const safeguard    = scoringSimulatorService.getActivationSafeguard('meridiana-group', activeScenario);
  const confidence   = scoringSimulatorService.getConfidenceRecord('meridiana-group', activeScenario);
  const explanation  = explainabilityService.getExplanation('meridiana-group', activeScenario);
  const weakCodes    = (explanation?.weak_components ?? []).map((c) => c.code);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">KORA Index Detail</h1>
        <p className="text-sm text-slate-500">
          Meridiana Group S.r.l. — {output.reporting_period}
        </p>
      </div>

      {/* KORA Index Hero — CS + Safeguard + Calibration non-suppressible */}
      <KoraIndexHero output={output} />

      {/* Component chart + 10-component grid */}
      <ComponentBreakdownChart components={output.components} weakCodes={weakCodes} />
      <ComponentBreakdown components={output.components} />

      {/* Safeguard + Confidence panels side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivationSafeguardPanel
          result={safeguard}
          explanation={explanation?.safeguard_explanation}
        />
        <ConfidenceBreakdown record={confidence} />
      </div>

      {/* Explainability — full text explanation, weak/strong, next actions, limitations */}
      <ExplainabilityPanel record={explanation} />
    </div>
  );
}
