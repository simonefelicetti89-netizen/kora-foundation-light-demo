// lib/upload/file-parser.ts
// Client-side Excel/CSV parser for KORA Foundation Light Pilot uploads.
//
// SECURITY NOTE: xlsx package has known Prototype Pollution / ReDoS advisories.
// This function is BROWSER-ONLY and parses company-supplied files in memory.
// Data never leaves the browser. No server calls. No persistence.
// Acceptable risk for a controlled guided-pilot context with known file sources.
//
// DOCTRINE: Uploaded data must never mix with synthetic seed data.
// This module produces ParsedUploadResult — a pure in-memory object.
// The caller is responsible for keeping it separate from demo state.

import * as XLSX from 'xlsx';
import Papa from 'papaparse';

import type {
  RawUploadedRecord,
  UploadValidationIssue,
  DetectedRecordType,
  UploadFileType,
  ValidationIssueSeverity,
} from '@/lib/kora-engine/types';

// ── ParsedUploadResult ─────────────────────────────────────────────────────────

export interface ParsedUploadResult {
  fileName: string;
  fileType: UploadFileType | 'unknown';
  rowCount: number;
  columnCount: number;
  headers: string[];
  rows: RawUploadedRecord[];
  previewRows: RawUploadedRecord[];      // first 5 non-empty rows
  validationIssues: UploadValidationIssue[];
  detectedRecordTypes: DetectedRecordType[];
  parsingWarnings: string[];
  availableSheets?: string[];            // xlsx only, when multiple sheets present
}

const PREVIEW_ROW_COUNT = 5;

// ── Internal helpers ───────────────────────────────────────────────────────────

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isRowEmpty(record: Record<string, unknown>): boolean {
  return Object.values(record).every(
    (v) => v === null || v === undefined || String(v).trim() === '',
  );
}

// Parse Italian / mixed numeric formats without crashing.
// 1.234,56 → 1234.56 | 1234,56 → 1234.56 | € 1.234,56 → 1234.56
// Returns original value as-is if no numeric pattern is detected.
function coerceNumericValue(v: unknown): unknown {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return v;

  const s = v.replace(/€/g, '').replace(/\s/g, '').trim();
  if (s === '') return v;

  // Italian format: thousands dot + comma decimal (e.g. 1.234,56)
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) {
    const parsed = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return isNaN(parsed) ? v : parsed;
  }
  // Plain comma decimal (e.g. 1234,56)
  if (/^\d+(,\d+)$/.test(s)) {
    const parsed = parseFloat(s.replace(',', '.'));
    return isNaN(parsed) ? v : parsed;
  }
  // Already English decimal (e.g. 1234.56)
  if (/^\d+(\.\d+)?$/.test(s)) {
    const parsed = parseFloat(s);
    return isNaN(parsed) ? v : parsed;
  }
  return v;
}

function applyNumericCoercion(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    result[k] = coerceNumericValue(v);
  }
  return result;
}

function makeIssue(
  issueId: string,
  severity: ValidationIssueSeverity,
  field: string,
  message: string,
  recommendedAction: string,
): UploadValidationIssue {
  return { issueId, severity, field, message, recommendedAction };
}

// Heuristic: infer record type from header set.
function detectRecordType(normalizedHeaders: string[]): DetectedRecordType {
  const has = (keywords: string[]) =>
    normalizedHeaders.some((h) => keywords.some((k) => h.includes(k)));

  if (has(['fattura', 'invoice', 'ordine', 'contratto', 'fonte budget', 'budget source'])) return 'budget';
  if (has(['formazione', 'training', 'corso', 'lms', 'upskilling', 'reskilling', 'certificazione'])) return 'training';
  if (has(['headcount', 'forza lavoro', 'workforce', 'turnover', 'assenteismo', 'absentee', 'retention'])) return 'hr_aggregate';
  if (has(['smart working', 'disconnessione', 'ferie illimitate', 'no meeting', 'congedo', 'solidarity', 'solidarietà'])) return 'structural_policy';
  if (has(['welfare', 'servizio', 'benefit', 'iniziativa', 'programma', 'provider', 'fornitore', 'partecipanti', 'fruitori'])) return 'welfare_program';
  return 'unknown';
}

function buildBatchId(fileName: string): string {
  return `batch_${fileName.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}_${Date.now()}`;
}

