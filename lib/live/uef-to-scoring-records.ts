// lib/live/uef-to-scoring-records.ts
// Adapter: analytics.uef_record (approved) → RawUploadedRecord[] for runKoraPipeline.
//
// Pure function — no DB, no side effects.
// Only approved_for_scoring=true records reach this function (filtered upstream).
// Maps UEF DB fields into the raw dict that budget-evidence, eligibility-gate,
// pillar-mapping, and activation-engine read.
// No PII. No synthetic fixtures. No getOp001SyntheticRecords.

import type { RawUploadedRecord } from '@/lib/kora-engine/types';

// ── Input type ─────────────────────────────────────────────────────────────────
// Matches the fields selected from analytics.uef_record.

export interface UefRowForScoring {
  id:             string;
  raw_name:       string;
  eligibility:    string;            // 'eligible' | 'limited' | 'blocked'
  primary_pillar: string | null;
  action_family:  string | null;
  event_nature:   string | null;
  payload:        Record<string, unknown>;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

/**
 * Converts approved uef_record DB rows into RawUploadedRecord[] for the KORA pipeline.
 *
 * The raw dict is populated so that the downstream engines can process it:
 *   - budget-evidence reads: budget_amount, importo, amount, fonte, source, evidence_type
 *   - eligibility-gate reads: categoria, tipo, nome_iniziativa
 *   - pillar-mapping reads: pillar, categoria, tipo
 *   - activation-engine reads: partecipanti, department_group, site
 *
 * The eligibility-gate will re-classify from raw (same keywords as B5 interpreter).
 * approved_for_scoring = true records only — caller guarantees this invariant.
 */
export function buildScoringRecordsFromApprovedUef(
  uefRows: UefRowForScoring[],
  batchId: string,
): RawUploadedRecord[] {
  return uefRows.map((row, i) => {
    const pl = (row.payload ?? {}) as Record<string, unknown>;

    const raw: Record<string, unknown> = {
      // ── Initiative identity ─────────────────────────────────────────────────
      nome_iniziativa: row.raw_name,

      // ── Category / type ─────────────────────────────────────────────────────
      // Used by: eligibility-gate, pillar-mapping, care-economy
      categoria: row.action_family  ?? pl['category']  ?? pl['categoria'] ?? '',
      tipo:      row.event_nature   ?? pl['type']       ?? pl['tipo']      ?? pl['event_type'] ?? '',

      // ── Pillar hint ──────────────────────────────────────────────────────────
      // Used by: pillar-mapping (as a secondary signal)
      pillar: row.primary_pillar ?? pl['pillar'] ?? null,

      // ── Budget fields ────────────────────────────────────────────────────────
      // Used by: budget-evidence AMOUNT_KEY_SIGNALS
      budget_amount: pl['budget_amount'] ?? null,
      importo:       pl['budget_amount'] ?? null,   // Italian alias
      amount:        pl['budget_amount'] ?? null,

      // ── Evidence / source ────────────────────────────────────────────────────
      // source_tier contains the original keyword (e.g. 'export fornitore welfare')
      // which budget-evidence uses for L3/L2/L1/L0 level detection.
      fonte:         pl['source_tier']   ?? null,   // Italian alias for SOURCE_KEY_SIGNALS
      source:        pl['source_tier']   ?? null,
      evidence_type: pl['evidence_level'] ?? null,

      // ── Participants ─────────────────────────────────────────────────────────
      // Used by: activation-engine, BTI
      partecipanti: pl['participants'] ?? null,     // Italian alias
      participants: pl['participants'] ?? null,

      // ── Period / segmentation ────────────────────────────────────────────────
      period:           pl['period']           ?? null,
      department_group: pl['department_group'] ?? null,
      site:             pl['site']             ?? null,

      // ── B11: enrichment classification passthrough ───────────────────────────
      budget_source:       pl['budget_source']       ?? null,
      initiative_domain:   pl['initiative_domain']   ?? null,
      budget_class:        pl['budget_class']        ?? null,
      needs_enrichment:    pl['needs_enrichment']    ?? false,
      financial_confidence: pl['financial_confidence'] ?? null,

      // ── B6 traceability metadata (non-PII) ──────────────────────────────────
      b6_source:          'approved_uef_record',
      b6_uef_record_id:   row.id,
      b6_event_type:      pl['event_type']     ?? null,
      b6_evidence_level:  pl['evidence_level'] ?? null,
      b6_reason_codes:    pl['reason_codes']   ?? [],
      b6_interpreter:     pl['interpreter_version'] ?? '0.1',
      b6_approved_for_scoring: true,
      b11_enriched:       pl['b11_enriched']   ?? false,
    };

    return {
      recordId:           `uef-${row.id}`,
      batchId,
      rowIndex:           i,
      detectedRecordType: 'welfare_program',
      raw,
    };
  });
}
