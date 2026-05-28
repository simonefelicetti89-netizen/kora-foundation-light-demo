'use client';

import { useEnvironment } from '@/lib/demo-state';
import type { Environment } from '@/lib/types';

const ENV_BANNER: Record<Environment, { text: string; cls: string }> = {
  demo: {
    text: 'DEMO · DATI SIMULATI · Foundation Light v0.1 · Pre-Calibrazione Empirica · Non Dati Reali',
    cls:  'bg-blue-600 text-white',
  },
  live: {
    text: 'LIVE · Service-Assisted · KORA Operator gestisce la pipeline · il cliente consuma output · KORA Methodology v0.1',
    cls:  'bg-slate-800 text-white',
  },
  future: {
    text: 'FUTURE · ROADMAP · NON ATTIVO · Funzionalità non disponibili in Foundation Light',
    cls:  'bg-slate-500 text-white',
  },
};

export function SyntheticDataBanner() {
  const { activeEnvironment } = useEnvironment();
  const { text, cls } = ENV_BANNER[activeEnvironment];

  return (
    <div
      className={`w-full px-4 py-1.5 text-center text-xs font-medium ${cls}`}
      role="banner"
      aria-label={`Ambiente corrente: ${activeEnvironment}`}
    >
      {text}
    </div>
  );
}