function buildRecordId(batchId: string, index: number): string {
  return `rec_${batchId}_${index}`;
}

function toRows(
  rawRecords: Record<string, unknown>[],
  headers: string[],
  batchId: string,
  sheetName?: string,
): RawUploadedRecord[] {
  const normalizedHeaders = headers.map(normalizeHeader);
  const recordType = detectRecordType(normalizedHeaders);

  return rawRecords
    .filter((r) => !isRowEmpty(r))
    .map((raw, idx) => ({
      recordId: buildRecordId(batchId, idx),
      batchId,
      raw: applyNumericCoercion(raw),
      rowIndex: idx,
      sourceSheet: sheetName,
      detectedRecordType: recordType,
    }));
}

// ── CSV parsing ────────────────────────────────────────────────────────────────

async function parseCsv(
  file: File,
  batchId: string,
  issues: UploadValidationIssue[],
  warnings: string[],
): Promise<{ headers: string[]; rows: RawUploadedRecord[] }> {
  const content = await file.text();

  if (!content.trim()) {
    issues.push(makeIssue('csv-empty', 'error', 'file', 'Il file CSV è vuoto.', 'Verificare il file e ricaricare.'));
    return { headers: [], rows: [] };
  }

  // Detect delimiter: count ; vs , in first line
  const firstLine = content.split('\n')[0] ?? '';
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  if (semicolonCount > 0 && commaCount > 0) {
    warnings.push('Rilevati sia virgole che punti e virgola come separatori. Usato il separatore più frequente nella prima riga.');
  }

  const result = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    delimiter,
    skipEmptyLines: true,
    dynamicTyping: false, // We do our own coercion for Italian formats
    transformHeader: normalizeHeader,
  });

  if (result.errors.length > 0) {
    result.errors.slice(0, 3).forEach((e, i) => {
      issues.push(makeIssue(
        `csv-parse-${i}`,
        'warning',
        `row_${e.row ?? 'unknown'}`,
        `Errore di parsing CSV: ${e.message}`,
        'Verificare la formattazione del file.',
      ));
    });
  }

  const headers = result.meta.fields ?? [];
  if (headers.length === 0) {
    issues.push(makeIssue('csv-no-headers', 'error', 'headers', 'Nessuna intestazione rilevata nel file CSV.', 'Il file deve avere una riga di intestazione.'));
  }

  const rows = toRows(result.data, headers, batchId);
  return { headers, rows };
}

// ── XLSX / XLS parsing ─────────────────────────────────────────────────────────

