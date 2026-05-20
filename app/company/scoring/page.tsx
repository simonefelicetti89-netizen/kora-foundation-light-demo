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
        Pipeline simulata: IU → PIB → Aggregazione Aziendale → Activation Safeguard → KORA Index.
      </p>
      <KoraIndexHero output={output} />
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
        Traccia formula e parametri di esecuzione — Fase 1
      </div>
    </div>
  );
}
