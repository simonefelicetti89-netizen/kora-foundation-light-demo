'use client';

import type { SafeguardStatus } from '@/lib/types';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface SafeguardBadgeProps {
  status: SafeguardStatus;
  className?: string;
}

const SAFEGUARD_TOKEN: Record<SafeguardStatus, { bg: string; text: string; border: string }> = {
  CLEAR:   { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40`  },
  WARNING: { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` },
  FLAGGED: { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text,   border: `1px solid ${TOKENS.safeguard.cap.dot}40`   },
};

export function SafeguardBadge({ status, className }: SafeguardBadgeProps) {
  const tk = SAFEGUARD_TOKEN[status] ?? SAFEGUARD_TOKEN['WARNING'];
  return (
    <span
      className={className}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           6,
        borderRadius:  999,
        padding:       '5px 12px',
        fontSize:      '12px',
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontWeight:    600,
        background:    tk.bg,
        color:         tk.text,
        border:        tk.border,
      }}
    >
      <span
        style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          background:   tk.text,
          flexShrink:   0,
        }}
      />
      Activation Safeguard™: {status}
    </span>
  );
}
