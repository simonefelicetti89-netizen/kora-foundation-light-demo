'use client';

import { PageMasthead } from '@/components/ui/PageMasthead';
import { TM } from '@/components/ui/TM';

interface CockpitMastheadProps {
  companyName: string;
  period: string;
  workerCount?: number;
}

export function CockpitMasthead({ companyName, period, workerCount }: CockpitMastheadProps) {
  const meta = workerCount != null
    ? `${workerCount.toLocaleString('it-IT')} lavoratori · dati sintetici · ${period}`
    : period;

  return (
    <PageMasthead
      eyebrow="Executive Cockpit · Human Impact Intelligence"
      title={<><TM>KORA Foundation Light</TM> — {companyName}</>}
      subline="Indice di attivazione umana verificata · Aggregato aziendale · Nessun dato individuale esposto"
      meta={meta}
    />
  );
}
