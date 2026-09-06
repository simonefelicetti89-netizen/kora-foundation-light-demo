// b91b-roster-import.test.ts
// Workforce Bulk Import — B91-B test suite.
//
// Tests cover:
// 1. Header aliases — Italian → canonical mapping
// 2. Required fields
// 3. first_name / last_name optional
// 4. Forbidden field rejection (email, PIB, IU, health, consent…)
// 5. Boolean normalization (my_kora_enabled)
// 6. Duplicate employee_code blocking
// 7. N<10 segment warnings
// 8. buildRosterRecordsFromValidatedRows invariants (relocated, unchanged,
//    from WorkerProvisioningService.importDemoRoster — see
//    lib/roster-import/roster-record-builder.ts)
// 9. employer_can_view_individual_pib always false
// 10. worker_account_status always draft
// 11. No auth/email fields created
//
// No methodology changes. No DB changes. No auth changes.

import { describe, it, expect } from 'vitest';
import {
  normalizeHeader,
  isForbidden,
  HEADER_ALIASES,
  FORBIDDEN_PATTERNS,
} from '../../lib/roster-import/roster-parser';
import { validateRoster } from '../../lib/roster-import/roster-validation';
import { buildRosterRecordsFromValidatedRows } from '../../lib/roster-import/roster-record-builder';
import type { RosterParseResult } from '../../lib/roster-import/types';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeParseResult(
  rows: Array<Record<string, string>>,
  overrides: Partial<RosterParseResult> = {},
): RosterParseResult {
  return {
    fileName: 'test.csv',
    rawRows: rows,
    originalHeaders: Object.keys(rows[0] ?? {}),
    columns: [],
    forbiddenHeaders: [],
    hasBlockingError: false,
    blockingErrors: [],
    parserWarnings: [],
    totalRawRows: rows.length,
    ...overrides,
  };
}

function makeRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    employee_code: 'EMP-001',
    department:    'Operations',
    site:          'Milano HQ',
    first_name:    'Marco',
    last_name:     'Rossi',
    my_kora_enabled: 'false',
    ...overrides,
  };
}

// ── 1. normalizeHeader ────────────────────────────────────────────────────────

describe('normalizeHeader', () => {
  it('lowercases and trims', () => {
    expect(normalizeHeader('  Nome  ')).toBe('nome');
    expect(normalizeHeader('COGNOME')).toBe('cognome');
  });

  it('replaces spaces and hyphens with underscores', () => {
    expect(normalizeHeader('employee code')).toBe('employee_code');
    expect(normalizeHeader('employee-code')).toBe('employee_code');
    expect(normalizeHeader('data.assunzione')).toBe('data_assunzione');
  });

  it('strips non-alphanumeric characters except underscores', () => {
    expect(normalizeHeader('Codice (Dipendente)')).toBe('codice_dipendente');
    expect(normalizeHeader('My KORA!')).toBe('my_kora');
  });
});

// ── 2. HEADER_ALIASES — Italian → canonical mapping ──────────────────────────

describe('HEADER_ALIASES — Italian aliases', () => {
  it('nome → first_name', () => {
    expect(HEADER_ALIASES['nome']).toBe('first_name');
  });

  it('cognome → last_name', () => {
    expect(HEADER_ALIASES['cognome']).toBe('last_name');
  });

  it('reparto → department', () => {
    expect(HEADER_ALIASES['reparto']).toBe('department');
  });

  it('sede → site', () => {
    expect(HEADER_ALIASES['sede']).toBe('site');
  });

  it('matricola → employee_code', () => {
    expect(HEADER_ALIASES['matricola']).toBe('employee_code');
  });

  it('codice_dipendente → employee_code', () => {
    expect(HEADER_ALIASES['codice_dipendente']).toBe('employee_code');
  });

  it('abilita_my_kora → my_kora_enabled', () => {
    expect(HEADER_ALIASES['abilita_my_kora']).toBe('my_kora_enabled');
  });

  it('my_kora → my_kora_enabled', () => {
    expect(HEADER_ALIASES['my_kora']).toBe('my_kora_enabled');
  });

  it('tipo_contratto → contract_type', () => {
    expect(HEADER_ALIASES['tipo_contratto']).toBe('contract_type');
  });

  it('data_assunzione → hire_date', () => {
    expect(HEADER_ALIASES['data_assunzione']).toBe('hire_date');
  });

  it('dipartimento → department', () => {
    expect(HEADER_ALIASES['dipartimento']).toBe('department');
  });

  it('stabilimento → site', () => {
    expect(HEADER_ALIASES['stabilimento']).toBe('site');
  });
});

