'use client';

import type { ReactNode } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface PageHeaderProps {
  eyebrow:   string;
  title:     ReactNode;
  subline?:  string;
  meta?:     string;
  actions?:  ReactNode;   // slot per CTA/button destra
  level?:    1 | 2 | 3;  // heading level, default 1
}

// PageHeader — elevazione di PageMasthead. Jakarta everywhere, zero serif.
// Usa questo in tutte le pagine nuove/migrate nelle Fasi 1–5.
// L'eyebrow è sempre terracotta+uppercase; il title è Jakarta 800.
export function PageHeader({
  eyebrow,
  title,
  subline,
  meta,
  actions,
  level = 1,
}: PageHeaderProps) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3';
  const fontSize = level === 1 ? 'clamp(2rem, 4vw, 2.75rem)'
                 : level === 2 ? 'clamp(1.6rem, 3.4vw, 2.2rem)'
                 :               'clamp(1.25rem, 2vw, 1.5rem)';

  return (
    <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Eyebrow */}
        <p style={{
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight:    700,
          fontSize:      '10.5px',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color:         TOKENS.accent,
          marginBottom:  10,
        }}>
          {eyebrow}
        </p>

        {/* Title — Jakarta, never serif */}
        <Tag style={{
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight:    800,
          fontSize:      fontSize,
          lineHeight:    1.06,
          letterSpacing: level === 1 ? '-0.03em' : '-0.025em',
          color:         TOKENS.ink,
          margin:        0,
        }}>
          {title}
        </Tag>

        {subline && (
          <p style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:      '15px',
            lineHeight:    1.55,
            color:         TOKENS.inkSecondary,
            letterSpacing: '-0.003em',
            marginTop:     10,
            maxWidth:      '64ch',
          }}>
            {subline}
          </p>
        )}

        {meta && (
          <p style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:      '10.5px',
            color:         TOKENS.inkMeta,
            letterSpacing: '0.02em',
            marginTop:     6,
          }}>
            {meta}
          </p>
        )}
      </div>

      {/* Action slot */}
      {actions && (
        <div style={{ flexShrink: 0, alignSelf: 'flex-end', paddingBottom: 2 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
