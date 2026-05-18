'use client';

import { useScenario } from '@/lib/demo-state';
import { scenarioService } from '@/services/scenario/ScenarioService';
import type { ScenarioId } from '@/lib/types';

export function ScenarioSwitcher() {
  const { activeScenario, setScenario } = useScenario();
  const scenarios = scenarioService.listScenarios();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        SCENARIO
      </span>
      <select
        value={activeScenario}
        onChange={(e) => setScenario(e.target.value as ScenarioId)}
        className="rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        aria-label="Switch demo scenario"
      >
        {scenarios.map((s) => (
          <option key={s.id} value={s.id}>
            {s.id}: {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
