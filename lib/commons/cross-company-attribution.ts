// lib/commons/cross-company-attribution.ts
// B166 — Hook di attribuzione per partecipazioni cross_company (booking → attended).
//
// Chiamato da BookingService.markAttended(), mai da percorsi aziendali.
// Usa ServiceDb (service-role) per bypassare RLS — stesso pattern di B164 office-attribution.
//
// INVARIANTI:
//   - Idempotenza via UNIQUE (mig 025): chiamata ripetuta su stessa booking → nessuna duplica.
//   - Anonimato: this hook writes PIB + Contribution — mai scrive campi worker-identificativi
//     su tabelle company-visible.
//   - source_booking_id su worker_pib: FK a commons.booking, NON source_uef_record_id
//     (la booking non è un evento UEF).
//   - KORA Contribution: NON è componente KORA Index (CLAUDE.md §12.7). Companion indicator.

import type { ServiceDb } from '@/lib/supabase/server';
import { computeBaseWorkerPIBRows } from '@/services/worker-iu-computation/WorkerIUComputationService';
import type { UefRecordForWorkerIU } from '@/lib/types/domains/worker-pib-live';
import type { ActionFamily } from '@/lib/types';

// ── Costanti metodologiche ────────────────────────────────────────────────────
//
// CROSS_COMPANY_MULTIPLIER — Provisional B166 pre-empirical v0.1.
// Rationale: la partecipazione cross-company crea capitale sociale inter-organizzativo
// e dimostra un commitment di attivazione superiore (il lavoratore attraversa i confini
// organizzativi). Range metodologico: [1.10, 1.50].
// Il fondatore può raffinare dopo lo studio Delphi di calibrazione.
// Non hardcoded negli output — modificare qui e i test si aggiornano di conseguenza.
export const CROSS_COMPANY_MULTIPLIER = 1.30;

// Peso base per evento di partecipanti esterni (Nodo A — self_declared EV ridotto).
// Formula: NM(0.80) × BC(1.0) × CQ(1.0) × EV(0.60 per self_declared) × CF(1.0) × AGF(1.0) = 0.48.
// Si applica per OGNI partecipante esterno (familiare/comunità).
const EXTERNAL_PARTICIPANT_SELF_DECLARED_WEIGHT = 0.48;
const EXTERNAL_PARTICIPANT_VERIFIED_WEIGHT      = 0.72; // EV=0.90 per verified

// Periodo di default se non passato esplicitamente
const DEFAULT_REPORTING_PERIOD = '2026-Q2';

// ── Mappatura pillar → action_family ─────────────────────────────────────────
const PILLAR_TO_ACTION_FAMILY: Record<string, ActionFamily> = {
  LIFE:       'health_and_wellbeing',
  GROWTH:     'professional_growth',
  CONNECTION: 'inclusion_and_connection',
  IMPACT:     'territorial_impact',
  LEGACY:     'future_and_legacy',
};

// ── Interfacce interne ────────────────────────────────────────────────────────

interface BookingAttendedParams {
  db:             ServiceDb;
  bookingId:      string;
  workerIdentityId: string;
  workerTenantId: string;
  postTenantId:   string;
  postId:         string;
  postPillar:     string | null;
  reportingPeriod?: string;
}

interface ExternalParticipantsParams {
  db:             ServiceDb;
  postId:         string;
  postTenantId:   string;
  externalCount:  number;
  evidenceStatus: 'verified' | 'self_declared';
  reportingPeriod?: string;
}

export interface AttributionResult {
  pib_rows_written:      number;
  contribution_written:  number;
  skipped:               number;
  errors:                number;
}

// ── PIB computation per booking (riusa computeBaseWorkerPIBRows + multiplier) ──
//
// Costruisce un UEF virtuale dalla post (non da analytics.uef_record — i booking
// non hanno UEF) e applica CROSS_COMPANY_MULTIPLIER ai valori IU risultanti.
// source_booking_id sostituisce source_uef_record_id per l'idempotenza su worker_pib.

