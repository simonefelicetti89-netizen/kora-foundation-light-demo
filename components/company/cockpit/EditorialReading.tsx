'use client';

import type { KoraIndexOutput, CompanyAggregateExtended, PillarCode } from '@/lib/types';

interface EditorialReadingProps {
  output: KoraIndexOutput;
  aggregate: CompanyAggregateExtended | null;
}

function buildReadingText(
  output: KoraIndexOutput,
  aggregate: CompanyAggregateExtended | null,
): string {
  const ki  = Math.round(output.kora_index_value);
  const ar  = aggregate != null ? Math.round(aggregate.activation_rate * 100) : null;
  const mar = aggregate != null ? Math.round(aggregate.meaningful_activation_rate * 100) : null;

  // Identify weakest pillar by IU share
  let weakLabel = 'LEGACY';
  let weakPct   = 6;
  if (aggregate?.pillar_distribution) {
    const entries = Object.entries(aggregate.pillar_distribution) as [PillarCode, number][];
    if (entries.length > 0) {
      const sorted = [...entries].sort((a, b) => a[1] - b[1]);
      weakLabel = sorted[0][0];
      weakPct   = Math.round(sorted[0][1] * 100);
    }
  }

  if (output.safeguard_status === 'CLEAR') {
    return (
      `Il KORA Index di ${ki} riflette un miglioramento misurabile: ` +
      `il tasso di attivazione${ar != null ? ` al ${ar}%` : ''} ha superato la soglia CLEAR, ` +
      `segnalando un'espansione reale dell'attivazione organizzativa. ` +
      `Persiste un gap strutturale nel pillar ${weakLabel} — al ${weakPct}% del totale — ` +
      `che comprime il macroblocco Distribution & Equity e mantiene il punteggio sotto il ` +
      `potenziale dell'organizzazione.`
    );
  }

  if (output.safeguard_status === 'FLAGGED') {
    return (
      `Il KORA Index di ${ki} è fortemente qualificato dallo stato di attivazione: ` +
      `la partecipazione${ar != null ? ` al ${ar}%` : ''} rimane sotto la soglia minima. ` +
      `Il pillar ${weakLabel} al ${weakPct}% rappresenta il principale gap strutturale. ` +
      `L'interpretazione del punteggio richiede cautela — priorità al ripristino ` +
      `dell'attivazione di base.`
    );
  }

  // WARNING (default)
  return (
    `Il KORA Index di ${ki} segnala un'attivazione organizzativa non ancora alla soglia CLEAR: ` +
    `la partecipazione${ar != null ? ` al ${ar}%` : ''}` +
    `${mar != null ? ` e la componente significativa al ${mar}%` : ''} ` +
    `indicano margine di miglioramento. Il pillar ${weakLabel} al ${weakPct}% ` +
    `rappresenta il principale gap strutturale da colmare nel prossimo periodo.`
  );
}

export function EditorialReading({ output, aggregate }: EditorialReadingProps) {
  const text = buildReadingText(output, aggregate);

  return (
    <div>
      {/* Instrument Serif headline — KORA editorial voice, not marketing copy */}
      <p
        className="font-kora-serif text-kora-cosmic-blue leading-[1.28] mb-3"
        style={{ fontSize: '1.4375rem', letterSpacing: '-0.01em' }}
      >
        Non un indice.{' '}
        <em style={{ opacity: 0.70 }}>Una lettura organizzativa.</em>
      </p>

      {/* Reading text — Space Grotesk, muted */}
      <p
        className="font-kora-editorial text-kora-cosmic-blue/[0.65] leading-[1.80]"
        style={{ fontSize: '0.9375rem', maxWidth: '668px', letterSpacing: '-0.004em' }}
      >
        {text}
      </p>
    </div>
  );
}
