'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface Action {
  action: string;
  detail: string;
}

interface ProssimaAzioneCardProps {
  action: Action | null;
}

export function ProssimaAzioneCard({ action }: ProssimaAzioneCardProps) {
  const [hovered, setHovered] = useState(false);
  const title  = action?.action ?? 'Analizza il gap strutturale';
  const detail = action?.detail ??
    'Verifica la distribuzione per pillar e l\'allocazione della spesa per individuare le aree di attivazione profonda sottorappresentate nel periodo.';

  return (
    <div
      className="flex flex-col"
      style={{
        background:   TOKENS.ink,
        border:       hovered ? `1px solid ${TOKENS.accent}` : `1px solid rgba(255,255,255,0.08)`,
        borderRadius: TOKENS.cardRadius,
        boxShadow:    hovered ? `0 18px 45px rgba(6,3,43,0.25)` : `0 10px 30px rgba(6,3,43,0.12)`,
        padding:      '28px',
        transition:   'all 180ms ease',
        transform:    hovered ? 'translateY(-2px)' : 'none',
        minHeight:    '100%',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Eyebrow */}
      <p style={{
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontWeight:    600,
        fontSize:      '10px',
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color:         TOKENS.accent,
        marginBottom:  16,
      }}>
        Priorità intelligenza
      </p>

      {/* Action title */}
      <p
        className="font-kora-serif"
        style={{
          fontSize:      '1.25rem',
          color:         '#FFFFFF',
          letterSpacing: '-0.01em',
          lineHeight:    1.25,
          marginBottom:  12,
          flex: 1,
        }}
      >
        {title}
      </p>

      {/* Detail */}
      <p style={{
        fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontSize:   '12.5px',
        color:      'rgba(255,255,255,0.60)',
        lineHeight: 1.65,
        flexGrow:   1,
      }}>
        {detail}
      </p>

      {/* CTA */}
      <Link
        href="/company/kora-index"
        className="mt-6 self-start text-sm font-semibold transition-opacity hover:opacity-80"
        style={{
          color:            TOKENS.accent,
          textDecoration:   'none',
          display:          'inline-flex',
          alignItems:       'center',
          gap:              4,
          borderBottom:     `1px solid ${TOKENS.accent}40`,
          paddingBottom:    2,
        }}
      >
        Vedi piano d&apos;azione →
      </Link>
    </div>
  );
}
