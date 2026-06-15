// lib/types/domains/worker-pib-live.ts
// B161 — tipi per il live worker PIB path.
// Separati dai tipi DB row (worker-pilot-schema.ts) e dai tipi di consumo pagina (worker-pib.ts).

import type { WorkerInitiativeSourceKind } from './worker-pilot-schema';

// ── Input per WorkerIUComputationService (puro, no DB) ───────────────────────
// Campi estratti da analytics.uef_record necessari per la formula IU worker.

export interface UefRecordForWorkerIU {
  id:                        string;
  eligibility:               string;         // 'eligible' | 'limited' | 'blocked'
  action_family:             string | null;
  event_nature:              string | null;
  primary_pillar:            string | null;
  missing_fields:            string[];
  approved_for_impact_units: boolean;
  payload:                   Record<string, unknown>;
}

// Parametri completi per il calcolo IU di un worker su un evento.
// Modifica 1: company_sourced non richiede participation (d'ufficio).
// participationId è null per attribuzione aziendale diretta.
export interface WorkerIUComputationParams {
  workerIdentityId:  string;                      // personal.worker_identity.id (da JWT)
  reportingPeriod:   string;
  sourceKind:        WorkerInitiativeSourceKind;
  uefRecord:         UefRecordForWorkerIU;
  participationId:   string | null;               // null per company_sourced d'ufficio
}

// ── Ridistribuzione pillar (opzionale, worker-owned) ─────────────────────────

export interface PIBRedistributionInput {
  source_uef_record_id: string;
  // frazioni per pillar, somma DEVE essere 1.0 (±epsilon)
  // sposta la composizione, MAI gonfia il totale IU
  distribution: Partial<Record<'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY', number>>;
}

export interface PIBRedistributionValidation {
  valid:   boolean;
  error?:  string;
}
