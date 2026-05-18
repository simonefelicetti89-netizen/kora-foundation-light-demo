'use client';

import { useScenario } from '@/lib/demo-state';
import { scenarioService } from '@/services/scenario/ScenarioService';
import { cn } from '@/lib/utils';
import type { ScenarioId } from '@/lib/types';

const SAFEGUARD_PILL: Record<string, string> = {
  CLEAR:   'bg-green-50 text-green-700 border-green-200',
  WARNING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  FLAGGED: 'bg-red-50 text-red-700 border-red-200',
};

export function ScenarioSwitcher() {
  const { activeScenario, setScenario } = useScenario();
  const scenarios = scenarioService.listScenarios();
  const current   = scenarioService.getScenario(activeScenario);

  return (
    <div className="flex flex-col gap-1">
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
              {s.id} — {s.label}
            </option>
          ))}
        </select>
      </div>
      {current.demo_activation_summary && (
        <p className="text-xs text-slate-400 pl-0.5">
          <span
            className={cn(
              'inline rounded border px-1.5 py-0.5 text-xs font-medium mr-1',
              SAFEGUARD_PILL[current.safeguard_status] ?? SAFEGUARD_PILL.WARNING,
            )}
          >
            {current.safeguard_status}
          </span>
          {current.demo_activation_summary}
        </p>
      )}
    </div>
  );
}
