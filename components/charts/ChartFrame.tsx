'use client';

import { useState } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface ChartFrameProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  id?: string;
}

export function ChartFrame({ title, subtitle, badge, children, className, hover = false, id }: ChartFrameProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      id={id}
      className={`${className ?? ''}${id ? ' scroll-mt-6' : ''}`}
      style={{
        background:   TOKENS.surface,
        border:       hover && hovered ? TOKENS.cardBorderHover : TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
        boxShadow:    hover && hovered ? TOKENS.cardShadowHover : TOKENS.cardShadow,
        padding:      '1.5rem',
        transition:   hover ? 'all 180ms ease' : undefined,
      }}
      onMouseEnter={() => hover && setHovered(true)}
      onMouseLeave={() => hover && setHovered(false)}
    >
      {(title || subtitle || badge) && (
        <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            {title && (
              <p
                className="font-kora-sans text-kora-ink"
                style={{ fontSize: '1.05rem', letterSpacing: '-0.01em', lineHeight: 1.25 }}
              >
                {title}
              </p>
            )}
            {subtitle && (
              <p
                style={{
                  fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                  fontSize:   '11px',
                  color:      TOKENS.inkSecondary,
                  lineHeight: 1.45,
                  marginTop:  subtitle && title ? 4 : 0,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {badge && (
            <span style={{
              borderRadius:  999,
              padding:       '3px 10px',
              background:    TOKENS.inkBorder,
              color:         TOKENS.inkHint,
              border:        TOKENS.cardBorder,
              fontSize:      '9px',
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:    600,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              flexShrink:    0,
              marginTop:     2,
            }}>
              {badge}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
