// lib/data-intake/amount-parser.ts
// B79-P0-1: Shared Italian amount parser — server + client safe (pure function, no I/O).
//
// Handles all real Italian welfare export formats:
//   "1.234,56 €" → 1234.56
//   "€ 1.234,56" → 1234.56
//   "EUR 1.234,56" → 1234.56
//   "1 234,56"    → 1234.56
//   "1234,56"     → 1234.56
//   "euro 12.345" → 12345
//   "1,234.56"    → 1234.56  (US format, preserved)
//   "1234.56"     → 1234.56
//   "circa 10k"   → null (invalid — remains in enrichment)
//   "da definire" → null (invalid — remains in enrichment)

export type AmountParseStatus = 'parsed' | 'missing' | 'invalid';

export interface AmountParseResult {
  value:  number | null;
  raw:    string;
  status: AmountParseStatus;
}

// ── Currency stripping ────────────────────────────────────────────────────────
// Handles: EUR, USD, GBP, CHF, €, $, £, and Italian "euro" / "Euro" / "EURO" text

function stripCurrency(s: string): string {
  return s
    // ISO codes (prefix or suffix, case-insensitive)
    .replace(/^(EURO?|USD|GBP|CHF)\s*/i, '')
    .replace(/\s*(EURO?|USD|GBP|CHF)\s*$/i, '')
    // Symbol (prefix or suffix, with optional surrounding space)
    .replace(/^[€$£]\s*/, '')
    .replace(/\s*[€$£]$/, '')
    // Collapse all whitespace (handles space-as-thousands-separator: "1 234,56")
    .replace(/\s+/g, '');
}

// ── Core amount normalization ─────────────────────────────────────────────────

export function parseAmount(v: unknown): AmountParseResult {
  if (v === null || v === undefined) return { value: null, raw: '', status: 'missing' };
  const raw = String(v).trim();
  if (!raw) return { value: null, raw, status: 'missing' };

  // Already a number (e.g., from XLSX raw: false returning a numeric string)
  if (typeof v === 'number') {
    if (isFinite(v) && v >= 0) return { value: v, raw, status: 'parsed' };
    return { value: null, raw, status: 'invalid' };
  }

  const s = stripCurrency(raw);
  if (!s) return { value: null, raw, status: 'missing' };

  // Reject clearly non-numeric strings before attempting number parsing
  // Matches: "circa", "da definire", "n.d.", "tbd", "k", "10k", "vedi nota", etc.
  if (/[a-zA-Z]/.test(s) && !/^\d/.test(s)) return { value: null, raw, status: 'invalid' };
  // "10k", "100K", "circa 10" — any alpha after digits → invalid
  if (/\d[a-zA-Z]/.test(s) || /[a-zA-Z]\d/.test(s)) return { value: null, raw, status: 'invalid' };

  const hasDot   = s.includes('.');
  const hasComma = s.includes(',');

  let normalized: string;

  if (hasDot && hasComma) {
    // Both separators — last one is the decimal separator
    if (s.lastIndexOf('.') > s.lastIndexOf(',')) {
      // US format: 1,234.56 → strip commas
      normalized = s.replace(/,/g, '');
    } else {
      // Italian/European format: 1.234,56 → strip dots, comma → dot
      normalized = s.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma && !hasDot) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal comma: 1234,56 or 12,5
      normalized = parts[0] + '.' + parts[1];
    } else {
      // Thousands comma(s): 1,234 or 1,234,567 → strip
      normalized = s.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    const parts = s.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal dot: 1234.56 or 1234.5
      normalized = s;
    } else {
      // Thousands dot(s): 1.234 or 1.234.567 → strip
      normalized = s.replace(/\./g, '');
    }
  } else {
    normalized = s;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return { value: null, raw, status: 'invalid' };
  const n = parseFloat(normalized);
  if (!isFinite(n) || n < 0) return { value: null, raw, status: 'invalid' };
  return { value: n, raw, status: 'parsed' };
}
