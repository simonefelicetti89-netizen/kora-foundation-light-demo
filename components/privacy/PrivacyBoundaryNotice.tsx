'use client';

import { cn } from '@/lib/utils';
import type { PrivacySuppressReason } from '@/lib/types';
import { SAFE_AGGREGATION_THRESHOLD } from '@/lib/constants/kora';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface PrivacyBoundaryNoticeProps {
  reason: PrivacySuppressReason;
  dataType?: string;
  groupSize?: number;
  className?: string;
}

const REASON_MESSAGES: Record<PrivacySuppressReason, string> = {
  employer_role:            'Questo dato appartiene al layer personale del lavoratore. I ruoli aziendali non hanno accesso ai record individuali.',
  group_too_small:          `Questo segmento ha meno di ${SAFE_AGGREGATION_THRESHOLD} lavoratori — dato soppresso per prevenire la re-identificazione.`,
  insufficient_permission:  'Il ruolo attivo non ha accesso a questo dato.',
  worker_consent_required:  'Il consenso del lavoratore è richiesto prima che questo dato possa essere condiviso.',
};

// Suppression must never be silent — always renders this notice, never empty.
export function PrivacyBoundaryNotice({ reason, dataType, groupSize, className }: PrivacyBoundaryNoticeProps) {
  const message = reason === 'group_too_small' && groupSize !== undefined
    ? `Questo segmento contiene ${groupSize} lavorator${groupSize === 1 ? 'e' : 'i'}, sotto la soglia minima di ${SAFE_AGGREGATION_THRESHOLD}. Dato soppresso per prevenire la re-identificazione.`
    : REASON_MESSAGES[reason];

  return (
    <div
      className={cn(className)}
      role="status"
      aria-label="Privacy boundary notice"
      style={{
        borderRadius: 12,
        border:       `1px solid ${TOKENS.inkBorderStrong}`,
        background:   TOKENS.taupe,
        padding:      '14px 18px',
        display:      'flex',
        alignItems:   'flex-start',
        gap:          12,
      }}
    >
      {/* Lock icon */}
      <div style={{
        width:           28,
        height:          28,
        borderRadius:    '50%',
        background:      TOKENS.inkBorder,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
        marginTop:       1,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TOKENS.inkSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{
          fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight: 600,
          fontSize:   '11.5px',
          color:      TOKENS.ink,
          marginBottom: 4,
        }}>
          Privacy Boundary
        </p>
        <p style={{
          fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:   '11.5px',
          color:      TOKENS.inkSecondary,
          lineHeight: 1.5,
        }}>
          {message}
        </p>
        {dataType && (
          <p style={{
            fontFamily:  'ui-monospace, monospace',
            fontSize:    '10px',
            color:       TOKENS.inkHint,
            marginTop:   6,
            letterSpacing: '0.02em',
          }}>
            tipo: {dataType}
          </p>
        )}
      </div>
    </div>
  );
}
