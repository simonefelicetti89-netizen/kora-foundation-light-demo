'use client';

// Phase 0 scaffold — full chart implementation in Phase 1
import { cn } from '@/lib/utils';
import { KORA_INDEX_COMPONENTS, COMPONENT_LABELS } from '@/lib/constants/kora';
import type { KoraIndexComponent } from '@/lib/types';

interface ComponentBreakdownChartProps {
  components?: KoraIndexComponent[];
  className?: string;
}

export function ComponentBreakdownChart({ components, className }: ComponentBreakdownChartProps) {
  return (
    <div className={cn('rounded-md border border-slate-100 bg-white p-4', className)}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Component Breakdown
      </p>
      <div className="space-y-2">
        {KORA_INDEX_COMPONENTS.map((code) => {
          const comp = components?.find((c) => c.code === code);
          const pct = comp?.value !== undefined ? Math.round(comp.value * 100) : null;
          return (
            <div key={code} className="flex items-center gap-3">
              <span className="w-8 text-xs font-semibold text-slate-500">{code}</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-blue-200"
                  style={{ width: pct !== null ? `${pct}%` : '0%' }}
                />
              </div>
              <span className="w-10 text-right text-xs text-slate-400">
                {pct !== null ? `${pct}%` : '—'}
              </span>
              <span className="hidden w-32 text-xs text-slate-300 sm:block">
                {COMPONENT_LABELS[code]}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-300">Chart implementation — Phase 1</p>
    </div>
  );
}
