'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p
      className={className}
      style={{
        fontFamily:    'var(--font-inter)',
        fontWeight:    500,
        fontSize:      '11px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color:         TOKENS.inkHint,
        paddingTop:    '0.5rem',
      }}
    >
      {children}
    </p>
  );
}
