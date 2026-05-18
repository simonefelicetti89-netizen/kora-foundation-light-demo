'use client';

// Phase 0 scaffold — full chart implementation in Phase 1
import { cn } from '@/lib/utils';
import { PILLAR_CODES, PILLAR_LABELS } from '@/lib/constants/kora';
import type { PillarCode } from '@/lib/types';

interface PillarChartProps {
  data?: Partial<Record<PillarCode, number>>;
  className?: string;
}

export function PillarChart({ data, className }: PillarChartProps) {
  return (
    <div className={cn('rounded-md border border-slate-100 bg-white p-4', className)}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Pillar Distribution
      </p>
      <div className="space-y-2">
        {PILLAR_CODES.map((code) => {
          const value = data?.[code] ?? null;
          const pct = value !== null ? Math.round(value * 100) : null;
          return (
            <div key={code} className="flex items-center gap-3">
              <span className="w-20 text-xs text-slate-500">{PILLAR_LABELS[code]}</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-300"
                  style={{ width: pct !== null ? `${pct}%` : '0%' }}
                />
              </div>
              <span className="w-8 text-right text-xs text-slate-400">
                {pct !== null ? `${pct}%` : '—'}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-300">Chart implementation — Phase 1</p>
    </div>
  );
}
