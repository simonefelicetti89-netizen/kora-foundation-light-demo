'use client';

import { useScenario } from '@/lib/demo-state';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { ComponentBreakdown } from '@/components/kora-index/ComponentBreakdown';
import { ExplainabilityPanel } from '@/components/kora-index/ExplainabilityPanel';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';

// C-02: KORA Index Detail
export default function KoraIndexDetail() {
  const { activeScenario } = useScenario();
  const output = scoringSimulatorService.score('meridiana-group', activeScenario, '2025');
  const explanation = explainabilityService.getExplanation('meridiana-group', activeScenario);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">KORA Index Detail</h1>
      <KoraIndexHero output={output} />
      <ComponentBreakdown components={output.components} />
      <ExplainabilityPanel record={explanation} />
    </div>
  );
}
