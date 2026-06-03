'use client';

import { KPICard } from '@/components/ui/KPICard';

interface MetricTrioProps {
  activationRate:           number;
  meaningfulActivationRate: number;
  verificationRate:         number;
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function rateStatus(v: number): 'positive' | 'warning' | 'critical' {
  if (v >= 0.50) return 'positive';
  if (v >= 0.30) return 'warning';
  return 'critical';
}

export function MetricTrio({ activationRate, meaningfulActivationRate, verificationRate }: MetricTrioProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KPICard
        code="AR"
        label="Activation Rate"
        value={pct(activationRate)}
        period="Forza lavoro attiva"
        status={rateStatus(activationRate)}
        important
        detailHref="/company/activation"
        size="md"
      />
      <KPICard
        code="MAR"
        label="Meaningful Activation"
        value={pct(meaningfulActivationRate)}
        period="Sopra soglia materialità"
        status={rateStatus(meaningfulActivationRate)}
        important
        size="md"
      />
      <KPICard
        code="VR"
        label="Verification Rate"
        value={pct(verificationRate)}
        period="IU con evidenza verificata"
        status={rateStatus(verificationRate)}
        size="md"
      />
    </div>
  );
}
