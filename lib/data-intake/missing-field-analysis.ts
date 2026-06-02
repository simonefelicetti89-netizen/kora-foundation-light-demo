// lib/data-intake/missing-field-analysis.ts
// B27: Missing field analysis for KORA Data Intake.
// Pure function — no DB, no LLM, no side effects.
//
// Analyzes mapped rows to identify missing important fields and their severity.
// Used for operator guidance before accept — does NOT block submission unless blocking fields missing.

import type { CanonicalIntakeField } from './column-mapping';

// ── Severity classification ───────────────────────────────────────────────────

// Blocking: batch probably unusable without at least one of these groups
const BLOCKING_GROUPS: CanonicalIntakeField[][] = [
  ['initiative_name'],          // every record must be named
];

// Warning: important for scoring quality but not blocking
const WARNING_FIELDS: CanonicalIntakeField[] = [
  'amount', 'participants', 'source', 'evidence_level', 'budget_class',
  'category', 'type',
];

// Info: useful but optional (structural policies, enrichment context)
const INFO_FIELDS: CanonicalIntakeField[] = [
  'coverage', 'uptake', 'hours', 'provider', 'policy_evidence',
  'cost_center', 'description', 'pillar', 'reporting_period',
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type MissingFieldEntry = {
  rowIndex: number;
  missingFields: CanonicalIntakeField[];
  severity: 'info' | 'warning' | 'blocking';
};

export type MissingFieldSummary = {
  totalRows: number;
  missingByField: Partial<Record<CanonicalIntakeField, number>>;
  rowsNeedingCompletion: MissingFieldEntry[];
  blockingCount: number;
  warningCount: number;
  infoCount: number;
  overallSeverity: 'ok' | 'warning' | 'blocking';
  fillableWithDefaults: CanonicalIntakeField[];  // fields that could be batch-filled
};

// ── Main function ─────────────────────────────────────────────────────────────

export function analyzeMissingFields(rows: Array<Record<string, string>>): MissingFieldSummary {
  const missingByField: Partial<Record<CanonicalIntakeField, number>> = {};
  const rowsNeedingCompletion: MissingFieldEntry[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const missing: CanonicalIntakeField[] = [];

    // Check blocking groups
    let isBlocking = false;
    for (const group of BLOCKING_GROUPS) {
      const allMissing = group.every(f => !row[f] || row[f].trim() === '');
      if (allMissing) {
        for (const f of group) if (!missing.includes(f)) missing.push(f);
        isBlocking = true;
      }
    }

    // Check warning fields
    for (const f of WARNING_FIELDS) {
      if (!row[f] || row[f].trim() === '') {
        if (!missing.includes(f)) missing.push(f);
      }
    }

    // Check info fields
    for (const f of INFO_FIELDS) {
      if (!row[f] || row[f].trim() === '') {
        if (!missing.includes(f)) missing.push(f);
      }
    }

    // Count by field
    for (const f of missing) {
      missingByField[f] = (missingByField[f] ?? 0) + 1;
    }

    if (missing.length > 0) {
      const severity: 'blocking' | 'warning' | 'info' = isBlocking ? 'blocking'
        : missing.some(f => WARNING_FIELDS.includes(f)) ? 'warning' : 'info';
      rowsNeedingCompletion.push({ rowIndex: i, missingFields: missing, severity });
    }
  }

  const blockingCount = rowsNeedingCompletion.filter(r => r.severity === 'blocking').length;
  const warningCount  = rowsNeedingCompletion.filter(r => r.severity === 'warning').length;
  const infoCount     = rowsNeedingCompletion.filter(r => r.severity === 'info').length;

  const overallSeverity =
    blockingCount > 0 ? 'blocking' :
    warningCount  > 0 ? 'warning' : 'ok';

  // Fields that can be filled via batch defaults (warning/info fields with >50% missing)
  const fillableWithDefaults: CanonicalIntakeField[] = [];
  const fillableFields: CanonicalIntakeField[] = [
    'amount', 'source', 'evidence_level', 'budget_class',
    'provider', 'reporting_period', 'coverage', 'uptake', 'hours',
  ];
  for (const f of fillableFields) {
    const missing = missingByField[f] ?? 0;
    if (rows.length > 0 && missing / rows.length > 0.4) {
      fillableWithDefaults.push(f);
    }
  }

  return {
    totalRows: rows.length,
    missingByField,
    rowsNeedingCompletion,
    blockingCount,
    warningCount,
    infoCount,
    overallSeverity,
    fillableWithDefaults,
  };
}
