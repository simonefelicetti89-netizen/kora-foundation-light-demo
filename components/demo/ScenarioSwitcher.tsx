'use client';

import { useScenario } from '@/lib/demo-state';
import { scenarioService } from '@/services/scenario/ScenarioService';
import { cn } from '@/lib/utils';
import type { ScenarioId } from '@/lib/types';

const SCENARIO_LABELS: Record<string, string> = {
  S1: 'Baseline',
  S2: 'Miglioramento',
};

const SAFEGUARD_ACTIVE: Record<string, string> = {
  CLEAR:   'bg-green-50 text-green-900 border-green-200 ring-1 ring-green-300',
  WARNING: 'bg-amber-50 text-amber-900 border-amber-200 ring-1 ring-amber-300',
  FLAGGED: 'bg-red-50 text-red-900 border-red-200 ring-1 ring-red-300',
};

const SAFEGUARD_BADGE: Record<string, string> = {
  CLEAR:   'border-green-200 bg-green-100 text-green-700',
  WARNING: 'border-amber-200 bg-amber-100 text-amber-700',
  FLAGGED: 'border-red-200 bg-red-100 text-red-700',
};

export function ScenarioSwitcher() {
  const { activeScenario, setScenario } = useScenario();
  const scenarios = scenarioService.listScenarios();

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 select-none whitespace-nowrap">
        Scenario
      </span>
      <div className="flex rounded-md border border-slate-200 overflow-hidden shadow-sm">
        {scenarios.map((s, i) => {
          const isActive = activeScenario === s.id;
          const label = SCENARIO_LABELS[s.id] ?? s.id;
          return (
            <button
              key={s.id}
              onClick={() => setScenario(s.id as ScenarioId)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors',
                i > 0 && 'border-l border-slate-200',
                isActive
                  ? SAFEGUARD_ACTIVE[s.safeguard_status] ?? 'bg-slate-100 text-slate-800 ring-1 ring-slate-300'
                  : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600',
              )}
              aria-pressed={isActive}
              title={s.narrative}
            >
              <span className={cn('font-bold', isActive ? '' : 'font-medium')}>{s.id}</span>
              <span className={cn('hidden sm:inline', isActive ? 'font-medium' : 'font-normal')}>
                {label}
              </span>
              <span className={cn(
                'rounded border px-1 py-0.5 text-[9px] font-semibold',
                isActive
                  ? SAFEGUARD_BADGE[s.safeguard_status] ?? 'border-slate-200 bg-white text-slate-600'
                  : 'border-slate-100 bg-slate-50 text-slate-300',
              )}>
                {s.safeguard_status}
              </span>
              <span className={cn('font-semibold tabular-nums', isActive ? 'text-inherit' : 'text-slate-300')}>
                {s.kora_index_value}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
