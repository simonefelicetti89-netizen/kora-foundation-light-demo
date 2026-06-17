// lib/roster-import/roster-parser.ts
// Browser-safe CSV/XLSX roster parser — B91-B.
//
// Uses PapaParse and read-excel-file (replaces xlsx v0.18.5 — CVE-2023-30533, CVE-2024-22363).
// Does NOT import server-side data-intake parsers (csv-parser.ts, excel-parser.ts).
//
// Domain boundary:
//   Roster import → workforce population ("Who?")
//   Activity intake → event records ("What happened?")
// These paths never share validation logic, routing logic, or destination tables.

import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/browser';
import type { Row, CellValue } from 'read-excel-file/browser';
import type { RosterParseResult, RosterColumnInfo, RosterRawRow } from './types';

// ── Canonical header aliases ──────────────────────────────────────────────────
// Maps normalized header strings to canonical field names.

export const HEADER_ALIASES: Record<string, string> = {
  // employee_code (REQUIRED)
  employee_code:           'employee_code',
  codice_dipendente:       'employee_code',
  matricola:               'employee_code',
  codice:                  'employee_code',
  id_dipendente:           'employee_code',
  employee_id:             'employee_code',
  codice_lavoratore:       'employee_code',
  // first_name (OPTIONAL)
  first_name:              'first_name',
  nome:                    'first_name',
  // last_name (OPTIONAL)
  last_name:               'last_name',
  cognome:                 'last_name',
  // department (REQUIRED)
  department:              'department',
  reparto:                 'department',
  dipartimento:            'department',
  dept:                    'department',
  // site (REQUIRED)
  site:                    'site',
  sede:                    'site',
  stabilimento:            'site',
  location:                'site',
  localita:                'site',
  // my_kora_enabled (OPTIONAL, default false)
  my_kora_enabled:         'my_kora_enabled',
  abilita_my_kora:         'my_kora_enabled',
  my_kora:                 'my_kora_enabled',
  kora_enabled:            'my_kora_enabled',
  kora:                    'my_kora_enabled',
  // job_family (OPTIONAL)
  job_family:              'job_family',
  famiglia_professionale:  'job_family',
  ruolo:                   'job_family',
  job_profile:             'job_family',
  profilo:                 'job_family',
  // contract_type (OPTIONAL)
  contract_type:           'contract_type',
  tipo_contratto:          'contract_type',
  contratto:               'contract_type',
  // employment_status (OPTIONAL)
  employment_status:       'employment_status',
  stato_impiego:           'employment_status',
  stato:                   'employment_status',
  // hire_date (OPTIONAL)
  hire_date:               'hire_date',
  data_assunzione:         'hire_date',
  assunzione:              'hire_date',
  // cluster (OPTIONAL)
  cluster:                 'cluster',
  gruppo:                  'cluster',
  team:                    'cluster',
};

const REQUIRED_CANONICAL = new Set(['employee_code', 'department', 'site']);

// ── Forbidden header patterns ─────────────────────────────────────────────────
// File rejected if ANY header matches any of these patterns (exact or prefix/suffix match).
// Enforces the principle: roster = population data, never activity or sensitive data.

export const FORBIDDEN_PATTERNS: ReadonlyArray<string> = [
  'email', 'mail', 'e_mail', 'posta', 'posta_elettronica',
  'phone', 'tel', 'telefono', 'cellulare', 'mobile',
  'codice_fiscale', 'fiscal_code', 'cf', 'tax_code',
  'salary', 'stipendio', 'retribuzione', 'compensazione', 'compensation', 'ral',
  'performance', 'rating', 'valutazione', 'performance_rating',
  'pib', 'individual_pib', 'personal_impact_balance',
  'iu', 'individual_iu', 'impact_unit', 'impact_units',
  'medical', 'health', 'salute', 'medico', 'sanitario',
  'disability', 'disabilita', 'handicap', 'invalidita',
  'psychological', 'psicologico', 'mental_health', 'psicologia',
  'union', 'sindacato', 'rsu', 'sindacale',
  'religion', 'religione', 'fede',
  'political', 'politico', 'partito',
  'welfare_usage', 'program_usage', 'welfare_personale', 'attivita_personale',
  'consent', 'consenso',
  'private_activity', 'attivita_privata',
];

