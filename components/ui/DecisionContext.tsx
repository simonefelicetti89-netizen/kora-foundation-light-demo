'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';

interface DecisionContextProps {
  question: string;
  boundary?: string;
  className?: string;
}

// DecisionContext — appears below PageMasthead on every analytical page.
// Answers "what decision does this page support?" in one sentence.
// boundary (optional): what is outside scope, confidence, or methodology.
export function DecisionContext({ question, boundary, className }: DecisionContextProps) {
  return (
    <div
      className={className}
      style={{
        borderLeft:    `3px solid ${TOKENS.accent}`,
        paddingLeft:   14,
        marginBottom:  24,
        marginTop:     -8,
        display:       'flex',
        flexDirection: 'column',
        gap:           4,
      }}
    >
      <p style={{
        fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontSize:    '13px',
        fontWeight:  500,
        color:       TOKENS.inkSecondary,
        lineHeight:  1.45,
        fontStyle:   'italic',
      }}>
        {question}
      </p>
      {boundary && (
        <p style={{
          fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:    '11px',
          color:       TOKENS.inkHint,
          lineHeight:  1.4,
        }}>
          Perimetro: {boundary}
        </p>
      )}
    </div>
  );
}
