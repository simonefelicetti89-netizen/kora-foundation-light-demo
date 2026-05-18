'use client';

import { useScenario } from '@/lib/demo-state';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';

// C-06: Scoring Run
export default function ScoringRun() {
  const { activeScenario } = useScenario();
  const output = scoringSimulatorService.score('meridiana-group', activeScenario, '2025');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Scoring Run</h1>
      <p className="text-sm text-slate-500">
        Simulated IU → PIB → Company Aggregation → Activation Safeguard → KORA Index pipeline.
      </p>
      <KoraIndexHero output={output} />
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
        Formula trace and run parameters — Phase 1
      </div>
    </div>
  );
}