function buildVirtualUef(params: {
  bookingId: string;
  pillar:    string;
}): UefRecordForWorkerIU {
  const actionFamily = PILLAR_TO_ACTION_FAMILY[params.pillar] ?? 'inclusion_and_connection';
  return {
    id:                        params.bookingId, // sovrascritto prima dell'INSERT
    eligibility:               'eligible',
    action_family:             actionFamily,
    event_nature:              'cross_company_event',
    primary_pillar:            params.pillar,
    missing_fields:            [],
    approved_for_impact_units: true,
    payload:                   { evidence_level: 'L3' }, // KORA_ADMIN ha confermato l'attendance
  };
}

// ── Attribuzione PIB per booking attended ─────────────────────────────────────

export async function attributePIBForBooking(
  params: BookingAttendedParams,
): Promise<Pick<AttributionResult, 'pib_rows_written' | 'skipped' | 'errors'>> {
  const {
    db, bookingId, workerIdentityId, postPillar,
    reportingPeriod = DEFAULT_REPORTING_PERIOD,
  } = params;

  if (!postPillar) {
    // Post senza pillar — non si può attribuire IU, skip non silenzioso
    console.warn('[B166 cross-company-attribution] post senza pillar — PIB skipped', { bookingId });
    return { pib_rows_written: 0, skipped: 1, errors: 0 };
  }

  const virtualUef = buildVirtualUef({ bookingId, pillar: postPillar });

  const baseRows = computeBaseWorkerPIBRows({
    workerIdentityId,
    reportingPeriod,
    sourceKind:    'company_sourced',
    uefRecord:     virtualUef,
    participationId: null,
  });

  if (baseRows.length === 0) {
    return { pib_rows_written: 0, skipped: 1, errors: 0 };
  }

  // Applica il moltiplicatore cross_company e ri-mappa source_booking_id
  const boostedRows = baseRows.map((row) => ({
    ...row,
    iu_value:             +(row.iu_value * CROSS_COMPANY_MULTIPLIER).toFixed(4),
    // source_uef_record_id=null: booking non è evento UEF. Conseguenza: queste righe
    // contribuiscono agli IU totali in getPIBLive() ma sono escluse dal timeline worker
    // (che richiede source_uef_record_id per il join a personal.worker_initiative).
    // Trace KORA Space attendance → /my-kora/bookings (booking card attended).
    source_uef_record_id: null,
    source_booking_id:    bookingId, // FK a commons.booking per idempotenza
  }));

  const { error } = await (db as any)
    .schema('personal')
    .from('worker_pib')
    .insert(boostedRows);

  if (error) {
    if (error.code === '23505') {
      // Già attribuito — idempotente
      return { pib_rows_written: boostedRows.length, skipped: 0, errors: 0 };
    }
    console.error('[B166 cross-company-attribution] worker_pib insert error:', error.message, { bookingId });
    return { pib_rows_written: 0, skipped: 0, errors: 1 };
  }

  return { pib_rows_written: boostedRows.length, skipped: 0, errors: 0 };
}

// ── Attribuzione Contribution per booking attended ────────────────────────────
// Due righe per partecipazione: promoter (Beta) + origin_employer (Acme).
//
// TRANSACTION SAFETY (C-9): Le due INSERT avvengono sequenzialmente senza wrapper
// transazionale esplicito. Se la seconda INSERT fallisce con un errore non idempotente,
// la prima riga è già committata → attribution parziale.
//
// MITIGAZIONE ATTUALE: idempotenza via UNIQUE constraint (error code 23505) su entrambe
// le righe. Una retry del chiamante (BookingService.markAttended) corregge il parziale
// su seconda chiamata per lo stesso bookingId.
//
// SOLUZIONE PROPOSTA: Migration 026 (supabase/proposed/026_contribution_atomic_attribution.sql)
// crea RPC commons.attribute_contribution_for_booking_atomic() che esegue entrambi gli
// INSERT in una singola transazione DB. Richiederebbe Gate 3 + CTO review prima del deploy.
//
// STATUS: migration 026 NON applicata. Partial attribution risk documentato e accettato
// per Foundation Light (synthetic data only).