export function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s\-./\\]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export function isForbidden(normalized: string): boolean {
  return FORBIDDEN_PATTERNS.some(
    (p) => normalized === p || normalized.startsWith(p + '_') || normalized.endsWith('_' + p) || normalized.includes('_' + p + '_'),
  );
}

function columnStatus(normalized: string): RosterColumnInfo['status'] {
  if (isForbidden(normalized)) return 'forbidden';
  const canonical = HEADER_ALIASES[normalized];
  if (!canonical) return 'unknown';
  if (REQUIRED_CANONICAL.has(canonical)) return 'required';
  return 'optional';
}

function buildColumns(originalHeaders: string[]): {
  columns: RosterColumnInfo[];
  forbidden: string[];
  hasBlocking: boolean;
} {
  const columns: RosterColumnInfo[] = [];
  const forbidden: string[] = [];

  for (const h of originalHeaders) {
    const norm = normalizeHeader(h);
    const status = columnStatus(norm);
    const canonicalHeader = HEADER_ALIASES[norm] ?? null;
    columns.push({ originalHeader: h, canonicalHeader, status });
    if (status === 'forbidden') forbidden.push(h);
  }

  return { columns, forbidden, hasBlocking: forbidden.length > 0 };
}

function forbiddenError(header: string): string {
  return (
    `Colonna vietata: "${header}". ` +
    'Questo campo non appartiene al roster. ' +
    'Il roster descrive la popolazione, non le attività o dati sensibili.'
  );
}

// ── Cell value → string ───────────────────────────────────────────────────────

function cellToString(value: CellValue | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.trim();
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).trim();
}

// ── CSV path ──────────────────────────────────────────────────────────────────

function parseCsvText(text: string, fileName: string): RosterParseResult {
  const parserWarnings: string[] = [];
  const blockingErrors: string[] = [];

  // Strip UTF-8 BOM
  const content = text.replace(/^﻿/, '');

  if (!content.trim()) {
    return {
      fileName, rawRows: [], originalHeaders: [], columns: [],
      forbiddenHeaders: [], hasBlockingError: true,
      blockingErrors: ['File vuoto — nessun contenuto trovato.'],
      parserWarnings: [], totalRawRows: 0,
    };
  }

  // Detect delimiter
  const firstLine = content.split(/\r?\n/).find((l) => l.trim()) ?? '';
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis  = (firstLine.match(/;/g) ?? []).length;
  const tabs   = (firstLine.match(/\t/g) ?? []).length;
  const delimiter: ',' | ';' | '\t' =
    tabs > commas && tabs > semis ? '\t' : semis > commas ? ';' : ',';

  // Parse with PapaParse — header row becomes keys
  const result = Papa.parse<Record<string, string>>(content, {
    header:         true,
    delimiter,
    skipEmptyLines: true,
    dynamicTyping:  false,
    transformHeader: normalizeHeader,
  });

  for (const e of result.errors) {
    parserWarnings.push(`Riga ${(e.row ?? 0) + 1}: ${e.message}`);
  }

  // Recover original header text from raw file for display
  const rawHeaderLine = firstLine;
  const originalHeaders = rawHeaderLine
    .split(delimiter)
    .map((h) => h.replace(/^"(.*)"$/, '$1').trim());

  const { columns, forbidden, hasBlocking } = buildColumns(originalHeaders);
  if (hasBlocking) {
    for (const f of forbidden) blockingErrors.push(forbiddenError(f));
  }

  const normalizedHeaders = result.meta.fields ?? [];
  if (normalizedHeaders.length === 0) {
    blockingErrors.push('Nessuna intestazione rilevata nella prima riga.');
  }

  if (result.data.length === 0 && normalizedHeaders.length > 0) {
    blockingErrors.push('Nessuna riga dati trovata dopo l\'intestazione.');
  }

  // Remap rows: normalized header → canonical field
  const rawRows: RosterRawRow[] = result.data.map((row) => {
    const out: RosterRawRow = {};
    for (const nh of normalizedHeaders) {
      const canonical = HEADER_ALIASES[nh];
      if (canonical) {
        out[canonical] = String(row[nh] ?? '').trim();
      }
    }
    return out;
  });

  return {
    fileName,
    rawRows,
    originalHeaders,
    columns,
    forbiddenHeaders: forbidden,
    hasBlockingError: blockingErrors.length > 0,
    blockingErrors,
    parserWarnings,
    totalRawRows: result.data.length,
  };
}

