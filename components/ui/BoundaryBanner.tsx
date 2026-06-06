'use client';
// BoundaryBanner — hard boundary banner for dual-path pages.
// B80-B: shows above core metrics on pages that serve both LIVE and DEMO data.
// Must be visible, not just eyebrow text.

import { BOUNDARY_BANNER_STYLE } from '@/lib/platform-boundaries';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

interface BoundaryBannerProps {
  isLive: boolean;
  liveLabel?:  string;
  demoLabel?:  string;
  className?:  string;
}

export function BoundaryBanner({
  isLive,
  liveLabel = 'Stai visualizzando dati live del tenant autenticato. Nessun fallback demo è attivo.',
  demoLabel = 'Stai visualizzando dati sintetici dimostrativi. Nessun dato reale aziendale è caricato.',
}: BoundaryBannerProps) {
  const style = BOUNDARY_BANNER_STYLE[isLive ? 'LIVE' : 'DEMO'];

  return (
    <div
      role="status"
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          8,
        borderRadius: 6,
        border:       `1px solid ${style.borderColor}`,
        background:   style.background,
        color:        style.color,
        padding:      '8px 14px',
        marginBottom: 20,
        fontFamily:   FONT,
        fontSize:     '11px',
        lineHeight:   1.5,
      }}
    >
      <span
        style={{
          flexShrink:    0,
          borderRadius:  3,
          padding:       '1px 5px',
          fontSize:      '8.5px',
          fontWeight:    700,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          background:    isLive ? 'rgba(22,101,52,0.12)' : 'rgba(146,64,14,0.10)',
          border:        `1px solid ${style.borderColor}`,
          color:         style.color,
        }}
      >
        {isLive ? 'LIVE' : 'DEMO'}
      </span>
      <span>{isLive ? liveLabel : demoLabel}</span>
    </div>
  );
}
