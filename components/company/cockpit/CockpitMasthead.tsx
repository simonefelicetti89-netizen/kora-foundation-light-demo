'use client';

interface CockpitMastheadProps {
  companyName: string;
  period: string;
  workerCount?: number;
}

export function CockpitMasthead({ companyName, period, workerCount }: CockpitMastheadProps) {
  return (
    <div className="mb-7">
      {/* Eyebrow */}
      <p
        className="font-mono uppercase mb-2.5"
        style={{ fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(20,18,46,0.50)' }}
      >
        Executive cockpit&nbsp;&middot;&nbsp;{period}
      </p>

      {/* Company name — largest element on page */}
      <h1
        className="font-kora-serif text-kora-ink leading-[1.04]"
        style={{ fontSize: 'clamp(2.25rem, 4vw, 2.875rem)', letterSpacing: '-0.025em' }}
      >
        {companyName}
      </h1>

      {/* Subline */}
      <p
        className="mt-2"
        style={{ fontSize: '13px', color: 'rgba(20,18,46,0.55)', letterSpacing: '-0.003em' }}
      >
        Indice di attivazione umana verificata
        {workerCount != null && (
          <span style={{ color: 'rgba(20,18,46,0.35)', marginLeft: 8 }}>
            &middot;&nbsp;{workerCount.toLocaleString('it-IT')} lavoratori · dati sintetici
          </span>
        )}
      </p>
    </div>
  );
}