// ── XLSX path — read-excel-file ───────────────────────────────────────────────

async function parseXlsxFile(file: File, fileName: string): Promise<RosterParseResult> {
  const blockingErrors: string[] = [];

  let rows: Row[];
  try {
    // readSheet reads the first sheet and returns SheetData (Row[])
    rows = await readSheet(file);
  } catch {
    return {
      fileName, rawRows: [], originalHeaders: [], columns: [],
      forbiddenHeaders: [], hasBlockingError: true,
      blockingErrors: ['Impossibile leggere il file Excel. Assicurati che sia un file .xlsx valido.'],
      parserWarnings: [], totalRawRows: 0,
    };
  }

  if (rows.length === 0) {
    return {
      fileName, rawRows: [], originalHeaders: [], columns: [],
      forbiddenHeaders: [], hasBlockingError: true,
      blockingErrors: ['Nessuna riga trovata nel file Excel.'],
      parserWarnings: [], totalRawRows: 0,
    };
  }

  // First row = headers
  const headerRow = rows[0];
  const originalHeaders = headerRow.map((h: CellValue | null) => String(h ?? ''));
  const { columns, forbidden, hasBlocking } = buildColumns(originalHeaders);
  if (hasBlocking) {
    for (const f of forbidden) blockingErrors.push(forbiddenError(f));
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    blockingErrors.push('Nessuna riga dati trovata nel file.');
  }

  // Remap rows using normalized canonical names
  const rawRows: RosterRawRow[] = dataRows
    .filter((row: Row) => row.some((cell: CellValue | null) => cell !== null && cell !== undefined && String(cell).trim() !== ''))
    .map((row: Row) => {
      const out: RosterRawRow = {};
      originalHeaders.forEach((h: string, i: number) => {
        const norm = normalizeHeader(h);
        const canonical = HEADER_ALIASES[norm];
        if (canonical) {
          out[canonical] = cellToString(row[i]);
        }
      });
      return out;
    });

  return {
    fileName,
    rawRows,
    originalHeaders,
    columns,
    forbiddenHeaders: forbidden,
    hasBlockingError: blockingErrors.length > 0,
    blockingErrors,
    parserWarnings: [],
    totalRawRows: dataRows.length,
  };
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function parseRosterFile(file: File): Promise<RosterParseResult> {
  // Size guard
  if (file.size > 5 * 1024 * 1024) {
    return {
      fileName: file.name, rawRows: [], originalHeaders: [], columns: [],
      forbiddenHeaders: [], hasBlockingError: true,
      blockingErrors: ['File troppo grande — massimo 5 MB per importazione roster.'],
      parserWarnings: [], totalRawRows: 0,
    };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const isXlsx = ext === 'xlsx' || ext === 'xls' || file.type.includes('spreadsheet') || file.type.includes('excel');
  const isCsv  = ext === 'csv' || file.type === 'text/csv' || file.type === 'text/plain' || (!isXlsx && ext !== '');

  if (!isXlsx && !isCsv) {
    return {
      fileName: file.name, rawRows: [], originalHeaders: [], columns: [],
      forbiddenHeaders: [], hasBlockingError: true,
      blockingErrors: [`Formato non supportato: ${file.name}. Usa CSV (.csv) o Excel (.xlsx).`],
      parserWarnings: [], totalRawRows: 0,
    };
  }

  if (isXlsx) {
    return parseXlsxFile(file, file.name);
  }

  const text = await file.text();
  return parseCsvText(text, file.name);
}
