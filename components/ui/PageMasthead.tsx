'use client';

import type { ReactNode } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface PageMastheadProps {
  eyebrow: string;
  title:   ReactNode;
  subline?: string;
  meta?:    string;
}

// PageMasthead — kept for backward compatibility during migration.
// New code should use PageHeader from components/ui/PageHeader.tsx.
// NOTE: h1 uses font-kora-serif which, after Fase 0 font flip, renders Jakarta.
export function PageMasthead({ eyebrow, title, subline, meta }: PageMastheadProps) {
  return (
    <div className="mb-8">
      <p
        className="uppercase mb-3"
        style={{
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight:    600,
          fontSize:      '11px',
          letterSpacing: '0.09em',
          color:         TOKENS.accent,  // was '#C76F3D' — now token
        }}
      >
        {eyebrow}
      </p>

      {/* Title — font-kora-serif now aliases Jakarta after Fase 0 flip */}
      <h1
        className="font-kora-serif text-kora-ink leading-[1.04]"
        style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', letterSpacing: '-0.02em' }}
      >
        {title}
      </h1>

      {subline && (
        <p
          className="mt-2.5"
          style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:      '15px',
            lineHeight:    1.5,
            color:         TOKENS.inkSecondary,  // was rgba(6,3,43,0.62)
            letterSpacing: '-0.003em',
          }}
        >
          {subline}
        </p>
      )}

      {meta && (
        <p
          className="mt-1.5"
          style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:      '11px',
            color:         TOKENS.inkMeta,  // was rgba(6,3,43,0.38) — now token
            letterSpacing: '0.02em',
          }}
        >
          {meta}
        </p>
      )}
    </div>
  );
}