// ── 3. isForbidden ────────────────────────────────────────────────────────────

describe('isForbidden — forbidden header detection', () => {
  it('email is forbidden', () => {
    expect(isForbidden('email')).toBe(true);
    expect(isForbidden('e_mail')).toBe(true);
  });

  it('pib is forbidden', () => {
    expect(isForbidden('pib')).toBe(true);
    expect(isForbidden('individual_pib')).toBe(true);
    expect(isForbidden('personal_impact_balance')).toBe(true);
  });

  it('iu is forbidden', () => {
    expect(isForbidden('iu')).toBe(true);
    expect(isForbidden('individual_iu')).toBe(true);
    expect(isForbidden('impact_unit')).toBe(true);
  });

  it('health / medical fields are forbidden', () => {
    expect(isForbidden('medical')).toBe(true);
    expect(isForbidden('health')).toBe(true);
    expect(isForbidden('salute')).toBe(true);
  });

  it('disability is forbidden', () => {
    expect(isForbidden('disability')).toBe(true);
    expect(isForbidden('disabilita')).toBe(true);
  });

  it('psychological / mental_health is forbidden', () => {
    expect(isForbidden('psychological')).toBe(true);
    expect(isForbidden('mental_health')).toBe(true);
    expect(isForbidden('psicologico')).toBe(true);
  });

  it('salary / compensation is forbidden', () => {
    expect(isForbidden('salary')).toBe(true);
    expect(isForbidden('stipendio')).toBe(true);
    expect(isForbidden('compensation')).toBe(true);
    expect(isForbidden('ral')).toBe(true);
  });

  it('performance / rating is forbidden', () => {
    expect(isForbidden('performance')).toBe(true);
    expect(isForbidden('rating')).toBe(true);
    expect(isForbidden('valutazione')).toBe(true);
  });

  it('union / religion / political is forbidden', () => {
    expect(isForbidden('union')).toBe(true);
    expect(isForbidden('sindacato')).toBe(true);
    expect(isForbidden('religion')).toBe(true);
    expect(isForbidden('political')).toBe(true);
  });

  it('consent is forbidden', () => {
    expect(isForbidden('consent')).toBe(true);
    expect(isForbidden('consenso')).toBe(true);
  });

  it('phone / telefono is forbidden', () => {
    expect(isForbidden('phone')).toBe(true);
    expect(isForbidden('telefono')).toBe(true);
    expect(isForbidden('cellulare')).toBe(true);
  });

  it('codice_fiscale is forbidden', () => {
    expect(isForbidden('codice_fiscale')).toBe(true);
    expect(isForbidden('fiscal_code')).toBe(true);
    expect(isForbidden('cf')).toBe(true);
  });

  it('allowed fields are NOT forbidden', () => {
    expect(isForbidden('employee_code')).toBe(false);
    expect(isForbidden('department')).toBe(false);
    expect(isForbidden('site')).toBe(false);
    expect(isForbidden('first_name')).toBe(false);
    expect(isForbidden('last_name')).toBe(false);
    expect(isForbidden('my_kora_enabled')).toBe(false);
    expect(isForbidden('job_family')).toBe(false);
    expect(isForbidden('cluster')).toBe(false);
  });
});

