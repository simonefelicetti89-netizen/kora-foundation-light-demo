'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface KPICardProps {
  label: ReactNode;
  value: string | number;
  code?: string;
  period?: string;
  source?: string;
  status?: 'positive' | 'warning' | 'critical' | 'neutral';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  badge?: string;
  detailHref?: string;
  important?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATUS_STYLES = {
  positive: { dot: TOKENS.success,   text: TOKENS.success  },
  warning:  { dot: TOKENS.warning,   text: TOKENS.warning  },
  critical: { dot: TOKENS.critical,  text: TOKENS.critical },
  neutral:  { dot: TOKENS.inkHint,   text: TOKENS.inkHint  },
};

const TREND_ICON  = { up: '↑', down: '↓', stable: '→' };
const TREND_COLOR = {
  up:     TOKENS.success,
  down:   TOKENS.critical,
  stable: TOKENS.inkTertiary,
};

const VALUE_SIZE = {
  sm: '28px',
  md: '36px',
  lg: '48px',
};

export function KPICard({
  label, value, code, period, source, status, trend, trendValue,
  badge, detailHref, important = false, size = 'md', className = '',
}: KPICardProps) {
  const [hovered, setHovered] = useState(false);

  const cardStyle: React.CSSProperties = {
    background:   TOKENS.surface,
    border:       hovered && important
      ? TOKENS.cardBorderHover
      : TOKENS.cardBorder,
    borderRadius: TOKENS.cardRadius,
    boxShadow:    hovered && important
      ? TOKENS.cardShadowHover
      : TOKENS.cardShadow,
    padding:      '20px 22px',
    transition:   'all 180ms ease',
    transform:    hovered && important ? 'translateY(-2px)' : 'none',
    cursor:       detailHref ? 'pointer' : 'default',
    display:      'flex',
    flexDirection: 'column',
    gap:          8,
  };

  const content = (
    <div
      className={className}
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Code + badge row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {code && (
          <p style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:    600,
            fontSize:      '10px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color:         TOKENS.accent,
          }}>
            {code}
          </p>
        )}
        {badge && (
          <span style={{
            background:   TOKENS.inkBorder,
            color:        TOKENS.inkHint,
            border:       TOKENS.cardBorder,
            borderRadius: 999,
            padding:      '2px 8px',
            fontSize:     '9px',
            fontWeight:   600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
          }}>
            {badge}
          </span>
        )}
        {status && !badge && (
          <span style={{
            width:        6,
            height:       6,
            borderRadius: '50%',
            background:   STATUS_STYLES[status].dot,
            flexShrink:   0,
          }} />
        )}
      </div>

      {/* Value */}
      <p style={{
        fontFamily:         'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontWeight:         700,
        fontSize:           VALUE_SIZE[size],
        color:              TOKENS.ink,
        letterSpacing:      '-0.025em',
        lineHeight:         1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
        {trend && (
          <span style={{
            fontSize:    VALUE_SIZE[size] === '48px' ? '18px' : '14px',
            marginLeft:  6,
            color:       TREND_COLOR[trend],
            fontWeight:  600,
          }}>
            {TREND_ICON[trend]}{trendValue ? ` ${trendValue}` : ''}
          </span>
        )}
      </p>

      {/* Label */}
      <p style={{
        fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontSize:    '12px',
        fontWeight:  500,
        color:       TOKENS.inkSecondary,
        lineHeight:  1.35,
      }}>
        {label}
      </p>

      {/* Period / source */}
      {(period || source) && (
        <p style={{
          fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:    '10px',
          color:       TOKENS.inkHint,
          letterSpacing: '0.02em',
        }}>
          {[period, source].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Detail affordance */}
      {detailHref && (
        <p style={{
          fontSize:    '11px',
          fontWeight:  600,
          color:       hovered ? TOKENS.accent : TOKENS.inkHint,
          transition:  'color 150ms ease',
          marginTop:   2,
        }}>
          Vedi dettaglio →
        </p>
      )}
    </div>
  );

  return detailHref ? (
    <Link href={detailHref} style={{ textDecoration: 'none' }}>
      {content}
    </Link>
  ) : content;
}
