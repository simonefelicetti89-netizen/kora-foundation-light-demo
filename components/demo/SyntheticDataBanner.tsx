'use client';

import { useEnvironment } from '@/lib/demo-state';
import type { Environment } from '@/lib/types';

const ENV_BANNER: Record<Environment, { main: string; secondary: string }> = {
  demo: {
    main:      'DEMO · DATI SIMULATI · Foundation Light v0.1 · Pre-Calibrazione Empirica',
    secondary: 'Il pilot reale usa dati ricevuti e processati da KORA Operator.',
  },
  live: {
    main:      'LIVE · SERVICE-ASSISTED · KORA Methodology v0.1',
    secondary: 'KORA Operator gestisce intake, review, scoring e Decision Pack. Il cliente consuma output.',
  },
  future: {
    main:      'FUTURE · ROADMAP · NON ATTIVO',
    secondary: 'Le funzionalità future non sono disponibili in Foundation Light.',
  },
};

export function SyntheticDataBanner() {
  const { activeEnvironment } = useEnvironment();
  const { main, secondary } = ENV_BANNER[activeEnvironment];

  return (
    <div
      className="w-full px-4 py-2 text-center text-white"
      style={{ backgroundColor: 'var(--env-accent)' }}
      role="banner"
      aria-label={`Ambiente corrente: ${activeEnvironment}`}
    >
      <p className="text-xs font-bold tracking-wide">{main}</p>
      <p className="text-[10px] font-normal opacity-85 mt-0.5">{secondary}</p>
    </div>
  );
}
