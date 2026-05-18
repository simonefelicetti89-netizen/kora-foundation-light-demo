'use client';

import { cn } from '@/lib/utils';
import { KORA_INDEX_COMPONENTS, COMPONENT_LABELS } from '@/lib/constants/kora';
import type { KoraIndexComponent } from '@/lib/types';
import { formatPercentage } from '@/lib/formatters';

interface ComponentBreakdownProps {
  components?: KoraIndexComponent[];
  className?: string;
}

// Always renders all 10 KORA Index components — values may be placeholder in Phase 0
export function ComponentBreakdown({ components, className }: ComponentBreakdownProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-5', className)}>
      {KORA_INDEX_COMPONENTS.map((code) => {
        const comp = components?.find((c) => c.code === code);
        const value = comp?.value ?? null;
        const weight = comp?.weight ?? null;

        return (
          <div key={code} className="rounded-md border border-slate-100 bg-white p-3 text-center shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{code}</div>
            <div className="mt-1 text-lg font-bold text-slate-800">
              {value !== null ? formatPercentage(value) : '—'}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">{COMPONENT_LABELS[code]}</div>
            <div className="mt-1 text-xs text-slate-300">w: {weight !== null ? formatPercentage(weight) : '—'}</div>
          </div>
        );
      })}
    </div>
  );
}