// ── 4. FORBIDDEN_PATTERNS completeness ───────────────────────────────────────

describe('FORBIDDEN_PATTERNS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(FORBIDDEN_PATTERNS)).toBe(true);
    expect(FORBIDDEN_PATTERNS.length).toBeGreaterThan(10);
  });

  it('contains all critical patterns', () => {
    const critical = ['email', 'pib', 'iu', 'salary', 'medical', 'disability', 'consent', 'codice_fiscale'];
    for (const c of critical) {
      expect(FORBIDDEN_PATTERNS).toContain(c);
    }
  });
});

// ── 5. validateRoster — required fields ──────────────────────────────────────

describe('validateRoster — required fields', () => {
  it('passes with all required fields', () => {
    const result = makeParseResult([makeRow()]);
    const report = validateRoster(result);
    expect(report.blockingErrors).toHaveLength(0);
    expect(report.validRowCount).toBe(1);
  });

  it('blocks row missing employee_code', () => {
    const result = makeParseResult([makeRow({ employee_code: '' })]);
    const report = validateRoster(result);
    const allErrors = [...report.blockingErrors, ...report.rowErrors.flatMap(r => r.errors)];
    expect(allErrors.some(e => e.includes('employee_code'))).toBe(true);
    expect(report.validRowCount).toBe(0);
  });

  it('blocks row missing department', () => {
    const result = makeParseResult([makeRow({ department: '' })]);
    const report = validateRoster(result);
    const allErrors = [...report.blockingErrors, ...report.rowErrors.flatMap(r => r.errors)];
    expect(allErrors.some(e => e.includes('department'))).toBe(true);
    expect(report.validRowCount).toBe(0);
  });

  it('blocks row missing site', () => {
    const result = makeParseResult([makeRow({ site: '' })]);
    const report = validateRoster(result);
    const allErrors = [...report.blockingErrors, ...report.rowErrors.flatMap(r => r.errors)];
    expect(allErrors.some(e => e.includes('site'))).toBe(true);
    expect(report.validRowCount).toBe(0);
  });
});

// ── 6. validateRoster — first_name / last_name optional ──────────────────────

describe('validateRoster — names are optional', () => {
  it('accepts row without first_name and last_name', () => {
    const result = makeParseResult([makeRow({ first_name: '', last_name: '' })]);
    const report = validateRoster(result);
    expect(report.validRowCount).toBe(1);
    expect(report.blockingErrors).toHaveLength(0);
  });

  it('generates display_name from employee_code when names absent', () => {
    const result = makeParseResult([makeRow({ first_name: '', last_name: '', employee_code: 'EMP-42' })]);
    const report = validateRoster(result);
    expect(report.validRows[0]?.display_name).toBe('Lavoratore EMP-42');
  });

  it('generates display_name from names when present', () => {
    const result = makeParseResult([makeRow({ first_name: 'Giulia', last_name: 'Ferrari' })]);
    const report = validateRoster(result);
    expect(report.validRows[0]?.display_name).toBe('Giulia Ferrari');
  });

  it('warns but does not block when names are absent', () => {
    const result = makeParseResult([makeRow({ first_name: '', last_name: '' })]);
    const report = validateRoster(result);
    expect(report.warnings.some(w => w.includes('nome') || w.includes('display_name'))).toBe(true);
    expect(report.validRowCount).toBe(1);
  });
});

// ── 7. validateRoster — forbidden field parsing error propagation ─────────────

