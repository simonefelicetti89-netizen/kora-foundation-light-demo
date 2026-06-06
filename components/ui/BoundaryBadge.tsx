'use client';
// BoundaryBadge — persistent inline label for LIVE / DEMO / PREVIEW / FUTURE VISION.
// B80-B: every major page surface shows one of these badges near the page title.
// Use variant="dark" on dark header backgrounds, variant="light" on white/cream surfaces.

import type { BoundaryMode } from '@/lib/platform-boundaries';
import { BOUNDARY_LABEL, BOUNDARY_DESCRIPTION, BOUNDARY_BADGE_STYLE_DARK, BOUNDARY_BADGE_STYLE_LIGHT } from '@/lib/platform-boundaries';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

interface BoundaryBadgeProps {
  mode:       BoundaryMode;
  variant?:   'dark' | 'light';
  suffix?:    string;              // e.g. "· Meridiana" or "· dati sintetici"
  className?: string;
  style?:     React.CSSProperties;
}

export function BoundaryBadge({ mode, variant = 'light', suffix, className, style: styleProp }: BoundaryBadgeProps) {
  const style = variant === 'dark' ? BOUNDARY_BADGE_STYLE_DARK[mode] : BOUNDARY_BADGE_STYLE_LIGHT[mode];
  const label = BOUNDARY_LABEL[mode];

  return (
    <span
      className={className}
      title={BOUNDARY_DESCRIPTION[mode]}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        borderRadius:  4,
        padding:       '2px 7px',
        fontSize:      '9px',
        fontWeight:    700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        fontFamily:    FONT,
        whiteSpace:    'nowrap',
        ...style,
        ...styleProp,
      }}
    >
      {label}{suffix ? ` ${suffix}` : ''}
    </span>
  );
}
