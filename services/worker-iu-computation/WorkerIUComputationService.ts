// services/worker-iu-computation/WorkerIUComputationService.ts
// B161 — calcolo IU per-worker (puro, no DB, testabile su fixture).
//
// Risposta 1: l'IU del worker eredita i fattori del programma UEF, modulato solo
// dall'evidence_type del singolo (L3=verified/company-sourced, L1=self_declared).
//
// Opzione C multi-pillar:
//   Livello Base (sempre attivo): iu eredita primary_pillar → una riga worker_pib.
//   Livello Ridistribuzione (worker-owned): distribuisce l'IU base su più pillar,
//   somma invariata (MAI superiore all'IU base).
//
// Modifica 1: company_sourced = attribuzione d'ufficio, non richiede
// worker_participation 'attended'. L'azienda è fonte autorevole → L3 → verified.
//
// Valore generativo (Tempo 2): colonne predisposte, NESSUNA logica qui.
// generative_* restano sempre NULL in questo service.

import type { EligibilityClass, ActionFamily, PillarCode } from '@/lib/types';
import type { IULiveInput } from '@/services/iu-computation/IUComputationService';
import { iuComputationService } from '@/services/iu-computation/IUComputationService';
import type { WorkerPIBRowInsert } from '@/lib/types/domains/worker-pilot-schema';
import type {
  WorkerIUComputationParams,
  PIBRedistributionValidation,
} from '@/lib/types/domains/worker-pib-live';
import { getPIBConfig } from '@/lib/methodology-config/v0.1';

// ── Costanti ─────────────────────────────────────────────────────────────────

const VALID_PILLARS = new Set<string>(['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']);
const REDISTRIBUTION_EPSILON = 0.001;

// ── Derivazione evidence_type per Nodo A ─────────────────────────────────────
// company_sourced d'ufficio → L3 (l'azienda ha l'attestazione nominativa)
// partner_sourced           → L2 (documentazione partner, futuro — schema ready, logica spenta)
// worker_declared           → L1 (autodichiarato, futuro — schema ready, logica spenta)

function deriveEvidenceType(sourceKind: string): string {
  if (sourceKind === 'company_sourced') return 'L3';
  if (sourceKind === 'partner_sourced') return 'L2';
  return 'L1'; // worker_declared
}

// Nodo A: is_exportable=true solo per verified (L3/L4)
function deriveVerificationAndExport(evidenceType: string): {
  verification_status: 'verified' | 'self_declared';
  is_exportable: boolean;
} {
  const verified = evidenceType === 'L3' || evidenceType === 'L4';
  return {
    verification_status: verified ? 'verified' : 'self_declared',
    is_exportable:       verified,
  };
}

// ── Livello Base — calcolo IU mono-pillar (sempre attivo) ────────────────────

export function computeBaseWorkerPIBRows(
  params: WorkerIUComputationParams,
): WorkerPIBRowInsert[] {
  const { workerIdentityId, reportingPeriod, sourceKind, participationId, uefRecord } = params;

  const evidenceType = deriveEvidenceType(sourceKind);
  const { verification_status, is_exportable } = deriveVerificationAndExport(evidenceType);

  // Unico campo worker-specifico: evidence_type.
  // Tutti gli altri fattori (NM, BC, CQ, CF, AGF) vengono dal UEF record del programma.
  const iuInput: IULiveInput = {
    uef_record_id:             uefRecord.id,
    eligibility:               uefRecord.eligibility as EligibilityClass | 'review_required',
    review_required:           false, // già approvato a livello programma
    approved_for_impact_units: uefRecord.approved_for_impact_units,
    action_family:             (uefRecord.action_family ?? 'blocked_compliance') as ActionFamily,
    event_nature:              uefRecord.event_nature ?? '',
    primary_pillar:            uefRecord.primary_pillar as PillarCode | null,
    pillar_distribution:       {}, // pipeline attuale: tutto al pillar primario
    missing_fields:            uefRecord.missing_fields,
    evidence_type:             evidenceType,
    site_or_cluster:           (uefRecord.payload['site'] as string | null) ?? null,
  };

  const result = iuComputationService.computeIUForLiveInput(iuInput);

  const rows: WorkerPIBRowInsert[] = [];
  for (const [pillar, iuValue] of Object.entries(result.impact_units_by_pillar)) {
    if (!iuValue || iuValue <= 0) continue;
    rows.push({
      worker_identity_id:      workerIdentityId,
      reporting_period:        reportingPeriod,
      pillar:                  pillar as WorkerPIBRowInsert['pillar'],
      iu_value:                iuValue,
      verification_status,
      is_exportable,
      source_kind:             sourceKind as WorkerPIBRowInsert['source_kind'],
      source_uef_record_id:    uefRecord.id,
      source_participation_id: participationId,
      // TEMPO 2 — predisposte, nessuna logica in questo blocco
      generative_index:        null,
      generative_circle1:      null,
      generative_circle2:      null,
      generative_circle3:      null,
    });
  }

  return rows;
}

// ── Validazione ridistribuzione (server-side, mai fidarsi del client) ─────────