describe('validateRoster — forbidden field blocking', () => {
  it('propagates blockingErrors from parseResult', () => {
    const result = makeParseResult(
      [makeRow()],
      { blockingErrors: ['Colonna vietata: "email".'], hasBlockingError: true },
    );
    const report = validateRoster(result);
    expect(report.blockingErrors).toContain('Colonna vietata: "email".');
    expect(report.validRowCount).toBe(0);
  });

  it('returns zero valid rows when blockingErrors exist in parse result', () => {
    const result = makeParseResult(
      [makeRow(), makeRow({ employee_code: 'EMP-002' })],
      { blockingErrors: ['Colonna vietata: "pib".'], hasBlockingError: true },
    );
    const report = validateRoster(result);
    expect(report.validRowCount).toBe(0);
  });
});

// ── 8. validateRoster — boolean normalization ─────────────────────────────────

describe('validateRoster — my_kora_enabled boolean normalization', () => {
  const truthy = ['true', '1', 'yes', 'sì', 'si', 'vero', 'on', 'abilitato'];
  const falsy  = ['false', '0', 'no', 'falso', 'off', 'disabilitato', ''];

  for (const val of truthy) {
    it(`"${val}" → true`, () => {
      const result = makeParseResult([makeRow({ my_kora_enabled: val })]);
      const report = validateRoster(result);
      expect(report.validRows[0]?.my_kora_enabled).toBe(true);
    });
  }

  for (const val of falsy) {
    it(`"${val}" → false`, () => {
      const result = makeParseResult([makeRow({ my_kora_enabled: val })]);
      const report = validateRoster(result);
      expect(report.validRows[0]?.my_kora_enabled).toBe(false);
    });
  }

  it('unparseable value → false + warning', () => {
    const result = makeParseResult([makeRow({ my_kora_enabled: 'maybe' })]);
    const report = validateRoster(result);
    expect(report.validRows[0]?.my_kora_enabled).toBe(false);
    expect(report.warnings.some(w => w.includes('my_kora_enabled'))).toBe(true);
    expect(report.validRowCount).toBe(1); // not blocked
  });

  it('my_kora_enabled defaults to false when absent', () => {
    const row = makeRow();
    delete (row as Record<string, string>)['my_kora_enabled'];
    const result = makeParseResult([row]);
    const report = validateRoster(result);
    expect(report.validRows[0]?.my_kora_enabled).toBe(false);
  });
});

// ── 9. validateRoster — duplicate employee_code ───────────────────────────────

describe('validateRoster — duplicate employee_code', () => {
  it('blocks all rows with the same employee_code', () => {
    const result = makeParseResult([
      makeRow({ employee_code: 'EMP-001' }),
      makeRow({ employee_code: 'EMP-001' }),
      makeRow({ employee_code: 'EMP-002' }),
    ]);
    const report = validateRoster(result);
    // EMP-001 appears twice → both blocked; EMP-002 is valid
    expect(report.duplicateEmployeeCodes).toContain('EMP-001');
    expect(report.blockingErrors.some(e => e.includes('EMP-001'))).toBe(true);
    expect(report.validRowCount).toBe(1); // only EMP-002 passes
  });

  it('reports the row numbers of duplicates', () => {
    const result = makeParseResult([
      makeRow({ employee_code: 'DUP-99' }),
      makeRow({ employee_code: 'DUP-99' }),
    ]);
    const report = validateRoster(result);
    expect(report.blockingErrors.some(e => e.includes('DUP-99'))).toBe(true);
  });

  it('single occurrence is not flagged as duplicate', () => {
    const result = makeParseResult([
      makeRow({ employee_code: 'UNIQUE-1' }),
      makeRow({ employee_code: 'UNIQUE-2' }),
    ]);
    const report = validateRoster(result);
    expect(report.duplicateEmployeeCodes).toHaveLength(0);
    expect(report.validRowCount).toBe(2);
  });
});

// ── 10. validateRoster — N<10 segment warnings ────────────────────────────────

