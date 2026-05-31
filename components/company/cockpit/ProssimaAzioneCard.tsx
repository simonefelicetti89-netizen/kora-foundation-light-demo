'use client';

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
  const title  = action?.action ?? 'Analizza il gap strutturale';
  const detail = action?.detail ??
    'Verifica la distribuzione per pillar e l\'allocazione della spesa per individuare le aree di attivazione profonda sottorappresentate nel periodo.';

  return (
    <div
      className="flex flex-col p-6"
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
      }}
    >
      {/* Titolo serif attenuato */}
      <p
        className="font-kora-serif"
        style={{
          fontSize:      '1.3125rem',
          color:         'rgba(20,18,46,0.50)',
          letterSpacing: '-0.01em',
          lineHeight:    1.2,
        }}
      >
        Prossima azione
      </p>

      {/* Gap */}
      <div style={{ height: 18 }} />

      {/* Frase azione — Inter 600, ink */}
      <p
        style={{
          fontFamily:    'var(--font-inter)',
          fontWeight:    600,
          fontSize:      '16px',
          color:         TOKENS.ink,
          letterSpacing: '-0.01em',
          lineHeight:    1.35,
          marginBottom:  10,
        }}
      >
        {title}
      </p>

      {/* Testo descrittivo */}
      <p
        style={{
          fontFamily: 'var(--font-inter)',
          fontSize:   '12.5px',
          color:      'rgba(20,18,46,0.60)',
          lineHeight: 1.68,
          flexGrow:   1,
        }}
      >
        {detail}
      </p>

      {/* Link viola */}
      <Link
        href="/company/kora-index"
        className="mt-5 self-start text-sm font-medium transition-opacity hover:opacity-75"
        style={{ color: TOKENS.accent }}
      >
        Vedi piano d&apos;azione →
      </Link>
    </div>
  );
}
