// lib/commons/contribution-narrative.ts
// B167 — Generatore di narrativa KORA Contribution.
//
// Funzioni PURE: nessuna chiamata DB, nessuna chiamata LLM (dottrina: no LLM su dati HR).
// Input: aggregati delle view promoter/origin_employer.
// Output: array di stringhe italiane (1-3 frasi) già pronte per la UI.
//
// Tono: fattuale, neutro, no superlativi, no "ottimo lavoro!".

import type { ContributionPromoterView, ContributionOriginEmployerView } from './contribution-views';

const PILLAR_LABELS: Record<string, string> = {
  LIFE:       'Benessere e salute',
  GROWTH:     'Crescita professionale',
  CONNECTION: 'Connessione e comunità',
  IMPACT:     'Impatto territoriale',
  LEGACY:     'Eredità e trasmissione',
};

function topPillar(breakdown: { pillar: string; share_pct: number }[]): string | null {
  if (breakdown.length === 0) return null;
  const top = [...breakdown].sort((a, b) => b.share_pct - a.share_pct)[0];
  return PILLAR_LABELS[top.pillar] ?? top.pillar;
}

/**
 * Produce 1-3 frasi per la sezione promoter.
 * Dati il numero di iniziative promosse, partecipazioni ricevute ed outreach esterno.
 */
export function buildPromoterNarrative(view: Pick<
  ContributionPromoterView,
  'distinct_initiatives' | 'participations_received' | 'external_outreach_events' | 'pillar_breakdown'
>): string[] {
  const { distinct_initiatives, participations_received, external_outreach_events, pillar_breakdown } = view;

  if (distinct_initiatives === 0) {
    return [
      'La tua organizzazione non ha ancora promosso iniziative cross-azienda nel periodo di riferimento.',
    ];
  }

  const frasi: string[] = [];

  const iniziativeLabel = distinct_initiatives === 1 ? 'iniziativa cross-azienda' : 'iniziative cross-azienda';
  const partecipazioniLabel = participations_received === 1
    ? '1 partecipazione da lavoratori di altre organizzazioni'
    : `${participations_received} partecipazioni da lavoratori di altre organizzazioni`;

  frasi.push(
    `La tua organizzazione ha promosso ${distinct_initiatives} ${iniziativeLabel}, ricevendo ${partecipazioniLabel}.`
  );

  const top = topPillar(pillar_breakdown);
  if (top) {
    frasi.push(`Il pillar prevalente nelle iniziative promosse è ${top}.`);
  }

  if (external_outreach_events > 0) {
    const eventLabel = external_outreach_events === 1 ? '1 evento ha coinvolto' : `${external_outreach_events} eventi hanno coinvolto`;
    frasi.push(`${eventLabel} anche partecipanti esterni (familiari o comunità locali).`);
  }

  return frasi;
}

/**
 * Produce 1-3 frasi per la sezione origin_employer.
 * Dati il numero di partecipazioni dei lavoratori, iniziative distinte e promotori.
 */
export function buildOriginEmployerNarrative(view: Pick<
  ContributionOriginEmployerView,
  'participations_sent' | 'distinct_initiatives' | 'distinct_promoters' | 'pillar_breakdown'
>): string[] {
  const { participations_sent, distinct_initiatives, distinct_promoters, pillar_breakdown } = view;

  if (participations_sent === 0) {
    return [
      'I lavoratori della tua organizzazione non hanno ancora partecipato a iniziative cross-azienda nel periodo di riferimento.',
    ];
  }

  const frasi: string[] = [];

  const partecipazioniLabel = participations_sent === 1
    ? '1 partecipazione a iniziative di altre organizzazioni'
    : `${participations_sent} partecipazioni a iniziative di altre organizzazioni`;

  frasi.push(
    `I tuoi lavoratori hanno effettuato ${partecipazioniLabel}.`
  );

  if (distinct_initiatives > 1 || distinct_promoters > 1) {
    const iniziativeStr  = distinct_initiatives === 1  ? '1 iniziativa distinta'  : `${distinct_initiatives} iniziative distinte`;
    const promotoriStr   = distinct_promoters   === 1  ? '1 organizzazione promotrice' : `${distinct_promoters} organizzazioni promotrici`;
    frasi.push(`Le partecipazioni si distribuiscono su ${iniziativeStr} di ${promotoriStr}.`);
  }

  const top = topPillar(pillar_breakdown);
  if (top) {
    frasi.push(`Il pillar più frequentato è ${top}.`);
  }

  return frasi;
}
