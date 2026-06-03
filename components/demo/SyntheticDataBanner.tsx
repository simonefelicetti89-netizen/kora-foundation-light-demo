'use client';
// SyntheticDataBanner — banner ambiente non-suppressible.
// Scopo: comunicare l'ambiente attivo (DEMO/LIVE/FUTURE) in modo inequivocabile.
// Usa var(--env-accent) da globals.css per restare coerente con l'environment switching.

import { useEnvironment } from '@/lib/demo-state';
import type { Environment } from '@/lib/types';

const ENV_BANNER: Record<Environment, { main: string; secondary: string }> = {
  demo: {
    main:      'DEMO · DATI SIMULATI',
    secondary: 'Ambiente commerciale dimostrativo. Il pilot reale usa dati ricevuti e processati da KORA Operator.',
  },
  live: {
    main:      'LIVE · SERVICE-ASSISTED',
    secondary: 'KORA Operator gestisce intake, review, scoring e Decision Pack. Il cliente consuma output aggregati.',
  },
  future: {
    main:      'FUTURE · ROADMAP · NON ATTIVO',
    secondary: 'Funzionalità future non disponibili in Foundation Light. Nessun production claim.',
  },
};

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export function SyntheticDataBanner() {
  const { activeEnvironment } = useEnvironment();
  const { main, secondary } = ENV_BANNER[activeEnvironment];

  return (
    <div
      role="banner"
      aria-label={`Ambiente corrente: ${activeEnvironment}`}
      className="w-full px-4 py-2 text-center text-white"
      style={{ backgroundColor: 'var(--env-accent)', flexShrink: 0 }}
    >
      <p
        style={{
          fontFamily:    FONT,
          fontSize:      '11px',
          fontWeight:    700,
          letterSpacing: '0.06em',
          lineHeight:    1.3,
        }}
      >
        {main}
      </p>
      <p
        style={{
          fontFamily: FONT,
          fontSize:   '10px',
          fontWeight: 400,
          opacity:    0.82,
          marginTop:  2,
          lineHeight: 1.4,
        }}
      >
        {secondary}
      </p>
    </div>
  );
}