async function parseXlsx(
  file: File,
  batchId: string,
  issues: UploadValidationIssue[],
  warnings: string[],
): Promise<{ headers: string[]; rows: RawUploadedRecord[]; availableSheets: string[] }> {
  const buffer = await file.arrayBuffer();

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch {
    issues.push(makeIssue('xlsx-corrupt', 'error', 'file', 'Il file non può essere letto. Potrebbe essere corrotto o in un formato non supportato.', 'Verificare il file e ricaricare.'));
    return { headers: [], rows: [], availableSheets: [] };
  }

  const availableSheets = workbook.SheetNames;
  if (availableSheets.length === 0) {
    issues.push(makeIssue('xlsx-no-sheets', 'error', 'file', 'Il file Excel non contiene fogli.', 'Verificare il file.'));
    return { headers: [], rows: [], availableSheets: [] };
  }

  if (availableSheets.length > 1) {
    warnings.push(`Il file contiene ${availableSheets.length} fogli: ${availableSheets.join(', ')}. Analizzato il primo foglio: "${availableSheets[0]}".`);
  }

  const sheetName = availableSheets[0];
  const worksheet = workbook.Sheets[sheetName];

  // Get headers from first row
  const rawArray = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: null });

  if (rawArray.length === 0) {
    issues.push(makeIssue('xlsx-empty', 'error', 'file', 'Il foglio Excel è vuoto.', 'Verificare il file.'));
    return { headers: [], rows: [], availableSheets };
  }

  const headerRow = rawArray[0];
  if (!Array.isArray(headerRow)) {
    issues.push(makeIssue('xlsx-no-headers', 'error', 'headers', 'Nessuna riga di intestazione rilevata.', 'Il file deve avere una riga di intestazione nella prima riga.'));
    return { headers: [], rows: [], availableSheets };
  }

  const headers = headerRow
    .map((h) => normalizeHeader(String(h ?? '')))
    .filter((h) => h !== '');

  if (headers.length === 0) {
    issues.push(makeIssue('xlsx-empty-headers', 'error', 'headers', 'Le intestazioni sono vuote.', 'Verificare la prima riga del file.'));
    return { headers: [], rows: [], availableSheets };
  }

  // Parse body with header mapping
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
    raw: false,  // Return formatted strings; we handle numeric coercion ourselves
  });

  // Re-key records using our normalized headers
  const normalizedRecords: Record<string, unknown>[] = records.map((record) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      out[normalizeHeader(k)] = v;
    }
    return out;
  });

  const rows = toRows(normalizedRecords, headers, batchId, sheetName);
  return { headers, rows, availableSheets };
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function parseUploadedFile(file: File): Promise<ParsedUploadResult> {
  const issues: UploadValidationIssue[] = [];
  const warnings: string[] = [];
  const batchId = buildBatchId(file.name);

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const fileType: UploadFileType | 'unknown' =
    ext === 'csv'  ? 'csv'  :
    ext === 'xlsx' ? 'xlsx' :
    ext === 'xls'  ? 'xls'  :
    ext === 'json' ? 'json' :
    'unknown';

  if (fileType === 'unknown') {
    issues.push(makeIssue(
      'unsupported-type',
      'error',
      'file',
      `Tipo di file non supportato: .${ext}. Formati accettati: .xlsx, .xls, .csv`,
      'Ricaricare il file in formato CSV o Excel.',
    ));
    return {
      fileName: file.name,
      fileType: 'unknown',
      rowCount: 0,
      columnCount: 0,
      headers: [],
      rows: [],
      previewRows: [],
      validationIssues: issues,
      detectedRecordTypes: ['unknown'],
      parsingWarnings: warnings,
    };
  }

  if (fileType === 'json') {
    issues.push(makeIssue(
      'json-not-supported',
      'warning',
      'file',
      'Il formato JSON non è supportato nel pilot guidato. Usare CSV o Excel.',
      'Esportare i dati in formato .xlsx o .csv.',
    ));
    return {
      fileName: file.name,
      fileType: 'json',
      rowCount: 0,
      columnCount: 0,
      headers: [],
      rows: [],
      previewRows: [],
      validationIssues: issues,
      detectedRecordTypes: ['unknown'],
      parsingWarnings: warnings,
    };
  }

  let headers: string[] = [];
  let rows: RawUploadedRecord[] = [];
  let availableSheets: string[] | undefined;

  if (fileType === 'csv') {
    const result = await parseCsv(file, batchId, issues, warnings);
    headers = result.headers;
    rows = result.rows;
  } else {
    const result = await parseXlsx(file, batchId, issues, warnings);
    headers = result.headers;
    rows = result.rows;
    availableSheets = result.availableSheets.length > 1 ? result.availableSheets : undefined;
  }

  // Check for duplicate headers
  const headerCounts = new Map<string, number>();
  for (const h of headers) {
    headerCounts.set(h, (headerCounts.get(h) ?? 0) + 1);
  }
  for (const [h, count] of headerCounts) {
    if (count > 1) {
      issues.push(makeIssue(
        `dup-header-${h}`,
        'warning',
        h,
        `Intestazione duplicata: "${h}" appare ${count} volte. Solo la prima occorrenza sarà usata.`,
        'Rinominare le colonne duplicate nel file.',
      ));
    }
  }

  // Warn if row count exceeds soft limit for guided pilot
  if (rows.length > 10_000) {
    warnings.push(`Il file contiene ${rows.length} righe. Per il pilot guidato si raccomanda un file sotto le 10.000 righe per sessione.`);
  }

  const detectedRecordTypes: DetectedRecordType[] = rows.length > 0
    ? [...new Set(rows.map((r) => r.detectedRecordType))]
    : ['unknown'];

  return {
    fileName: file.name,
    fileType,
    rowCount: rows.length,
    columnCount: headers.length,
    headers,
    rows,
    previewRows: rows.slice(0, PREVIEW_ROW_COUNT),
    validationIssues: issues,
    detectedRecordTypes,
    parsingWarnings: warnings,
    availableSheets,
  };
}
