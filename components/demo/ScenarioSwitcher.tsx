'use client';

import { useScenario } from '@/lib/demo-state';
import { scenarioService } from '@/services/scenario/ScenarioService';
import { cn } from '@/lib/utils';
import type { ScenarioId } from '@/lib/types';

const SAFEGUARD_ACTIVE: Record<string, string> = {
  CLEAR:   'bg-green-100 text-green-800 border-green-300',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  FLAGGED: 'bg-red-100 text-red-800 border-red-300',
};

const SAFEGUARD_BADGE: Record<string, string> = {
  CLEAR:   'border-green-300 bg-green-50 text-green-700',
  WARNING: 'border-yellow-300 bg-yellow-50 text-yellow-700',
  FLAGGED: 'border-red-300 bg-red-50 text-red-700',
};

export function ScenarioSwitcher() {
  const { activeScenario, setScenario } = useScenario();
  const scenarios = scenarioService.listScenarios();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
        Demo Scenario
      </span>
      <div className="flex rounded-md border border-slate-200 overflow-hidden">
        {scenarios.map((s, i) => {
          const isActive = activeScenario === s.id;
          const cs = s.demo_confidence_score !== undefined
            ? `CS ${Math.round(s.demo_confidence_score * 100)}%`
            : '';
          return (
            <button
              key={s.id}
              onClick={() => setScenario(s.id as ScenarioId)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                i > 0 && 'border-l border-slate-200',
                isActive
                  ? SAFEGUARD_ACTIVE[s.safeguard_status] ?? 'bg-slate-100 text-slate-800 border-slate-300'
                  : 'bg-white text-slate-500 hover:bg-slate-50',
              )}
              aria-pressed={isActive}
              title={s.narrative}
            >
              <span className="font-bold">{s.id}</span>
              <span
                className={cn(
                  'rounded border px-1 py-0.5 text-[10px] font-semibold',
                  isActive
                    ? SAFEGUARD_BADGE[s.safeguard_status] ?? 'border-slate-200 bg-white text-slate-600'
                    : 'border-slate-200 bg-white text-slate-400',
                )}
              >
                {s.safeguard_status}
              </span>
              <span className="font-semibold">{s.kora_index_value}</span>
              {cs && (
                <span className="text-[10px] opacity-70">{cs}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
