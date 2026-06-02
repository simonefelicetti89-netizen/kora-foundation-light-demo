// lib/data-intake/csv-parser.ts
// Centralised server-side CSV parser — B17.
//
// Replaces the duplicate inline parseCsv() in upload-preview and accept routes.
// Uses PapaParse for RFC 4180 compliance: quoted fields, escaped quotes, BOM strip.
//
// Server-side only (Node.js runtime). Do NOT import from browser components.

import Papa from 'papaparse';

export type CsvParseWarning = {
  code: string;
  message: string;
  rowIndex?: number;
  field?: string;
};

export type CsvParseError = {
  code: string;
  message: string;
  rowIndex?: number;
};

export type ParsedCsvResult = {
  rows: Array<Record<string, string>>;
  headers: string[];
  delimiter: ',' | ';' | '\t';
  warnings: CsvParseWarning[];
  errors: CsvParseError[];
};

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s\-]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function detectDelimiter(firstLine: string): ',' | ';' | '\t' {
  const commas = (firstLine.match(/,/g)  ?? []).length;
  const semis  = (firstLine.match(/;/g)  ?? []).length;
  const tabs   = (firstLine.match(/\t/g) ?? []).length;
  if (tabs > commas && tabs > semis) return '\t';
  return semis > commas ? ';' : ',';
}

export function parseCsvContent(content: string): ParsedCsvResult {
  const warnings: CsvParseWarning[] = [];
  const errors: CsvParseError[]     = [];

  // Strip UTF-8 BOM (﻿ or multi-byte variant)
  const text = content.replace(/^﻿/, '').replace(/^﻿/, '');

  if (!text.trim()) {
    errors.push({ code: 'EMPTY_FILE', message: 'Empty file: no content found.' });
    return { rows: [], headers: [], delimiter: ',', warnings, errors };
  }

  const firstLine = text.split(/\r?\n/)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);

  const result = Papa.parse<Record<string, string>>(text, {
    header:         true,
    delimiter,
    skipEmptyLines: true,
    dynamicTyping:  false,   // Preserve strings; routes / guards handle coercion
    transformHeader: normalizeHeader,
  });

  // Surface PapaParse errors as structured warnings — none are fatal by themselves
  for (const e of result.errors) {
    const code =
      e.type === 'Delimiter'     ? 'DELIMITER_MISMATCH' :
      e.type === 'FieldMismatch' ? 'FIELD_MISMATCH'     :
      `CSV_${e.type.toUpperCase()}`;
    warnings.push({ code, message: e.message, rowIndex: e.row });
  }

  const headers = result.meta.fields ?? [];

  if (headers.length === 0) {
    errors.push({ code: 'NO_HEADERS', message: 'No headers detected in first row.' });
    return { rows: [], headers: [], delimiter, warnings, errors };
  }
  if (headers.every(h => h === '')) {
    errors.push({ code: 'EMPTY_HEADERS', message: 'Header row is empty or contains only special characters.' });
    return { rows: [], headers: [], delimiter, warnings, errors };
  }
  if (result.data.length === 0) {
    errors.push({ code: 'NO_DATA_ROWS', message: 'File must contain at least one data row after the header.' });
    return { rows: [], headers, delimiter, warnings, errors };
  }

  // Detect duplicate headers
  const headerCounts = new Map<string, number>();
  for (const h of headers) { headerCounts.set(h, (headerCounts.get(h) ?? 0) + 1); }
  for (const [h, count] of headerCounts) {
    if (count > 1) {
      warnings.push({
        code:    'DUPLICATE_HEADER',
        message: `Duplicate header "${h}" (${count} occurrences) — only first column used.`,
        field:   h,
      });
    }
  }

  const rows = result.data.map(row => {
    const out: Record<string, string> = {};
    for (const h of headers) {
      out[h] = String(row[h] ?? '').trim();
    }
    return out;
  });

  return { rows, headers, delimiter, warnings, errors };
}

// Flatten structured warnings to plain string array for route response compatibility.
export function flattenCsvWarnings(result: ParsedCsvResult): string[] {
  return result.warnings.map(w =>
    w.rowIndex != null ? `Row ${w.rowIndex + 1}: ${w.message}` : w.message,
  );
}
