// lib/workforce/workforce-rules.ts
// Pure deterministic rules for KORA workforce management.
// No React, no services, no side effects — fully testable.
// B90-B: Workforce Command Center foundation.

import type { WorkerSpaceStatus } from '@/lib/worker-identity/types';

// ── Workforce status ──────────────────────────────────────────────────────────

export type WorkforceStatus = 'EMPTY' | 'PARTIAL' | 'READY';

/**
 * Compute the overall workforce readiness status for display.
 *
 * EMPTY  : 0 workers in roster — no data to work with.
 * PARTIAL: workers exist but none have My KORA — layer not yet activated.
 * READY  : workers exist and at least one has My KORA enabled.
 */
export function computeWorkforceStatus(
  totalWorkers: number,
  myKoraCount: number,
): WorkforceStatus {
  if (totalWorkers === 0) return 'EMPTY';
  if (myKoraCount === 0) return 'PARTIAL';
  return 'READY';
}

// ── Next action engine ────────────────────────────────────────────────────────

/**
 * Deterministic next-action guidance for KORA Admin.
 * Rule priority: roster empty > My KORA disabled > Worker Space not enabled > active accounts.
 * No AI, no LLM, no probabilistic logic.
 */
export function computeNextAction(
  totalWorkers: number,
  myKoraCount: number,
  activeCount: number,
  workerSpaceStatus: WorkerSpaceStatus,
): string {
  if (totalWorkers === 0) {
    return 'Aggiungi il primo lavoratore. Usa "Nuovo lavoratore" per creare il roster della company.';
  }
  if (myKoraCount === 0) {
    return `${totalWorkers} lavoratori nel roster. Abilita My KORA per i lavoratori interessati a partecipare allo spazio personale.`;
  }
  if (workerSpaceStatus === 'NOT_ENABLED') {
    return 'Worker Space non ancora abilitato per questo tenant. Verifica la configurazione tenant.';
  }
  if (activeCount === 0) {
    return `My KORA abilitata per ${myKoraCount} lavoratori. Worker Space attivo in modalità Preview — gli account demo sono disponibili.`;
  }
  return `${activeCount} lavoratori con account attivo. Worker Space operativo in modalità Preview. Considera l'attivazione del Pilot+.`;
}

// ── Privacy invariant messages ────────────────────────────────────────────────

export const WORKFORCE_PRIVACY_GUARANTEE =
  'Il Personal Impact Balance (PIB) è un indicatore intermedio privato — mai visibile al datore di lavoro. ' +
  'Il Worker Space mostra al lavoratore il proprio percorso personale. ' +
  "L'azienda vede solo segnali aggregati sopra soglia di privacy (N≥10). " +
  'Nessun ranking individuale. Nessun Dynamic CV accessibile lato employer. ' +
  'employer_can_view_individual_pib = false su ogni WorkerRosterRecord.';

export const COMPANY_CAN_SEE = [
  'KORA Index aggregato aziendale',
  'Distribuzione per pillar (aggregata)',
  'Activation Rate e MAR (aggregati)',
  'Budget-to-Human-Impact aggregato',
  'Numero totale lavoratori nel roster',
  'Numero di lavoratori con My KORA abilitata',
] as const;

export const COMPANY_CANNOT_SEE = [
  'PIB individuale di nessun lavoratore',
  'Dynamic CV o timeline personale',
  'Attivazione individuale per lavoratore',
  'Consenso o preferenze personali',
  'Dati sanitari o psicologici',
  'Partecipazione nominale a programmi specifici',
] as const;

// ── Worker roster navigation ──────────────────────────────────────────────────

export function getWorkforceRoute(companyId: string): string {
  return `/admin/companies/${companyId}/workforce`;
}
