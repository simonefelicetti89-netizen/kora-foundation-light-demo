'use client';

import { cn } from '@/lib/utils';
import { formatCalibrationStatus } from '@/lib/formatters';

interface CalibrationBadgeProps {
  status: string;
  className?: string;
}

// Non-suppressible per doc 21b — every KORA Index surface must show this
export function CalibrationBadge({ status, className }: CalibrationBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        'bg-amber-100 text-amber-800 border border-amber-300',
        className,
      )}
    >
      {formatCalibrationStatus(status)}
    </span>
  );
}
