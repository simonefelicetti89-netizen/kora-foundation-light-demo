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
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontWeight:    600,
        fontSize:      '10.5px',
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color:         TOKENS.inkHint,
        paddingTop:    '0.5rem',
        paddingBottom: '6px',
        marginBottom:  '4px',
        borderBottom:  `1px solid ${TOKENS.inkBorder}`,
      }}
    >
      {children}
    </p>
  );
}
