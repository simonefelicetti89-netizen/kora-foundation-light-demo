// lib/data-intake/totals-row-filter.ts
// B79-P0-2: Deterministic totals row filter — removes aggregate/summary rows from intake.
//
// Filters rows whose initiative name or title is clearly a summation label:
//   "TOTALE" → filtered
//   "TOTALE WELFARE 2025" → filtered
//   "GRAND TOTAL" → filtered
//   "Riepilogo" → filtered
//   "Total Wellbeing Program" → NOT filtered (substantive program name)
//   "Programma Totale Salute" → NOT filtered (totale not in leading position)
//
// Filter reason: 'totals_row_filtered'
// Surface warning: "N righe riepilogative escluse automaticamente."

export const TOTALS_ROW_FILTER_REASON = 'totals_row_filtered';

// ── Exact-match set (lowercased, trimmed, collapsed spaces) ──────────────────

const TOTALS_EXACT = new Set([
  'totale', 'totali', 'total', 'totals',
  'grand total', 'grand totals',
  'sub total', 'sub totals', 'subtotal', 'subtotals',
  'sub-totale', 'subtotale', 'sub-totali', 'subtotali',
  'riepilogo', 'riepilogativo', 'riepilogo iniziative',
  'summary', 'sommario',
  'totale complessivo', 'totale generale', 'totale annuo', 'totale annuale',
  'totale periodo', 'totale budget', 'totale welfare', 'totale benefit',
  'totale benefit aziendali', 'totale iniziative', 'totale spesa',
  'totale investimento', 'totale costi', 'totale costo',
  'totale fringe', 'totale fringe benefit',
  'totale formazione', 'totale lms', 'totale learning',
  'grand total welfare', 'total benefit', 'total welfare',
]);

// ── Prefix words that, when leading, may indicate a totals row ───────────────

const TOTALS_PREFIXES = [
  'totale', 'subtotale', 'sub-totale', 'riepilogo', 'riepilogativo',
  'grand total', 'sub total', 'subtotal',
];

// ── Allowed suffix tokens: category labels, years, quarters ──────────────────
// If ALL tokens after the prefix are in this set (or are year-like), it's a totals row.
// If ANY token is a substantive program noun, it is NOT a totals row.

const ALLOWED_SUFFIX_TOKENS = new Set([
  // Italian welfare category names (often used as totals labels: "TOTALE WELFARE")
  'welfare', 'benefit', 'fringe', 'formazione', 'learning', 'lms',
  'salute', 'health', 'wellbeing', 'psicologico', 'prevenzione',
  'volontariato', 'volunteering', 'esg', 'csr',
  'sviluppo', 'growth', 'mentoring', 'coaching',
  // Aggregation adjectives
  'complessivo', 'generale', 'annuo', 'annuale', 'mensile',
  'trimestrale', 'semestrale', 'biennale', 'periodico',
  'parziale', 'totale', 'subtotale',
  // Financial labels
  'budget', 'spesa', 'investimento', 'costo', 'costi',
  // Plural forms
  'iniziative', 'programmi', 'attività', 'eventi', 'interventi',
  'misure', 'azioni',
  // Quarters / periods
  'q1', 'q2', 'q3', 'q4', 'h1', 'h2', 's1', 's2',
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]);

// Words that, when present after a totals prefix, CANCEL the filter
// because they are program-identifying nouns.
const PROGRAM_NOUNS_THAT_CANCEL = new Set([
  'program', 'programme', 'programma', 'corso', 'progetto', 'iniziativa',
  'servizio', 'piattaforma', 'app', 'toolkit', 'kit', 'percorso',
  'academy', 'hub', 'lab', 'centro', 'sportello',
]);

function isYearLike(token: string): boolean {
  return /^\d{4}$/.test(token) && parseInt(token, 10) >= 2000 && parseInt(token, 10) <= 2099;
}

function isYearRangeLike(token: string): boolean {
  return /^\d{4}[-/]\d{4}$/.test(token) || /^\d{4}[-/][qhsQHS]\d$/.test(token);
}

// ── Core check ────────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isTotalsText(text: string): boolean {
  if (!text || !text.trim()) return false;
  const n = normalize(text);

  // 1. Exact match
  if (TOTALS_EXACT.has(n)) return true;

  // 2. Prefix check: does the text START with a totals prefix word?
  const matchedPrefix = TOTALS_PREFIXES.find(p => n === p || n.startsWith(p + ' '));
  if (!matchedPrefix) return false;

  const rest = n.slice(matchedPrefix.length).trim();
  if (!rest) return true; // just the prefix with no suffix

  const restTokens = rest.split(' ');

  // If ANY token is a program noun → NOT a totals row
  if (restTokens.some(t => PROGRAM_NOUNS_THAT_CANCEL.has(t))) return false;

  // All remaining tokens must be: year-like, year-range-like, or in ALLOWED_SUFFIX_TOKENS
  return restTokens.every(t =>
    isYearLike(t) || isYearRangeLike(t) || ALLOWED_SUFFIX_TOKENS.has(t),
  );
}

// ── Row-level check ───────────────────────────────────────────────────────────
// Checks initiative_name first, falls back to category if name is empty.

export function isTotalsRow(row: Record<string, string>): boolean {
  const name = (
    row['initiative_name'] ?? row['nome_iniziativa'] ?? row['iniziativa'] ??
    row['nome_progetto'] ?? row['progetto'] ?? row['titolo'] ??
    row['nome_attivita'] ?? row['attivita'] ?? row['name_initiative'] ??
    row['event_name'] ?? row['nome_evento'] ?? ''
  ).trim();

  if (name) return isTotalsText(name);

  // If initiative name is absent, check category as fallback
  const category = (row['category'] ?? row['categoria'] ?? row['area'] ?? '').trim();
  return !!category && isTotalsText(category);
}

// ── Batch filter ──────────────────────────────────────────────────────────────

export interface TotalsFilterResult {
  rows:           Record<string, string>[];
  filteredCount:  number;
  filteredReason: string;
  warning:        string | null;
}

export function filterTotalsRows(rows: Record<string, string>[]): TotalsFilterResult {
  const kept:    Record<string, string>[] = [];
  let   filtered = 0;

  for (const row of rows) {
    if (isTotalsRow(row)) {
      filtered++;
    } else {
      kept.push(row);
    }
  }

  return {
    rows:          kept,
    filteredCount: filtered,
    filteredReason: TOTALS_ROW_FILTER_REASON,
    warning: filtered > 0
      ? `${filtered} ${filtered === 1 ? 'riga riepilogativa esclusa' : 'righe riepilogative escluse'} automaticamente.`
      : null,
  };
}
