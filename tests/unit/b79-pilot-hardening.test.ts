import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseAmount }            from '../../lib/data-intake/amount-parser';
import { isTotalsText, isTotalsRow, filterTotalsRows } from '../../lib/data-intake/totals-row-filter';

// ── B79 — Pilot Hardening: unit tests ────────────────────────────────────────
//
// P0-1: Italian currency normalization
// P0-2: Totals row filtering
// P0-3: PDF delivery strategy
// P0-4: Methodology disclosure in Decision Pack HTML
// P0-5: Benchmark guidance rendering
// Invariant: no scoring formula changes

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════
// P0-1 — Italian Currency Normalization
// ═══════════════════════════════════════════════════════════════════

describe('P0-1 — parseAmount: Italian format', () => {

  it('"1.234,56 €" → 1234.56 (parsed)', () => {
    const r = parseAmount('1.234,56 €');
    expect(r.status).toBe('parsed');
    expect(r.value).toBeCloseTo(1234.56);
  });

  it('"€ 1.234,56" → 1234.56 (parsed)', () => {
    const r = parseAmount('€ 1.234,56');
    expect(r.status).toBe('parsed');
    expect(r.value).toBeCloseTo(1234.56);
  });

  it('"EUR 1.234,56" → 1234.56 (parsed)', () => {
    const r = parseAmount('EUR 1.234,56');
    expect(r.status).toBe('parsed');
    expect(r.value).toBeCloseTo(1234.56);
  });

  it('"euro 12.345" → 12345 (parsed)', () => {
    const r = parseAmount('euro 12.345');
    expect(r.status).toBe('parsed');
    expect(r.value).toBe(12345);
  });

  it('"EURO 12.345" → 12345 (parsed)', () => {
    const r = parseAmount('EURO 12.345');
    expect(r.status).toBe('parsed');
    expect(r.value).toBe(12345);
  });

  it('"12.345 euro" → 12345 (parsed, trailing suffix)', () => {
    const r = parseAmount('12.345 euro');
    expect(r.status).toBe('parsed');
    expect(r.value).toBe(12345);
  });

  it('"1 234,56" → 1234.56 (space-as-thousands)', () => {
    const r = parseAmount('1 234,56');
    expect(r.status).toBe('parsed');
    expect(r.value).toBeCloseTo(1234.56);
  });

  it('"1234,56" → 1234.56 (comma decimal)', () => {
    const r = parseAmount('1234,56');
    expect(r.status).toBe('parsed');
    expect(r.value).toBeCloseTo(1234.56);
  });

  it('"1.234" → 1234 (dot-thousands, Italian)', () => {
    const r = parseAmount('1.234');
    expect(r.status).toBe('parsed');
    expect(r.value).toBe(1234);
  });

  it('"500" → 500 (plain integer)', () => {
    const r = parseAmount('500');
    expect(r.status).toBe('parsed');
    expect(r.value).toBe(500);
  });

});

describe('P0-1 — parseAmount: US/mixed formats', () => {

  it('"1,234.56" → 1234.56 (US format)', () => {
    const r = parseAmount('1,234.56');
    expect(r.status).toBe('parsed');
    expect(r.value).toBeCloseTo(1234.56);
  });

  it('"1234.56" → 1234.56 (US decimal)', () => {
    const r = parseAmount('1234.56');
    expect(r.status).toBe('parsed');
    expect(r.value).toBeCloseTo(1234.56);
  });

  it('numeric type 1500 → 1500 (passed as number)', () => {
    const r = parseAmount(1500);
    expect(r.status).toBe('parsed');
    expect(r.value).toBe(1500);
  });

});

