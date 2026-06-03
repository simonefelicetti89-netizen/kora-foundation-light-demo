'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';

interface MethodologyBadgeProps {
  versionId:         string;
  calibrationStatus: string;
  period?:           string;
  privacyThreshold?: string;
  showSynthetic?:    boolean;
  variant?:          'inline' | 'footer' | 'strip';
}

// Non-suppressible per doc 21b. Appears on every KORA Index surface.
// variant='strip' for a full-width bar, 'footer' for page footer, 'inline' for inline badge.
export function MethodologyBadge({
  versionId, calibrationStatus, period, privacyThreshold = 'N≥10', showSynthetic = true, variant = 'footer',
}: MethodologyBadgeProps) {

  if (variant === 'inline') {
    return (
      <span
        style={{
          display:       'inline-flex',
          alignItems:    'center',
          gap:           6,
          borderRadius:  999,
          padding:       '3px 10px',
          background:    TOKENS.safeguard.watch.bg,
          color:         TOKENS.safeguard.watch.text,
          border:        `1px solid rgba(217,154,43,0.25)`,
          fontSize:      '10px',
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight:    600,
          letterSpacing: '0.02em',
        }}
      >
        {calibrationStatus.replace(/_/g, ' ')} · {versionId}
      </span>
    );
  }

  if (variant === 'strip') {
    return (
      <div
        style={{
          background:   TOKENS.safeguard.watch.bg,
          border:       `1px solid rgba(217,154,43,0.20)`,
          borderRadius: 12,
          padding:      '8px 16px',
          display:      'flex',
          flexWrap:     'wrap',
          gap:          8,
          alignItems:   'center',
        }}
      >
        <span
          style={{
            borderRadius:  999,
            padding:       '2px 8px',
            background:    'rgba(217,154,43,0.20)',
            color:         '#8A5A00',
            fontSize:      '9px',
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
          }}
        >
          {calibrationStatus.replace(/_/g, ' ')}
        </span>
        <span style={{ fontSize: '11px', color: '#8A5A00', fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          {versionId}{period ? ` · ${period}` : ''} · Soglia privacy {privacyThreshold}
          {showSynthetic ? ' · Dati sintetici demo' : ''}
        </span>
      </div>
    );
  }

  // footer
  return (
    <div
      style={{
        paddingTop:  16,
        paddingBottom: 4,
        borderTop:   `1px solid ${TOKENS.inkBorder}`,
        display:     'flex',
        flexWrap:    'wrap',
        gap:         '4px 16px',
        alignItems:  'center',
      }}
    >
      <span
        style={{
          borderRadius:  999,
          padding:       '2px 8px',
          background:    TOKENS.safeguard.watch.bg,
          color:         TOKENS.safeguard.watch.text,
          border:        `1px solid rgba(217,154,43,0.25)`,
          fontSize:      '9.5px',
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight:    600,
        }}
      >
        {calibrationStatus.replace(/_/g, ' ')}
      </span>
      <span style={{
        fontFamily:  'ui-monospace, monospace',
        fontSize:    '10px',
        color:       TOKENS.inkHint,
        letterSpacing: '0.03em',
      }}>
        {versionId}
        {period ? ` · ${period}` : ''}
        {' · '}N≥{privacyThreshold}
        {showSynthetic ? ' · synthetic_demo_data: true' : ''}
      </span>
    </div>
  );
}
