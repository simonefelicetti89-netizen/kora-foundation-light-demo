'use client';

import type { ReactNode } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface SectionDividerProps {
  children?: ReactNode;
  label?: string;
  topMargin?: number;
  bottomMargin?: number;
}

// Horizontal section separator with optional label.
// Creates visual breathing room between analytical sections.
export function SectionDivider({ children, label, topMargin = 32, bottomMargin = 24 }: SectionDividerProps) {
  return (
    <div
      style={{
        marginTop:    topMargin,
        marginBottom: bottomMargin,
        paddingTop:   topMargin,
        borderTop:    `1px solid ${TOKENS.inkBorder}`,
      }}
    >
      {(label || children) && (
        <p style={{
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight:    600,
          fontSize:      '10px',
          letterSpacing: '0.09em',
          textTransform: 'uppercase' as const,
          color:         TOKENS.inkHint,
          marginBottom:  16,
        }}>
          {label ?? children}
        </p>
      )}
    </div>
  );
}
