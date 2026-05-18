'use client';

import { cn } from '@/lib/utils';
import { formatCalibrationStatus } from '@/lib/formatters';

interface MethodologyLabelProps {
  methodologyVersionId: string;
  calibrationStatus: string;
  className?: string;
}

// Non-suppressible per doc 21b — required on every KORA Index surface
export function MethodologyLabel({ methodologyVersionId, calibrationStatus, className }: MethodologyLabelProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs text-slate-500', className)}>
      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono">{methodologyVersionId}</span>
      <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700 border border-amber-200">
        {formatCalibrationStatus(calibrationStatus)}
      </span>
    </div>
  );
}