describe('validateRoster — segment size warnings', () => {
  it('warns for department with < 10 workers', () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow({ employee_code: `EMP-${i}`, department: 'Small Dept', site: `Site-${i}` }),
    );
    const result = makeParseResult(rows);
    const report = validateRoster(result);
    expect(report.segmentWarnings.some(w => w.dimension === 'department' && w.value === 'Small Dept')).toBe(true);
  });

  it('warns for site with < 10 workers', () => {
    const rows = Array.from({ length: 3 }, (_, i) =>
      makeRow({ employee_code: `EMP-${i}`, department: `Dept-${i}`, site: 'Tiny Site' }),
    );
    const result = makeParseResult(rows);
    const report = validateRoster(result);
    expect(report.segmentWarnings.some(w => w.dimension === 'site' && w.value === 'Tiny Site')).toBe(true);
  });

  it('does NOT warn for segments with ≥ 10 workers', () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      makeRow({ employee_code: `EMP-${i}`, department: 'Big Dept', site: 'Big Site' }),
    );
    const result = makeParseResult(rows);
    const report = validateRoster(result);
    expect(report.segmentWarnings.some(w => w.value === 'Big Dept')).toBe(false);
    expect(report.segmentWarnings.some(w => w.value === 'Big Site')).toBe(false);
  });

  it('segment warnings do not block import', () => {
    const rows = Array.from({ length: 2 }, (_, i) =>
      makeRow({ employee_code: `EMP-${i}`, department: 'Solo Dept', site: `Site-${i}` }),
    );
    const result = makeParseResult(rows);
    const report = validateRoster(result);
    expect(report.validRowCount).toBe(2);
    expect(report.blockingErrors).toHaveLength(0);
  });
});

// ── 11. importDemoRoster — privacy invariants ─────────────────────────────────

describe('buildRosterRecordsFromValidatedRows — invariants', () => {
  const baseRow = {
    employee_code:    'EMP-TEST-01',
    display_name:     'Test Lavoratore',
    first_name:       'Test',
    last_name:        'Lavoratore',
    department:       'Engineering',
    site:             'Roma',
    my_kora_enabled:  false,
    job_family:       '',
    contract_type:    '',
    employment_status:'',
    hire_date:        '',
    cluster:          '',
    _sourceIndex:     0,
  };

  it('returns an array of WorkerRosterRecord', () => {
    const records = buildRosterRecordsFromValidatedRows('test-co', 'tenant-test', [baseRow]);
    expect(Array.isArray(records)).toBe(true);
    expect(records).toHaveLength(1);
  });

  it('employer_can_view_individual_pib is ALWAYS false', () => {
    const records = buildRosterRecordsFromValidatedRows('test-co', 'tenant-test', [
      baseRow,
      { ...baseRow, employee_code: 'EMP-TEST-02', my_kora_enabled: true },
    ]);
    for (const r of records) {
      expect(r.employer_can_view_individual_pib).toBe(false);
    }
  });

  it('worker_account_status is ALWAYS draft', () => {
    const records = buildRosterRecordsFromValidatedRows('test-co', 'tenant-test', [baseRow]);
    expect(records[0]?.worker_account_status).toBe('draft');
  });

  it('consent_status is ALWAYS not_collected', () => {
    const records = buildRosterRecordsFromValidatedRows('test-co', 'tenant-test', [baseRow]);
    expect(records[0]?.consent_status).toBe('not_collected');
  });

  it('pib_private_enabled is ALWAYS false', () => {
    const records = buildRosterRecordsFromValidatedRows('test-co', 'tenant-test', [baseRow]);
    expect(records[0]?.pib_private_enabled).toBe(false);
  });

  it('my_kora_enabled reflects the validated row value', () => {
    const withKora    = { ...baseRow, employee_code: 'EMP-A', my_kora_enabled: true  };
    const withoutKora = { ...baseRow, employee_code: 'EMP-B', my_kora_enabled: false };
    const records = buildRosterRecordsFromValidatedRows('test-co', 'tenant-test', [withKora, withoutKora]);
    expect(records[0]?.my_kora_enabled).toBe(true);
    expect(records[1]?.my_kora_enabled).toBe(false);
  });

  it('worker_id starts with WRK-IMP-', () => {
    const records = buildRosterRecordsFromValidatedRows('test-co', 'tenant-test', [baseRow]);
    expect(records[0]?.worker_id.startsWith('WRK-IMP-')).toBe(true);
  });

  it('worker_id is deterministic from employee_code (dedup key)', () => {
    const r1 = buildRosterRecordsFromValidatedRows('co', 'tenant', [baseRow]);
    const r2 = buildRosterRecordsFromValidatedRows('co', 'tenant', [baseRow]);
    expect(r1[0]?.worker_id).toBe(r2[0]?.worker_id);
  });

  it('company_id and tenant_id are correctly set', () => {
    const records = buildRosterRecordsFromValidatedRows('acme-corp', 'tenant-acme', [baseRow]);
    expect(records[0]?.company_id).toBe('acme-corp');
    expect(records[0]?.tenant_id).toBe('tenant-acme');
  });

  it('no email field on any imported record', () => {
    const records = buildRosterRecordsFromValidatedRows('test-co', 'tenant-test', [baseRow]);
    // WorkerRosterRecord has optional email field — must be absent
    expect((records[0] as unknown as Record<string, unknown>)['email']).toBeUndefined();
  });

  it('included_in_aggregates is true for imported workers', () => {
    const records = buildRosterRecordsFromValidatedRows('test-co', 'tenant-test', [baseRow]);
    expect(records[0]?.included_in_aggregates).toBe(true);
  });

  it('returns empty array for empty input', () => {
    const records = buildRosterRecordsFromValidatedRows('test-co', 'tenant-test', []);
    expect(records).toHaveLength(0);
  });

  it('handles 100 rows without error', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      ...baseRow,
      employee_code: `EMP-BULK-${i}`,
      display_name:  `Lavoratore EMP-BULK-${i}`,
    }));
    const records = buildRosterRecordsFromValidatedRows('bulk-co', 'tenant-bulk', rows);
    expect(records).toHaveLength(100);
    for (const r of records) {
      expect(r.employer_can_view_individual_pib).toBe(false);
      expect(r.worker_account_status).toBe('draft');
    }
  });
});

