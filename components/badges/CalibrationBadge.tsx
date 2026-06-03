'use client';

import { cn } from '@/lib/utils';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { formatCalibrationStatus } from '@/lib/formatters';

interface CalibrationBadgeProps {
  status: string;
  className?: string;
}

// Non-suppressible per doc 21b — every KORA Index surface must show this.
export function CalibrationBadge({ status, className }: CalibrationBadgeProps) {
  return (
    <span
      className={cn(className)}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        borderRadius:  999,
        padding:       '4px 10px',
        fontSize:      '11px',
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontWeight:    600,
        background:    TOKENS.safeguard.watch.bg,   // was rgba(217,154,43,0.12)
        color:         TOKENS.safeguard.watch.text,  // was '#8A5A00'
        border:        `1px solid ${TOKENS.safeguard.watch.dot}48`,  // was 0.30 fixed
        letterSpacing: '0.01em',
      }}
    >
      {formatCalibrationStatus(status)}
    </span>
  );
}
