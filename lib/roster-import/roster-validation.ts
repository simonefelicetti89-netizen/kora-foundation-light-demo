// lib/roster-import/roster-validation.ts
// Validation engine for workforce roster import — B91-B.
//
// Pure function: takes RosterParseResult, returns RosterValidationReport.
// No side effects, no service calls, no DB access.
//
// Blocking errors → import cannot proceed.
// Warnings       → import proceeds with flagged rows.
// Normalizations → silent corrections, logged for transparency.

import type {
  RosterParseResult,
  RosterValidationReport,
  ValidatedRosterRow,
  RowValidationResult,
  SegmentSizeWarning,
} from './types';
import { SAFE_AGGREGATION_THRESHOLD } from '@/lib/constants/kora';

// ── Boolean normalization ─────────────────────────────────────────────────────

const BOOLEAN_TRUE  = new Set(['sì', 'si', 'yes', 'true', '1', 'vero', 'on', 'abilitato']);
const BOOLEAN_FALSE = new Set(['no', 'false', '0', 'falso', 'off', 'disabilitato']);

function normalizeBoolean(raw: string): {
  value: boolean;
  wasNormalized: boolean;
  unparseable: boolean;
} {
  const lower = raw.trim().toLowerCase();
  if (!lower) return { value: false, wasNormalized: false, unparseable: false };
  if (BOOLEAN_TRUE.has(lower))  return { value: true,  wasNormalized: lower !== 'true',  unparseable: false };
  if (BOOLEAN_FALSE.has(lower)) return { value: false, wasNormalized: lower !== 'false', unparseable: false };
  return { value: false, wasNormalized: false, unparseable: true };
}

// ── Privacy threshold ─────────────────────────────────────────────────────────
// CC-002 / I2: imported from the single canonical source (lib/constants/kora.ts)
// — do not redefine locally.

const PRIVACY_THRESHOLD = SAFE_AGGREGATION_THRESHOLD;

// ── Main validation function ──────────────────────────────────────────────────