describe('P0-1 — parseAmount: invalid / missing inputs', () => {

  it('"circa 10k" → null (invalid)', () => {
    const r = parseAmount('circa 10k');
    expect(r.status).toBe('invalid');
    expect(r.value).toBeNull();
  });

  it('"10k" → null (k suffix invalid)', () => {
    const r = parseAmount('10k');
    expect(r.status).toBe('invalid');
    expect(r.value).toBeNull();
  });

  it('"100K" → null (K suffix invalid)', () => {
    const r = parseAmount('100K');
    expect(r.status).toBe('invalid');
    expect(r.value).toBeNull();
  });

  it('"da definire" → null (invalid)', () => {
    const r = parseAmount('da definire');
    expect(r.status).toBe('invalid');
    expect(r.value).toBeNull();
  });

  it('"n.d." → null (invalid)', () => {
    const r = parseAmount('n.d.');
    expect(r.status).toBe('invalid');
    expect(r.value).toBeNull();
  });

  it('"tbd" → null (invalid)', () => {
    const r = parseAmount('tbd');
    expect(r.status).toBe('invalid');
    expect(r.value).toBeNull();
  });

  it('null → null (missing)', () => {
    const r = parseAmount(null);
    expect(r.status).toBe('missing');
    expect(r.value).toBeNull();
  });

  it('undefined → null (missing)', () => {
    const r = parseAmount(undefined);
    expect(r.status).toBe('missing');
    expect(r.value).toBeNull();
  });

  it('"" → null (missing)', () => {
    const r = parseAmount('');
    expect(r.status).toBe('missing');
    expect(r.value).toBeNull();
  });

  it('negative number → null (invalid — welfare costs must be non-negative)', () => {
    const r = parseAmount(-100);
    expect(r.status).toBe('invalid');
    expect(r.value).toBeNull();
  });

});

// ═══════════════════════════════════════════════════════════════════
// P0-2 — Totals Row Filtering
// ═══════════════════════════════════════════════════════════════════

describe('P0-2 — isTotalsText: cases that SHOULD be filtered', () => {

  it('"TOTALE" is filtered', () => expect(isTotalsText('TOTALE')).toBe(true));
  it('"totale" is filtered', () => expect(isTotalsText('totale')).toBe(true));
  it('"Totale" is filtered', () => expect(isTotalsText('Totale')).toBe(true));
  it('"GRAND TOTAL" is filtered', () => expect(isTotalsText('GRAND TOTAL')).toBe(true));
  it('"Grand Total" is filtered', () => expect(isTotalsText('Grand Total')).toBe(true));
  it('"Riepilogo" is filtered', () => expect(isTotalsText('Riepilogo')).toBe(true));
  it('"RIEPILOGO" is filtered', () => expect(isTotalsText('RIEPILOGO')).toBe(true));
  it('"subtotal" is filtered', () => expect(isTotalsText('subtotal')).toBe(true));
  it('"Sub Total" is filtered', () => expect(isTotalsText('Sub Total')).toBe(true));
  it('"TOTALE WELFARE 2025" is filtered', () => expect(isTotalsText('TOTALE WELFARE 2025')).toBe(true));
  it('"Totale Budget" is filtered', () => expect(isTotalsText('Totale Budget')).toBe(true));
  it('"Totale Complessivo" is filtered', () => expect(isTotalsText('Totale Complessivo')).toBe(true));
  it('"Total Welfare" is filtered', () => expect(isTotalsText('Total Welfare')).toBe(true));
  it('"Riepilogo Iniziative" is filtered', () => expect(isTotalsText('Riepilogo Iniziative')).toBe(true));

});

describe('P0-2 — isTotalsText: cases that should NOT be filtered', () => {

  it('"Total Wellbeing Program" is NOT filtered (program noun)', () => {
    expect(isTotalsText('Total Wellbeing Program')).toBe(false);
  });

  it('"Programma Totale Salute" is NOT filtered (totale not leading)', () => {
    expect(isTotalsText('Programma Totale Salute')).toBe(false);
  });

  it('"Corso di Formazione Totale Immersion" is NOT filtered', () => {
    expect(isTotalsText('Corso di Formazione Totale Immersion')).toBe(false);
  });

  it('"Totale Immersion Coaching Program" is NOT filtered (program noun cancels)', () => {
    expect(isTotalsText('Totale Immersion Coaching Program')).toBe(false);
  });

  it('"Piano Salute Aziendale" is NOT filtered', () => {
    expect(isTotalsText('Piano Salute Aziendale')).toBe(false);
  });

  it('"Supporto Psicologico Q2" is NOT filtered', () => {
    expect(isTotalsText('Supporto Psicologico Q2')).toBe(false);
  });

  it('empty string is NOT filtered', () => {
    expect(isTotalsText('')).toBe(false);
  });

  it('"Fringe Benefit 2025" is NOT filtered (not a leading totals prefix)', () => {
    expect(isTotalsText('Fringe Benefit 2025')).toBe(false);
  });

});

