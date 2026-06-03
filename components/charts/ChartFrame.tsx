'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';

interface ChartFrameProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartFrame({ title, subtitle, children, className }: ChartFrameProps) {
  return (
    <div
      className={className}
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
        boxShadow:    TOKENS.cardShadow,
        padding:      '1.5rem',
      }}
    >
      {title && (
        <p
          className="font-kora-serif text-kora-ink mb-0.5"
          style={{ fontSize: '1.0625rem', letterSpacing: '-0.01em', lineHeight: 1.25 }}
        >
          {title}
        </p>
      )}
      {subtitle && (
        <p
          className="mb-4"
          style={{
            fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:   '11px',
            color:      TOKENS.inkSecondary,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      )}
      {!subtitle && title && <div style={{ height: '0.75rem' }} />}
      {children}
    </div>
  );
}
