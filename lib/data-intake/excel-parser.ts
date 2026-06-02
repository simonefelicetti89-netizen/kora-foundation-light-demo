// lib/data-intake/excel-parser.ts
// B26: Excel / XLSX parser helper — server-side only.
//
// Uses the `xlsx` package (already installed, v0.18.x) to read .xlsx workbooks.
// Returns normalised rows compatible with the KORA Data Intake pipeline.
//
// Design:
//   - Server-side only (Node.js runtime). Never import from browser components.
//   - Pure function: no DB, no LLM, no side effects.
//   - Header normalisation mirrors csv-parser.ts: lowercase + trim + underscore.
//   - Cell values always stringified — no type coercion.
//   - Empty rows skipped. Unnamed columns ignored. BOM stripped.
//   - .xls legacy files are NOT supported in B26.
//
// Security note: xlsx 0.18.x has known CVEs for crafted binary files.
// Admin-only upload path; real-data gate requires Gate 3B confirmation.

import * as XLSX from 'xlsx';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExcelParseWarning = {
  code: string;
  message: string;
  rowIndex?: number;
  field?: string;
};

export type ExcelParseError = {
  code: string;
  message: string;
  rowIndex?: number;
};

export type ParsedExcelSheet = {
  sheetName: string;
  headers: string[];
  rows: Array<Record<string, string>>;
  warnings: ExcelParseWarning[];
  errors: ExcelParseError[];
};

export type ExcelSheetSummary = {
  sheetName: string;
  rowCount: number;
  headers: string[];
  warnings: ExcelParseWarning[];
  errors: ExcelParseError[];
  sampleRows: Array<Record<string, string>>;
};

export type ExcelWorkbookMeta = {
  sheetNames: string[];
  sheets: ExcelSheetSummary[];
};

// ── Header normalisation (mirrors csv-parser.ts) ──────────────────────────────

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s\-]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// ── Cell → string ─────────────────────────────────────────────────────────────

function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'boolean') return cell ? 'true' : 'false';
  if (typeof cell === 'number') return String(cell);
  if (typeof cell === 'string') return cell.trim();
  // Date or other object
  return String(cell).trim();
}

// ── Sheet parser ──────────────────────────────────────────────────────────────

function parseWorksheetToRows(
  ws: XLSX.WorkSheet,
  sheetName: string,
  maxRows?: number,
): ParsedExcelSheet {
  const warnings: ExcelParseWarning[] = [];
  const errors: ExcelParseError[] = [];

  if (!ws || !ws['!ref']) {
    return {
      sheetName, headers: [], rows: [],
      warnings,
      errors: [{ code: 'EMPTY_SHEET', message: `Sheet "${sheetName}" is empty or has no range.` }],
    };
  }

  // sheet_to_json with header:1 returns array of arrays (raw)
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: '',
    raw: false,     // stringify everything — no formula objects
    blankrows: true,
  });

  if (raw.length === 0) {
    errors.push({ code: 'EMPTY_SHEET', message: `Sheet "${sheetName}" has no content.` });
    return { sheetName, headers: [], rows: [], warnings, errors };
  }

  // First row → headers
  const rawHeaders: string[] = (raw[0] as unknown[] ?? []).map(h => String(h ?? ''));
  const normalHeaders = rawHeaders.map(normalizeHeader);

  if (normalHeaders.every(h => h === '')) {
    errors.push({ code: 'EMPTY_HEADERS', message: 'Header row is empty or contains only special characters.' });
    return { sheetName, headers: [], rows: [], warnings, errors };
  }

  // Duplicate header check
  const headerCounts = new Map<string, number>();
  for (const h of normalHeaders) {
    if (h !== '') headerCounts.set(h, (headerCounts.get(h) ?? 0) + 1);
  }
  for (const [h, count] of headerCounts) {
    if (count > 1) {
      warnings.push({
        code: 'DUPLICATE_HEADER',
        message: `Duplicate header "${h}" (${count} occurrences) — only first column retained.`,
        field: h,
      });
    }
  }

  // Empty header slot check
  const emptySlots = normalHeaders.filter(h => h === '').length;
  if (emptySlots > 0) {
    warnings.push({
      code: 'EMPTY_HEADER_SLOTS',
      message: `${emptySlots} unnamed column(s) detected — ignored during processing.`,
    });
  }

  const usedHeaders = normalHeaders.filter(h => h !== '');

  // Data rows (index 1+)
  const rows: Array<Record<string, string>> = [];
  const limit = maxRows !== undefined ? Math.min(raw.length, maxRows + 1) : raw.length;

  for (let i = 1; i < limit; i++) {
    const rawRow = (raw[i] as unknown[]) ?? [];

    // Skip completely empty rows
    const allEmpty = rawRow.every(cell => cellToString(cell) === '');
    if (allEmpty) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < normalHeaders.length; j++) {
      const h = normalHeaders[j];
      if (h === '') continue;
      row[h] = cellToString(rawRow[j]);
    }
    rows.push(row);
  }

  if (rows.length === 0) {
    errors.push({
      code: 'NO_DATA_ROWS',
      message: `Sheet "${sheetName}" contains headers but no data rows.`,
    });
  }

  return { sheetName, headers: usedHeaders, rows, warnings, errors };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Read a workbook buffer and return metadata for all sheets (no full row data).
 * Used by upload-preview route when no sheet is selected yet.
 */
export function parseExcelWorkbookMeta(buf: Buffer): ExcelWorkbookMeta {
  const workbook = XLSX.read(buf, { type: 'buffer', cellDates: false, cellNF: false });
  const sheetNames = workbook.SheetNames;

  const sheets: ExcelSheetSummary[] = sheetNames.map(sheetName => {
    const ws = workbook.Sheets[sheetName];
    const parsed = parseWorksheetToRows(ws, sheetName, 5); // limit to 5 rows for meta preview
    return {
      sheetName,
      rowCount: parsed.errors.length > 0 ? 0 : parsed.rows.length,
      headers: parsed.headers,
      warnings: parsed.warnings,
      errors: parsed.errors,
      sampleRows: parsed.rows.slice(0, 3),
    };
  });

  return { sheetNames, sheets };
}

/**
 * Parse a single named sheet from a workbook buffer — full row extraction.
 * Used by upload-preview route (with selectedSheetName) and accept route.
 */
export function parseExcelSheet(buf: Buffer, sheetName: string, maxRows?: number): ParsedExcelSheet {
  const workbook = XLSX.read(buf, { type: 'buffer', cellDates: false, cellNF: false });

  if (!workbook.SheetNames.includes(sheetName)) {
    return {
      sheetName, headers: [], rows: [],
      warnings: [],
      errors: [{
        code: 'SHEET_NOT_FOUND',
        message: `Sheet "${sheetName}" not found. Available: ${workbook.SheetNames.map(s => `"${s}"`).join(', ')}.`,
      }],
    };
  }

  const ws = workbook.Sheets[sheetName];
  return parseWorksheetToRows(ws, sheetName, maxRows);
}

/**
 * Return list of sheet names in a workbook.
 */
export function getExcelSheetNames(buf: Buffer): string[] {
  const workbook = XLSX.read(buf, { type: 'buffer', cellDates: false, cellNF: false });
  return workbook.SheetNames;
}
