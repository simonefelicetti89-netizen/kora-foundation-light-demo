// lib/live/op001-synthetic-records.ts
// Canonical synthetic records for OP-001 — shared between operator-flow and data-intake preview.
//
// Extracted from app/api/admin/operator-flow/route.ts so that:
//   - operator-flow (POST, writes to DB) uses the same records
//   - data-intake preview (GET, read-only) uses the same records without DB access
//
// All values are synthetic, non-PII, safe to return in API responses.

import type { RawUploadedRecord } from '@/lib/kora-engine/types';

// Pillar assignment for the 10 uploaded_record rows (index → pillar).
export const OP001_UPLOADED_PILLARS = [
  'LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY',
  'LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY',
] as const;

/**
 * Returns the 6 canonical synthetic UEF-candidate records for OP-001.
 * Deterministic. Same output on every call with the same batchId.
 */
export function getOp001SyntheticRecords(batchId: string): RawUploadedRecord[] {
  const make = (
    id: string, idx: number, nome: string, categoria: string, tipo: string,
    extra?: Record<string, unknown>,
  ): RawUploadedRecord => ({
    recordId:           `r-op-${id}`,
    batchId,
    rowIndex:           idx,
    detectedRecordType: 'welfare_program',
    raw: { nome_iniziativa: nome, categoria, tipo, ...extra },
  });

  return [
    make('01', 0, 'Programma di supporto psicologico',      'salute e benessere',    'consumed_service',      { partecipanti: 25 }),
    make('02', 1, 'Formazione professionale avanzata',       'crescita',              'training',              { partecipanti: 20 }),
    make('03', 2, 'Programma di mentoring inter-funzionale', 'mentoring',             'policy',                { partecipanti: 14 }),
    make('04', 3, 'Volontariato aziendale territoriale',     'impatto territoriale',  'collective_initiative', { partecipanti: 18 }),
    make('05', 4, 'Trasferimento competenze senior-junior',  'legacy conoscenza',     'training',              { partecipanti: 10 }),
    make('06', 5, 'Buoni pasto e welfare voucher',           'sollievo economico',    'monetary_benefit',      { partecipanti: 50 }),
  ];
}

/**
 * Returns the 10 pseudonymized uploaded_record payloads for OP-001.
 * Used by operator-flow (writes to DB) and preview (read-only, no DB writes).
 * Payloads are synthetic, safe, and contain no PII.
 */
export function getOp001UploadedPayloads(tenantCode: string): Array<{
  pseudonymId: string;
  pillar:      string;
  rawPayload:  Record<string, unknown>;
}> {
  return Array.from({ length: 10 }, (_, i) => ({
    pseudonymId: `PSY-OP-${tenantCode}-${String(i + 1).padStart(3, '0')}`,
    pillar:      OP001_UPLOADED_PILLARS[i],
    rawPayload:  { synthetic: true, tenant_code: tenantCode, row_index: i },
  }));
}
