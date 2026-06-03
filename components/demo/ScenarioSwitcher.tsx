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
  CLEAR:   'bg-green-50 text-green-900 border-[rgba(47,125,85,0.22)] ring-1 ring-green-300',
  WARNING: 'bg-[rgba(217,154,43,0.08)] text-amber-900 border-[rgba(217,154,43,0.25)] ring-1 ring-amber-300',
  FLAGGED: 'bg-[rgba(158,59,47,0.06)] text-red-900 border-[rgba(158,59,47,0.22)] ring-1 ring-red-300',
};

const SAFEGUARD_BADGE: Record<string, string> = {
  CLEAR:   'border-[rgba(47,125,85,0.22)] bg-green-100 text-green-700',
  WARNING: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.12)] text-amber-700',
  FLAGGED: 'border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.10)] text-[#9E3B2F]',
};

export function ScenarioSwitcher() {
  const { activeScenario, setScenario } = useScenario();
  const scenarios = scenarioService.listScenarios();

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold uppercase tracking-widest text-[rgba(6,3,43,0.40)] select-none whitespace-nowrap">
        Scenario
      </span>
      <div className="flex rounded-md border border-[rgba(6,3,43,0.08)] overflow-hidden shadow-sm">
        {scenarios.map((s, i) => {
          const isActive = activeScenario === s.id;
          const label = SCENARIO_LABELS[s.id] ?? s.id;
          return (
            <button
              key={s.id}
              onClick={() => setScenario(s.id as ScenarioId)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors',
                i > 0 && 'border-l border-[rgba(6,3,43,0.08)]',
                isActive
                  ? SAFEGUARD_ACTIVE[s.safeguard_status] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.90)] ring-1 ring-slate-300'
                  : 'bg-[#F8F6F1] text-[rgba(6,3,43,0.40)] hover:bg-[rgba(6,3,43,0.03)] hover:text-[rgba(6,3,43,0.62)]',
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
                  ? SAFEGUARD_BADGE[s.safeguard_status] ?? 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.62)]'
                  : 'border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.28)]',
              )}>
                {s.safeguard_status}
              </span>
              <span className={cn('font-semibold tabular-nums', isActive ? 'text-inherit' : 'text-[rgba(6,3,43,0.28)]')}>
                {s.kora_index_value}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
