'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface IntelCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  important?: boolean;
  hover?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  scrollMt?: boolean;
}

// Premium analytical card with intentional hover state.
// Use `important` for cards that carry critical intelligence (KORA Index™, BTI™, Safeguard™).
// Use `hover` for cards that should respond to mouse but aren't primary CTAs.
export function IntelCard({
  children, title, subtitle, eyebrow, important = false, hover = false,
  className = '', style = {}, id, scrollMt = false,
}: IntelCardProps) {
  const [hovered, setHovered] = useState(false);
  const interactive = important || hover;

  const cardStyle: React.CSSProperties = {
    background:   TOKENS.surface,
    border:       interactive && hovered ? TOKENS.cardBorderHover : TOKENS.cardBorder,
    borderRadius: TOKENS.cardRadius,
    boxShadow:    interactive && hovered ? TOKENS.cardShadowHover : TOKENS.cardShadow,
    padding:      '24px',
    transition:   'all 180ms ease',
    transform:    important && hovered ? 'translateY(-2px)' : 'none',
    ...style,
  };

  return (
    <div
      id={id}
      className={`${className}${scrollMt ? ' scroll-mt-6' : ''}`}
      style={cardStyle}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
    >
      {(eyebrow || title || subtitle) && (
        <div style={{ marginBottom: 16 }}>
          {eyebrow && (
            <p style={{
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:    600,
              fontSize:      '10px',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color:         TOKENS.accent,
              marginBottom:  8,
            }}>
              {eyebrow}
            </p>
          )}
          {title && (
            <p style={{
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:    700,
              fontSize:      '14px',
              color:         TOKENS.ink,
              letterSpacing: '-0.005em',
              lineHeight:    1.25,
            }}>
              {title}
            </p>
          )}
          {subtitle && (
            <p style={{
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:   '11.5px',
              color:      TOKENS.inkSecondary,
              marginTop:  4,
              lineHeight: 1.45,
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