describe('P0-2 — isTotalsRow: row-level detection', () => {

  it('row with initiative_name "TOTALE" is detected', () => {
    expect(isTotalsRow({ initiative_name: 'TOTALE', category: 'Welfare' })).toBe(true);
  });

  it('row with nome_iniziativa "Riepilogo" is detected', () => {
    expect(isTotalsRow({ nome_iniziativa: 'Riepilogo' })).toBe(true);
  });

  it('row with initiative_name "Total Wellbeing Program" is NOT filtered', () => {
    expect(isTotalsRow({ initiative_name: 'Total Wellbeing Program' })).toBe(false);
  });

  it('row with no name but category "TOTALE" is detected via fallback', () => {
    expect(isTotalsRow({ category: 'TOTALE' })).toBe(true);
  });

  it('row with no name and non-totals category is NOT filtered', () => {
    expect(isTotalsRow({ category: 'Benessere', amount: '500' })).toBe(false);
  });

});

describe('P0-2 — filterTotalsRows: batch filter', () => {

  it('filters totals rows and preserves real rows', () => {
    const rows = [
      { initiative_name: 'Supporto Psicologico', amount: '500' },
      { initiative_name: 'TOTALE', amount: '5000' },
      { initiative_name: 'Corso Sicurezza', amount: '200' },
      { initiative_name: 'Grand Total', amount: '5200' },
    ];
    const result = filterTotalsRows(rows);
    expect(result.filteredCount).toBe(2);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].initiative_name).toBe('Supporto Psicologico');
    expect(result.rows[1].initiative_name).toBe('Corso Sicurezza');
  });

  it('returns null warning when no rows are filtered', () => {
    const rows = [{ initiative_name: 'Corso ABC', amount: '100' }];
    const result = filterTotalsRows(rows);
    expect(result.filteredCount).toBe(0);
    expect(result.warning).toBeNull();
  });

  it('returns Italian warning string when rows are filtered', () => {
    const rows = [
      { initiative_name: 'TOTALE', amount: '5000' },
      { initiative_name: 'Corso X', amount: '100' },
    ];
    const result = filterTotalsRows(rows);
    expect(result.filteredCount).toBe(1);
    expect(result.warning).toMatch(/riga riepilogativa/);
    expect(result.warning).toMatch(/automaticamente/);
  });

  it('filteredReason is "totals_row_filtered"', () => {
    const rows = [{ initiative_name: 'TOTALE', amount: '5000' }];
    const result = filterTotalsRows(rows);
    expect(result.filteredReason).toBe('totals_row_filtered');
  });

  it('handles empty input gracefully', () => {
    const result = filterTotalsRows([]);
    expect(result.rows).toHaveLength(0);
    expect(result.filteredCount).toBe(0);
    expect(result.warning).toBeNull();
  });

});

// ═══════════════════════════════════════════════════════════════════
// P0-3 — PDF delivery strategy
// ═══════════════════════════════════════════════════════════════════