export function validateRoster(
  parseResult: RosterParseResult,
  existingEmployeeCodes: ReadonlySet<string> = new Set(),
): RosterValidationReport {
  const blockingErrors: string[]    = [...parseResult.blockingErrors];
  const warnings: string[]          = [];
  const autoNormalizations: string[] = [];
  const rowErrors: RowValidationResult[] = [];
  const validRows: ValidatedRosterRow[]  = [];

  // Early exit: forbidden headers or other parse-level blocking errors
  if (blockingErrors.length > 0) {
    return {
      validRows: [],
      blockingErrors,
      rowErrors: [],
      warnings: [],
      autoNormalizations: [],
      segmentWarnings: [],
      duplicateEmployeeCodes: [],
      totalInputRows: parseResult.totalRawRows,
      validRowCount: 0,
      blockedRowCount: parseResult.totalRawRows,
      warnedRowCount: 0,
    };
  }

  // ── Pre-pass: build employee_code → row-index map for dedup check ─────────

  const codeToRowIndices = new Map<string, number[]>();
  for (let i = 0; i < parseResult.rawRows.length; i++) {
    const code = (parseResult.rawRows[i]?.['employee_code'] ?? '').trim();
    if (code) {
      if (!codeToRowIndices.has(code)) codeToRowIndices.set(code, []);
      codeToRowIndices.get(code)!.push(i + 1); // 1-indexed for user messages
    }
  }

  // Find duplicates within file
  const duplicateEmployeeCodes: string[] = [];
  for (const [code, indices] of codeToRowIndices) {
    if (indices.length > 1) {
      duplicateEmployeeCodes.push(code);
      blockingErrors.push(
        `Codice dipendente duplicato nel file: "${code}" — righe ${indices.join(', ')}. Correggi prima di importare.`,
      );
    }
  }

  // ── Row-level validation ──────────────────────────────────────────────────

  for (let i = 0; i < parseResult.rawRows.length; i++) {
    const row = parseResult.rawRows[i]!;
    const rowNum = i + 1;
    const rowErrs: string[]  = [];
    const rowWarns: string[] = [];
    const rowNorms: string[] = [];

    // Required fields
    const employeeCode = (row['employee_code'] ?? '').trim();
    const department   = (row['department']    ?? '').trim();
    const site         = (row['site']          ?? '').trim();

    if (!employeeCode) rowErrs.push(`Riga ${rowNum}: employee_code mancante — campo obbligatorio.`);
    if (!department)   rowErrs.push(`Riga ${rowNum}: department mancante — campo obbligatorio.`);
    if (!site)         rowErrs.push(`Riga ${rowNum}: site mancante — campo obbligatorio.`);

    // Duplicate within file (both rows are invalid)
    if (employeeCode && (codeToRowIndices.get(employeeCode)?.length ?? 0) > 1) {
      rowErrs.push(`Riga ${rowNum}: employee_code "${employeeCode}" duplicato — riga esclusa.`);
    }

    // Existing employee_code from previous session imports
    if (employeeCode && existingEmployeeCodes.has(employeeCode)) {
      rowErrs.push(`Riga ${rowNum}: employee_code "${employeeCode}" già presente nel roster — riga ignorata.`);
    }

    // Optional names
    const firstName = (row['first_name'] ?? '').trim();
    const lastName  = (row['last_name']  ?? '').trim();
    if (!firstName || !lastName) {
      rowWarns.push(
        `Riga ${rowNum}: nome/cognome assenti — display_name generato da employee_code ("Lavoratore ${employeeCode || rowNum}").`,
      );
    }

    // my_kora_enabled normalization
    const rawKora = (row['my_kora_enabled'] ?? '').trim();
    const { value: myKoraEnabled, wasNormalized, unparseable } = normalizeBoolean(rawKora);
    if (unparseable && rawKora) {
      rowWarns.push(
        `Riga ${rowNum}: my_kora_enabled non riconoscibile ("${rawKora}") — impostato a false.`,
      );
    } else if (wasNormalized && rawKora) {
      rowNorms.push(
        `Riga ${rowNum}: my_kora_enabled normalizzato ("${rawKora}" → ${myKoraEnabled}).`,
      );
    }

    // hire_date: drop silently if not parseable
    const rawHireDate = (row['hire_date'] ?? '').trim();
    let hireDate = rawHireDate;
    if (rawHireDate && isNaN(Date.parse(rawHireDate))) {
      rowWarns.push(`Riga ${rowNum}: hire_date non valida ("${rawHireDate}") — campo ignorato.`);
      hireDate = '';
    }

    const isValid = rowErrs.length === 0;

    if (isValid) {
      const displayName =
        firstName && lastName
          ? `${firstName} ${lastName}`
          : `Lavoratore ${employeeCode}`;

      validRows.push({
        employee_code:    employeeCode,
        display_name:     displayName,
        first_name:       firstName,
        last_name:        lastName,
        department,
        site,
        my_kora_enabled:  myKoraEnabled,
        job_family:       (row['job_family']       ?? '').trim(),
        contract_type:    (row['contract_type']    ?? '').trim(),
        employment_status:(row['employment_status']?? '').trim(),
        hire_date:        hireDate,
        cluster:          (row['cluster']          ?? '').trim(),
        _sourceIndex:     i,
      });
    }

    for (const w of rowWarns) warnings.push(w);
    for (const n of rowNorms) autoNormalizations.push(n);

    rowErrors.push({ isValid, rowIndex: i, errors: rowErrs, warnings: rowWarns, normalizations: rowNorms });
  }

  // ── Segment size warnings (N<10 → will be suppressed in employer views) ───

  const segmentWarnings: SegmentSizeWarning[] = [];
  const deptCounts = new Map<string, number>();
  const siteCounts = new Map<string, number>();

  for (const r of validRows) {
    deptCounts.set(r.department, (deptCounts.get(r.department) ?? 0) + 1);
    siteCounts.set(r.site,       (siteCounts.get(r.site)       ?? 0) + 1);
  }

  for (const [dept, count] of deptCounts) {
    if (count < PRIVACY_THRESHOLD) {
      segmentWarnings.push({ dimension: 'department', value: dept, count });
      warnings.push(
        `Reparto "${dept}": ${count} lavorator${count === 1 ? 'e' : 'i'} — sotto soglia privacy (N<10). ` +
        'Questo segmento non sarà visibile all\'azienda nei dashboard aggregati.',
      );
    }
  }
  for (const [site, count] of siteCounts) {
    if (count < PRIVACY_THRESHOLD) {
      segmentWarnings.push({ dimension: 'site', value: site, count });
      warnings.push(
        `Sede "${site}": ${count} lavorator${count === 1 ? 'e' : 'i'} — sotto soglia privacy (N<10). ` +
        'Questo segmento non sarà visibile all\'azienda nei dashboard aggregati.',
      );
    }
  }

  // ── Zero valid rows check ─────────────────────────────────────────────────

  if (validRows.length === 0 && blockingErrors.length === 0) {
    blockingErrors.push('Nessuna riga valida dopo la validazione. Correggi gli errori e riprova.');
  }

  return {
    validRows,
    blockingErrors,
    rowErrors,
    warnings,
    autoNormalizations,
    segmentWarnings,
    duplicateEmployeeCodes,
    totalInputRows:  parseResult.rawRows.length,
    validRowCount:   validRows.length,
    blockedRowCount: parseResult.rawRows.length - validRows.length,
    warnedRowCount:  rowErrors.filter((r) => r.warnings.length > 0 && r.isValid).length,
  };
}
