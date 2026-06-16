// lib/live/office-attribution.ts
// B164 — Trigger di attribuzione d'ufficio per iniziative company-sourced nominative.
//
// Chiamato da persistKoraComputationResult dopo l'INSERT degli impact_unit (Step 5).
// Per ogni uef_record appena persistito, cerca gli attendees matched nella tabella
// personal.uploaded_record_attendee e attribuisce il PIB d'ufficio.
//
// INVARIANTI:
//   - Usa service-role client (ServiceDb) — stesso contesto di persistKoraComputationResult.
//   - Nomi grezzi: non transitano mai per questa funzione. Solo pseudonym_id e raw_hash.
//   - PIB attribuito: company_sourced + verified + is_exportable=true (regola B161).
//   - Idempotenza: ON CONFLICT on uq_worker_pib_uef_pillar (mig 018 U1).
//     23505 = già attribuito → silenzioso, non è un errore.
//   - Pending: log strutturato, NON silenziati, NON persi.
//   - Non scrive MAI su analytics.* o tabelle company-visible.
//   - Non blocca la persistenza principale: errori qui sono loggati, non propagati.

import type { ServiceDb } from '@/lib/supabase/server';
import { computeBaseWorkerPIBRows } from '@/services/worker-iu-computation/WorkerIUComputationService';
import type { UefRecordForWorkerIU } from '@/lib/types/domains/worker-pib-live';

export interface AttributionResult {
  attributed: number;  // righe worker_pib inserite con successo
  pending:    number;  // attendees con worker non provisionato
  skipped:    number;  // attendees matched ma uef_record non approvato o IU=0
  errors:     number;  // errori DB non-idempotency
}

// ── Internal types ────────────────────────────────────────────────────────────

interface AttendeeRow {
  source_uef_record_id: string;
  worker_identity_id:   string;
  status:               string;
}

// ── Fetch UEF records for attribution ─────────────────────────────────────────

async function fetchUefRecords(
  db:         ServiceDb,
  uefIds:     string[],
): Promise<Map<string, UefRecordForWorkerIU>> {
  const { data, error } = await (db as any)
    .schema('analytics')
    .from('uef_record')
    .select('id, eligibility, action_family, event_nature, primary_pillar, missing_fields, approved_for_impact_units, payload')
    .in('id', uefIds)
    .eq('approved_for_impact_units', true);

  if (error) {
    console.error('[B164 office-attribution] uef_record fetch error:', error.message);
    return new Map();
  }

  return new Map(
    ((data as any[]) ?? []).map((r) => [
      r.id as string,
      {
        id:                        r.id as string,
        eligibility:               (r.eligibility ?? 'blocked') as string,
        action_family:             r.action_family as string | null,
        event_nature:              r.event_nature as string | null,
        primary_pillar:            r.primary_pillar as string | null,
        missing_fields:            (r.missing_fields ?? []) as string[],
        approved_for_impact_units: r.approved_for_impact_units as boolean,
        payload:                   (r.payload ?? {}) as Record<string, unknown>,
      } satisfies UefRecordForWorkerIU,
    ]),
  );
}

// ── Main trigger function ─────────────────────────────────────────────────────

export async function triggerOfficeAttribution(params: {
  db:              ServiceDb;
  tenantId:        string;
  uefRecordIds:    string[];
  reportingPeriod: string;
}): Promise<AttributionResult> {
  const { db, tenantId, uefRecordIds, reportingPeriod } = params;
  const result: AttributionResult = { attributed: 0, pending: 0, skipped: 0, errors: 0 };

  if (uefRecordIds.length === 0) return result;

  // 1. Fetch attendees per i UEF record di questo scoring run
  const { data: attendees, error: attErr } = await (db as any)
    .schema('personal')
    .from('uploaded_record_attendee')
    .select('source_uef_record_id, worker_identity_id, status')
    .in('source_uef_record_id', uefRecordIds)
    .eq('tenant_id', tenantId);

  if (attErr) {
    console.error('[B164 office-attribution] attendee fetch error:', attErr.message);
    return result;
  }

  const rows = (attendees as AttendeeRow[] | null) ?? [];

  const matched = rows.filter((r) => r.status === 'matched' && r.worker_identity_id);
  const pending = rows.filter((r) => r.status === 'pending');

  result.pending = pending.length;

  if (pending.length > 0) {
    // Log strutturato — non silenziati, non persi
    console.warn('[B164 office-attribution] attendees in stato pending:', {
      count:          pending.length,
      uef_record_ids: [...new Set(pending.map((r) => r.source_uef_record_id))],
      tenant_id:      tenantId,
      note:           'worker non provisionato al momento dell\'attribuzione — riconciliazione futura necessaria',
    });
  }

  if (matched.length === 0) return result;

  // 2. Carica i UEF record approved (solo quelli con attendees matched)
  const uniqueUefIds = [...new Set(matched.map((r) => r.source_uef_record_id))];
  const uefMap = await fetchUefRecords(db, uniqueUefIds);

  // 3. Per ogni attendee matched: calcola PIB e inserisce
  for (const att of matched) {
    const uef = uefMap.get(att.source_uef_record_id);
    if (!uef) {
      // UEF non approved o non trovato — non attribuire
      result.skipped++;
      continue;
    }

    const pibRows = computeBaseWorkerPIBRows({
      workerIdentityId: att.worker_identity_id,
      reportingPeriod,
      sourceKind:       'company_sourced',
      uefRecord:        uef,
      participationId:  null,
    });

    if (pibRows.length === 0) {
      result.skipped++;
      continue;
    }

    // INSERT con gestione idempotency via U1 partial index (mig 018)
    const { error: insertErr } = await (db as any)
      .schema('personal')
      .from('worker_pib')
      .insert(pibRows);

    if (insertErr) {
      if (insertErr.code === '23505') {
        // Già attribuito — idempotente, non è un errore
        result.attributed += pibRows.length;
      } else {
        console.error('[B164 office-attribution] worker_pib insert error:', insertErr.message, {
          worker_identity_id: att.worker_identity_id,
          source_uef_record_id: att.source_uef_record_id,
        });
        result.errors++;
      }
    } else {
      result.attributed += pibRows.length;
    }
  }

  return result;
}