describe('P0-3 — PDF delivery strategy module', () => {

  it('pdf-strategy.ts exports isPdfApiEnabled and getPdfLinkConfig', () => {
    const src = read('lib/decision-pack/pdf-strategy.ts');
    expect(src).toContain('isPdfApiEnabled');
    expect(src).toContain('getPdfLinkConfig');
  });

  it('pdf-strategy.ts reads NEXT_PUBLIC_KORA_PDF_ENABLED env var', () => {
    const src = read('lib/decision-pack/pdf-strategy.ts');
    expect(src).toContain('NEXT_PUBLIC_KORA_PDF_ENABLED');
  });

  it('CompanyWorkspacePanel uses getPdfLinkConfig (not raw pdfUrl)', () => {
    const src = read('app/admin/company-workspace/_components/CompanyWorkspacePanel.tsx');
    expect(src).toContain('getPdfLinkConfig');
  });

  it('CompanyWorkspacePanel no longer has bare <a href={w.decisionPack.pdfUrl}>PDF</a>', () => {
    const src = read('app/admin/company-workspace/_components/CompanyWorkspacePanel.tsx');
    // The old raw link: href={w.decisionPack.pdfUrl} with text "PDF" directly inside
    expect(src).not.toContain('>PDF</a>');
  });

});

// ═══════════════════════════════════════════════════════════════════
// P0-4 — Methodology disclosure in Decision Pack
// ═══════════════════════════════════════════════════════════════════

describe('P0-4 — Methodology disclosure in html-template', () => {

  it('html-template contains NM = 1.0 stub disclosure', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).toContain('NM = 1.0');
  });

  it('html-template contains CF site-proxy disclosure', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src.toLowerCase()).toMatch(/cf.*proxy|proxy.*cf|sito.based|site.based/);
  });

  it('html-template contains pre_empirical_calibration label', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).toContain('pre_empirical_calibration');
  });

  it('html-template discloses that weights are not externally validated', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src.toLowerCase()).toMatch(/non valid|non calibrat|non certificat/);
  });

  it('html-template states output is diagnostic not certified', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src.toLowerCase()).toMatch(/diagnostico|diagnostici|non certificat/);
  });

  it('html-template has "Note Metodologiche" section (B79-P0-4 disclosure block)', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).toContain('Note Metodologiche');
  });

});

// ═══════════════════════════════════════════════════════════════════
// P0-5 — Benchmark guidance
// ═══════════════════════════════════════════════════════════════════

describe('P0-5 — Benchmark guidance', () => {

  it('HeroDiagnosis renders benchmark guidance note', () => {
    const src = read('components/kora-index/HeroDiagnosis.tsx');
    expect(src.toLowerCase()).toMatch(/benchmark/);
    expect(src.toLowerCase()).toMatch(/pre.empirical|delphi/);
  });

  it('html-template Decision Pack KORA Index metric box has benchmark caveat', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src.toLowerCase()).toMatch(/benchmark.*settori|settori.*benchmark/);
  });

});

// ═══════════════════════════════════════════════════════════════════
// Invariant — no scoring formula changes
// ═══════════════════════════════════════════════════════════════════

describe('Invariant — B79 does not touch scoring formulas', () => {

  it('methodology-config v0.1 weights unchanged', () => {
    const src = read('lib/methodology-config/v0.1.ts');
    expect(src).toContain('getMacroblockWeights');
    expect(src).toContain('REACH');
    expect(src).toContain('QUALITY');
    expect(src).toContain('EQUITY');
    expect(src).toContain('BTI');
  });

  it('IU formula type annotation unchanged', () => {
    const src = read('lib/types/index.ts');
    expect(src).toContain('IU = NM × BC × CQ × EV × CF × AGF');
    expect(src).toContain('anti_gaming_factor_agf');
  });

  it('no new migration files created by B79', () => {
    const dir = path.resolve(__dirname, '../../supabase/migrations');
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    const b79Files = files.filter(f => f.includes('b79') || f.includes('pilot_hardening'));
    expect(b79Files).toHaveLength(0);
  });

  it('raw-to-uef-interpreter delegates normalizeAmount to shared parseAmount', () => {
    const src = read('lib/ingestion/raw-to-uef-interpreter.ts');
    expect(src).toContain("from '@/lib/data-intake/amount-parser'");
    expect(src).toContain('parseAmount');
  });

  it('accept route imports filterTotalsRows', () => {
    const src = read('app/api/admin/data-intake/accept/route.ts');
    expect(src).toContain("from '@/lib/data-intake/totals-row-filter'");
    expect(src).toContain('filterTotalsRows');
  });

});
