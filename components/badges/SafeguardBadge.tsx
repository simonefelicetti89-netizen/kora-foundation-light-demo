'use client';

import { cn } from '@/lib/utils';
import type { SafeguardStatus } from '@/lib/types';

interface SafeguardBadgeProps {
  status: SafeguardStatus;
  className?: string;
}

const SAFEGUARD_STYLES: Record<SafeguardStatus, string> = {
  CLEAR:   'bg-kora-fun-green text-kora-cosmic-blue border-kora-fun-green',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  FLAGGED: 'bg-red-100 text-red-800 border-red-300',
};

export function SafeguardBadge({ status, className }: SafeguardBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold border',
        SAFEGUARD_STYLES[status],
        className,
      )}
    >
      Activation Safeguard: {status}
    </span>
  );
}