// ── 12. validateRoster — existing employee code dedup ────────────────────────

describe('validateRoster — existing employee code exclusion', () => {
  it('excludes rows whose employee_code is already in existingEmployeeCodes', () => {
    const existing = new Set<string>(['ALREADY-HERE']);
    const result = makeParseResult([
      makeRow({ employee_code: 'ALREADY-HERE' }),
      makeRow({ employee_code: 'NEW-ONE' }),
    ]);
    const report = validateRoster(result, existing);
    expect(report.validRowCount).toBe(1);
    expect(report.validRows[0]?.employee_code).toBe('NEW-ONE');
  });
});

// ── 13. validateRoster — hire_date optional ───────────────────────────────────

describe('validateRoster — hire_date handling', () => {
  it('accepts valid ISO date', () => {
    const result = makeParseResult([makeRow({ hire_date: '2023-01-15' })]);
    const report = validateRoster(result);
    expect(report.validRows[0]?.hire_date).toBe('2023-01-15');
    expect(report.validRowCount).toBe(1);
  });

  it('ignores invalid hire_date with warning (does not block)', () => {
    const result = makeParseResult([makeRow({ hire_date: 'not-a-date' })]);
    const report = validateRoster(result);
    expect(report.validRows[0]?.hire_date).toBe('');
    expect(report.warnings.some(w => w.includes('hire_date'))).toBe(true);
    expect(report.validRowCount).toBe(1);
  });

  it('accepts missing hire_date silently', () => {
    const row = makeRow();
    delete (row as Record<string, string>)['hire_date'];
    const result = makeParseResult([row]);
    const report = validateRoster(result);
    expect(report.validRowCount).toBe(1);
  });
});
