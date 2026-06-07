// lib/roster-import/types.ts
// Domain types for workforce roster import (B91-B).
//
// Roster import answers "Who belongs to the workforce?"
// Activity/Data Intake answers "What happened?"
// These domains are permanently separate. Do not merge with ingestion types.

// ── Parse output (low-level, pre-validation) ──────────────────────────────────

export interface RosterRawRow {
  [canonicalKey: string]: string;
}

export interface RosterColumnInfo {
  originalHeader: string;
  canonicalHeader: string | null; // null = unmapped
  status: 'required' | 'optional' | 'forbidden' | 'unknown';
}

export interface RosterParseResult {
  fileName: string;
  rawRows: RosterRawRow[];
  originalHeaders: string[];
  columns: RosterColumnInfo[];
  forbiddenHeaders: string[];
  hasBlockingError: boolean;
  blockingErrors: string[];
  parserWarnings: string[];
  totalRawRows: number;
}

// ── Validated row (post-validation, ready for import) ─────────────────────────

export interface ValidatedRosterRow {
  employee_code: string;
  display_name: string;
  first_name: string;
  last_name: string;
  department: string;
  site: string;
  my_kora_enabled: boolean;
  job_family: string;
  contract_type: string;
  employment_status: string;
  hire_date: string;
  cluster: string;
  _sourceIndex: number;
}

// ── Validation report ─────────────────────────────────────────────────────────

export interface SegmentSizeWarning {
  dimension: 'department' | 'site';
  value: string;
  count: number;
}

export interface RowValidationResult {
  isValid: boolean;
  rowIndex: number;
  errors: string[];
  warnings: string[];
  normalizations: string[];
}

export interface RosterValidationReport {
  validRows: ValidatedRosterRow[];
  blockingErrors: string[];
  rowErrors: RowValidationResult[];
  warnings: string[];
  autoNormalizations: string[];
  segmentWarnings: SegmentSizeWarning[];
  duplicateEmployeeCodes: string[];
  totalInputRows: number;
  validRowCount: number;
  blockedRowCount: number;
  warnedRowCount: number;
}
