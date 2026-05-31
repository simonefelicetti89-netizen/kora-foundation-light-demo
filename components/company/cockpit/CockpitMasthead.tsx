'use client';

import { PageMasthead } from '@/components/ui/PageMasthead';

interface CockpitMastheadProps {
  companyName: string;
  period: string;
  workerCount?: number;
}

export function CockpitMasthead({ companyName, period, workerCount }: CockpitMastheadProps) {
  const meta = workerCount != null
    ? `${workerCount.toLocaleString('it-IT')} lavoratori · dati sintetici`
    : undefined;

  return (
    <PageMasthead
      eyebrow={`Executive cockpit · ${period}`}
      title={companyName}
      subline="Indice di attivazione umana verificata"
      meta={meta}
    />
  );
}