export async function attributeContributionForBooking(
  params: BookingAttendedParams,
): Promise<Pick<AttributionResult, 'contribution_written' | 'errors'>> {
  const {
    db, bookingId, postId,
    postTenantId, workerTenantId,
    reportingPeriod = DEFAULT_REPORTING_PERIOD,
  } = params;

  const rows = [
    {
      tenant_id:          postTenantId,
      source_booking_id:  bookingId,
      source_post_id:     postId,
      role:               'promoter',
      contribution_kind:  'cross_company_participation',
      impact_weight:      1.0000,   // peso base per partecipazione verified
      evidence_status:    'verified',
      reporting_period: reportingPeriod,
    },
    {
      tenant_id:          workerTenantId,
      source_booking_id:  bookingId,
      source_post_id:     postId,
      role:               'origin_employer',
      contribution_kind:  'cross_company_participation',
      impact_weight:      0.5000,   // peso ridotto: Acme non ha organizzato l'evento
      evidence_status:    'verified',
      reporting_period: reportingPeriod,
    },
  ];

  let written = 0;
  let partialWritten = false;
  for (const row of rows) {
    const { error } = await (db as any)
      .schema('commons')
      .from('contribution_event')
      .insert(row);

    if (error) {
      if (error.code === '23505') {
        written++; // idempotente
      } else {
        // Non-idempotency failure: if this is the second row, attribution is partial.
        // The first row is already committed (no transaction). Caller retry on same
        // bookingId will self-correct via idempotency on the first row.
        // Full fix: use attribute_contribution_for_booking_atomic() RPC (migration 026, pending).
        if (partialWritten) {
          console.error('[B166 cross-company-attribution] PARTIAL ATTRIBUTION — second row failed after first committed:', error.message, { bookingId, role: row.role });
        } else {
          console.error('[B166 cross-company-attribution] contribution_event insert error:', error.message, { bookingId, role: row.role });
        }
      }
    } else {
      written++;
      partialWritten = true; // first row committed — second row failure would be partial
    }
  }

  return { contribution_written: written, errors: rows.length - written };
}

// ── Attribuzione Contribution per partecipanti esterni (familiari/comunità) ───
// Una riga per post, role=promoter, contribution_kind=external_participants_event.
// Idempotente: UNIQUE (tenant_id, source_post_id, contribution_kind).

export async function attributeContributionForExternalParticipants(
  params: ExternalParticipantsParams,
): Promise<Pick<AttributionResult, 'contribution_written' | 'errors'>> {
  const {
    db, postId, postTenantId, externalCount, evidenceStatus,
    reportingPeriod = DEFAULT_REPORTING_PERIOD,
  } = params;

  if (externalCount <= 0) return { contribution_written: 0, errors: 0 };

  // Peso per persona secondo il pattern Nodo A di B161
  const weightPerPerson = evidenceStatus === 'verified'
    ? EXTERNAL_PARTICIPANT_VERIFIED_WEIGHT
    : EXTERNAL_PARTICIPANT_SELF_DECLARED_WEIGHT;

  const totalWeight = +(externalCount * weightPerPerson).toFixed(4);

  const row = {
    tenant_id:          postTenantId,
    source_booking_id:  null,    // non da booking, da external_participants_count
    source_post_id:     postId,
    role:               'promoter',
    contribution_kind:  'external_participants_event',
    impact_weight:      totalWeight,
    evidence_status:    evidenceStatus,
    reporting_period:   reportingPeriod,
  };

  const { error } = await (db as any)
    .schema('commons')
    .from('contribution_event')
    .insert(row);

  if (error) {
    if (error.code === '23505') {
      return { contribution_written: 1, errors: 0 }; // idempotente
    }
    console.error('[B166 cross-company-attribution] external participants insert error:', error.message, { postId });
    return { contribution_written: 0, errors: 1 };
  }

  return { contribution_written: 1, errors: 0 };
}
