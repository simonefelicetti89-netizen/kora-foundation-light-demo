// lib/data-intake/excel-parser.ts
// B26: Excel / XLSX parser helper — server-side only.
//
// Uses exceljs (replaces xlsx v0.18.5 — CVE-2023-30533, CVE-2024-22363).
// Returns normalised rows compatible with the KORA Data Intake pipeline.
//
// Design:
//   - Server-side only (Node.js runtime). Never import from browser components.
//   - Pure function: no DB, no LLM, no side effects.
//   - Header normalisation mirrors csv-parser.ts: lowercase + trim + underscore.
//   - Cell values always stringified — no type coercion.
//   - Empty rows skipped. Unnamed columns ignored. BOM stripped.
//   - .xls legacy files are NOT supported in B26.

import ExcelJS from 'exceljs';
import { suggestColumnMapping } from './column-mapping';

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
  skippedPreHeaderRows: number;
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

// ── ExcelJS cell → string ─────────────────────────────────────────────────────

function cellValueToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.trim();
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'object') {
    // Rich text
    if ('richText' in value) {
      return (value as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('').trim();
    }
    // Formula result
    if ('result' in value) {
      return cellValueToString((value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    }
    // Error value (#REF!, etc.)
    if ('error' in value) return '';
  }
  return String(value).trim();
}

// ── Worksheet → string[][] ────────────────────────────────────────────────────

function worksheetToArrays(ws: ExcelJS.Worksheet): string[][] {
  const result: string[][] = [];
  const maxCol = ws.columnCount;

  ws.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    for (let c = 1; c <= maxCol; c++) {
      cells.push(cellValueToString(row.getCell(c).value) || '');
    }
    result.push(cells);
  });

  return result;
}

// ── B65-B1: Pre-header row detection ─────────────────────────────────────────
// Scans up to 5 rows; returns index of first row with ≥2 canonical field matches.
const PRE_HEADER_MAX_SCAN = 5;
const PRE_HEADER_MIN_MATCH = 2;

function detectExcelPreHeaderRows(rawRows: string[][]): number {
  for (let i = 0; i < Math.min(rawRows.length, PRE_HEADER_MAX_SCAN); i++) {
    const row = rawRows[i] ?? [];
    const cells = row.map(c => String(c ?? '').trim()).filter(Boolean);
    if (cells.length === 0) continue;
    const suggestions = suggestColumnMapping(cells);
    const matchCount = suggestions.filter(s => s.suggestedField !== null && s.confidence >= 0.65).length;
    if (matchCount >= PRE_HEADER_MIN_MATCH) return i;
  }
  return 0;
}

// ── Sheet parser ──────────────────────────────────────────────────────────────

function parseWorksheetToRows(
  raw: string[][],
  sheetName: string,
  maxRows?: number,
): ParsedExcelSheet {
  const warnings: ExcelParseWarning[] = [];
  const errors: ExcelParseError[] = [];

  if (!raw || raw.length === 0) {
    return {
      sheetName, headers: [], rows: [],
      warnings,
      errors: [{ code: 'EMPTY_SHEET', message: `Sheet "${sheetName}" is empty or has no range.` }],
      skippedPreHeaderRows: 0,
    };
  }

  if (raw.length === 0) {
    errors.push({ code: 'EMPTY_SHEET', message: `Sheet "${sheetName}" has no content.` });
    return { sheetName, headers: [], rows: [], warnings, errors, skippedPreHeaderRows: 0 };
  }

  // B65-B1: Detect and skip pre-header rows (title/metadata rows before column headers)
  const headerRowIndex = detectExcelPreHeaderRows(raw);
  if (headerRowIndex > 0) {
    warnings.push({
      code: 'PRE_HEADER_ROWS_SKIPPED',
      message: `Skipped ${headerRowIndex} pre-header row(s) before column headers.`,
    });
  }

  // Header row at headerRowIndex (was always row[0])
  const rawHeaders: string[] = (raw[headerRowIndex] ?? []).map(h => String(h ?? ''));
  const normalHeaders = rawHeaders.map(normalizeHeader);

  if (normalHeaders.every(h => h === '')) {
    errors.push({ code: 'EMPTY_HEADERS', message: 'Header row is empty or contains only special characters.' });
    return { sheetName, headers: [], rows: [], warnings, errors, skippedPreHeaderRows: headerRowIndex };
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

  // Data rows start after header row
  const dataStartIndex = headerRowIndex + 1;
  const rows: Array<Record<string, string>> = [];
  const limit = maxRows !== undefined ? Math.min(raw.length, dataStartIndex + maxRows) : raw.length;

  for (let i = dataStartIndex; i < limit; i++) {
    const rawRow = raw[i] ?? [];

    // Skip completely empty rows
    const allEmpty = rawRow.every(cell => String(cell ?? '').trim() === '');
    if (allEmpty) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < normalHeaders.length; j++) {
      const h = normalHeaders[j];
      if (h === '') continue;
      row[h] = String(rawRow[j] ?? '').trim();
    }
    rows.push(row);
  }

  if (rows.length === 0) {
    errors.push({
      code: 'NO_DATA_ROWS',
      message: `Sheet "${sheetName}" contains headers but no data rows.`,
    });
  }

  return { sheetName, headers: usedHeaders, rows, warnings, errors, skippedPreHeaderRows: headerRowIndex };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Read a workbook buffer and return metadata for all sheets (no full row data).
 * Used by upload-preview route when no sheet is selected yet.
 */
export async function parseExcelWorkbookMeta(buf: Uint8Array): Promise<ExcelWorkbookMeta> {
  const wb = new ExcelJS.Workbook();
  // ExcelJS types use legacy non-generic Buffer; Buffer extends Uint8Array so this cast is safe at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buf as any);

  const sheetNames = wb.worksheets.map(ws => ws.name);

  const sheets: ExcelSheetSummary[] = wb.worksheets.map(ws => {
    const raw = worksheetToArrays(ws);
    const parsed = parseWorksheetToRows(raw, ws.name, 5);
    return {
      sheetName: ws.name,
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
export async function parseExcelSheet(buf: Uint8Array, sheetName: string, maxRows?: number): Promise<ParsedExcelSheet> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buf as any);

  const ws = wb.getWorksheet(sheetName);
  if (!ws) {
    const available = wb.worksheets.map(w => `"${w.name}"`).join(', ');
    return {
      sheetName, headers: [], rows: [],
      warnings: [],
      errors: [{
        code: 'SHEET_NOT_FOUND',
        message: `Sheet "${sheetName}" not found. Available: ${available}.`,
      }],
      skippedPreHeaderRows: 0,
    };
  }

  const raw = worksheetToArrays(ws);
  return parseWorksheetToRows(raw, sheetName, maxRows);
}

/**
 * Return list of sheet names in a workbook.
 */
export async function getExcelSheetNames(buf: Uint8Array): Promise<string[]> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buf as any);
  return wb.worksheets.map(ws => ws.name);
}