export function validateRedistribution(
  distribution: Partial<Record<string, number>>,
): PIBRedistributionValidation {
  // Tutti i pillar devono essere validi
  for (const pillar of Object.keys(distribution)) {
    if (!VALID_PILLARS.has(pillar)) {
      return {
        valid: false,
        error: `Pillar non valido: "${pillar}". Valori ammessi: ${[...VALID_PILLARS].join(', ')}.`,
      };
    }
  }

  // Tutte le frazioni devono essere in [0, 1]
  for (const [pillar, fraction] of Object.entries(distribution)) {
    if (typeof fraction !== 'number' || fraction < 0 || fraction > 1) {
      return {
        valid: false,
        error: `Frazione non valida per "${pillar}": ${fraction}. Deve essere un numero tra 0 e 1.`,
      };
    }
  }

  // Somma deve essere 1.0 (entro epsilon)
  const sum = Object.values(distribution).reduce<number>((s, v) => s + (v ?? 0), 0);
  if (Math.abs(sum - 1.0) > REDISTRIBUTION_EPSILON) {
    return {
      valid: false,
      error: `Somma delle frazioni deve essere 1.0 (trovato: ${sum.toFixed(4)}). La ridistribuzione sposta la composizione IU, non gonfia il totale.`,
    };
  }

  return { valid: true };
}

// ── Sprint 2 B-PIB1 — PIB Multiplier M(w) ────────────────────────────────────
// M(w) = min(max_multiplier, 1.0 × DF)
// DF = 1 + n_qualifying × diversity_step_per_pillar
// n_qualifying = count of pillars where PRS(w,p) = worker_iu_in_p / T_p ≥ θ
// Micro-activations below θ (e.g. token IMPACT row) do NOT inflate DF.
// Cap: M(w) ≤ 1.25 (from config).
// Applied per-worker after all base PIB rows are accumulated.

export function computePIBMultiplier(
  rows: WorkerPIBRowInsert[],
  sectorTargets?: Record<string, number>,
): { multiplier: number; n_qualifying: number; df: number } {
  const cfg = getPIBConfig();
  const targets = sectorTargets ?? cfg.pillar_targets_default;
  const theta = cfg.prs_threshold_theta;

  // Sum IU per pillar across all rows
  const pillarIU: Record<string, number> = {};
  for (const row of rows) {
    pillarIU[row.pillar] = (pillarIU[row.pillar] ?? 0) + row.iu_value;
  }

  let n_qualifying = 0;
  for (const [pillar, target] of Object.entries(targets)) {
    if (target <= 0) continue;
    const workerIU = pillarIU[pillar] ?? 0;
    const prs = workerIU / target; // PRS(w,p) — ratio vs pillar target
    if (prs >= theta) n_qualifying++;
  }

  const df = 1 + n_qualifying * cfg.diversity_step_per_pillar;
  const multiplier = Math.min(cfg.max_multiplier, df);
  return { multiplier, n_qualifying, df };
}

// applyPIBMultiplier: applies M(w) to all accumulated base PIB rows for a worker.
// Call AFTER computeBaseWorkerPIBRows has been called for all UEF records of this worker.
// The multiplier rewards multi-pillar engagement without exceeding the 1.25 cap.
export function applyPIBMultiplier(
  baseRows: WorkerPIBRowInsert[],
  sectorTargets?: Record<string, number>,
): { rows: WorkerPIBRowInsert[]; multiplier: number; n_qualifying: number } {
  if (baseRows.length === 0) return { rows: [], multiplier: 1.0, n_qualifying: 0 };

  const { multiplier, n_qualifying } = computePIBMultiplier(baseRows, sectorTargets);

  if (multiplier === 1.0) return { rows: baseRows, multiplier: 1.0, n_qualifying };

  const scaled = baseRows.map(row => ({
    ...row,
    iu_value: +(row.iu_value * multiplier).toFixed(4),
  }));
  return { rows: scaled, multiplier, n_qualifying };
}

// ── Livello Ridistribuzione — opzionale, worker-owned ────────────────────────
// Input:  righe base (Livello Base) + distribuzione percentuale per pillar
// Output: righe ridistribuite con stessa source_uef_record_id e somma IU invariata
//
// Modifica 2 (atomicità): questa funzione è PURA — non scrive sul DB.
// La scrittura atomica avviene nella route via fn_redistribute_worker_pib (mig 020).
// Se il DB write fallisce, le righe pre-esistenti restano intatte.

export function applyPillarRedistribution(
  baseRows: WorkerPIBRowInsert[],
  distribution: Partial<Record<string, number>>,
): { rows: WorkerPIBRowInsert[]; error?: string } {
  if (baseRows.length === 0) {
    return { rows: [], error: 'Nessuna riga PIB base da ridistribuire.' };
  }

  const validation = validateRedistribution(distribution);
  if (!validation.valid) {
    return { rows: baseRows, error: validation.error };
  }

  // IU base totale = invariante. La ridistribuzione SPOSTA, non gonfia.
  const baseIU = baseRows.reduce((s, r) => s + r.iu_value, 0);
  const template = baseRows[0]!;

  const redistributed: WorkerPIBRowInsert[] = [];
  for (const [pillar, fraction] of Object.entries(distribution)) {
    if (!fraction || fraction <= 0) continue;
    redistributed.push({
      ...template,
      pillar:    pillar as WorkerPIBRowInsert['pillar'],
      iu_value:  +(baseIU * fraction).toFixed(4),
    });
  }

  return { rows: redistributed };
}
