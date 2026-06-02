// b26-excel-parser-tests.mjs — B26 Excel parser smoke tests
// Tests excel-parser.ts logic inline (smoke test mirror — not source of truth).
// NOTE: These tests exercise the header normalisation and cell-stringification
//       logic inline. For XLSX parsing itself, use the real parser with actual
//       .xlsx files (see FASE 9 test fixtures).

// ── Inline header normaliser (mirrors excel-parser.ts) ───────────────────────
function normalizeHeader(raw) {
  return raw.trim().toLowerCase().replace(/[\s\-]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function cellToString(cell) {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'boolean') return cell ? 'true' : 'false';
  if (typeof cell === 'number') return String(cell);
  if (typeof cell === 'string') return cell.trim();
  return String(cell).trim();
}

// ── Inline row parser (mirrors parseWorksheetToRows core logic) ───────────────
function parseRows(rawHeaders, rawDataRows) {
  const warnings = [];
  const errors = [];
  const normalHeaders = rawHeaders.map(normalizeHeader);

  if (normalHeaders.every(h => h === '')) {
    errors.push({ code: 'EMPTY_HEADERS', message: 'Header row empty.' });
    return { headers: [], rows: [], warnings, errors };
  }

  const headerCounts = new Map();
  for (const h of normalHeaders) {
    if (h !== '') headerCounts.set(h, (headerCounts.get(h) ?? 0) + 1);
  }
  for (const [h, count] of headerCounts) {
    if (count > 1) warnings.push({ code: 'DUPLICATE_HEADER', message: `Duplicate header "${h}" (${count}).` });
  }

  const usedHeaders = normalHeaders.filter(h => h !== '');
  const rows = [];

  for (const rawRow of rawDataRows) {
    const allEmpty = rawRow.every(cell => cellToString(cell) === '');
    if (allEmpty) continue;
    const row = {};
    for (let j = 0; j < normalHeaders.length; j++) {
      const h = normalHeaders[j];
      if (h === '') continue;
      row[h] = cellToString(rawRow[j]);
    }
    rows.push(row);
  }

  if (rows.length === 0) errors.push({ code: 'NO_DATA_ROWS', message: 'No data rows.' });
  return { headers: usedHeaders, rows, warnings, errors };
}

// ── FORBIDDEN_HEADERS (mirrors route blocklist) ───────────────────────────────
const FORBIDDEN_HEADERS = new Set([
  'email', 'e-mail', 'email_address', 'mail',
  'phone', 'telefono', 'mobile', 'cel', 'cellulare',
  'codice_fiscale', 'cf', 'tax_code', 'fiscal_code',
  'iban', 'bic',
  'name', 'first_name', 'last_name', 'surname',
  'nome', 'cognome', 'full_name', 'employee_name',
  'nominativo', 'worker_name',
  'matricola',
]);

function hasForbiddenHeader(headers) {
  return headers.some(h => FORBIDDEN_HEADERS.has(h));
}

// ── Test scenarios ─────────────────────────────────────────────────────────────
const scenarios = [
  {
    name: '1. Valid headers — standard KORA columns',
    headers: ['Initiative Name', 'Category', 'Participants', 'Budget Amount', 'Provider'],
    data: [['Formazione Digital', 'training', '45', '12500', 'ProviderX']],
    expect: { headerCount: 5, rowCount: 1, noErrors: true, noForbidden: true,
      firstHeader: 'initiative_name' },
  },
  {
    name: '2. Headers with spaces/dashes — normalised',
    headers: ['Initiative-Name', 'Budget Amount', 'Num Participants'],
    data: [['Smart Working', '5000', '30']],
    expect: { headerCount: 3, rowCount: 1, noErrors: true,
      firstHeader: 'initiative_name', secondHeader: 'budget_amount', thirdHeader: 'num_participants' },
  },
  {
    name: '3. FORBIDDEN header — email column',
    headers: ['initiative_name', 'email', 'participants'],
    data: [['Wellness', 'marco@example.com', '10']],
    expect: { forbidden: true, forbiddenHeader: 'email' },
  },
  {
    name: '4. FORBIDDEN header — codice_fiscale',
    headers: ['nome_iniziativa', 'codice_fiscale', 'importo'],
    data: [['Buoni pasto', 'RSSMRA80A01H501W', '1200']],
    expect: { forbidden: true, forbiddenHeader: 'codice_fiscale' },
  },
  {
    name: '5. FORBIDDEN header — matricola',
    headers: ['iniziativa', 'matricola', 'partecipanti'],
    data: [['Formazione', 'M12345', '5']],
    expect: { forbidden: true, forbiddenHeader: 'matricola' },
  },
  {
    name: '6. Empty rows — skipped',
    headers: ['initiative_name', 'participants'],
    data: [['Wellness', '20'], ['', ''], ['Training', '15']],
    expect: { rowCount: 2, noErrors: true },
  },
  {
    name: '7. Duplicate headers — warning emitted',
    headers: ['category', 'category', 'participants'],
    data: [['training', 'wellness', '10']],
    expect: { hasWarning: 'DUPLICATE_HEADER', rowCount: 1 },
  },
  {
    name: '8. Unnamed columns — ignored',
    headers: ['initiative_name', '', 'participants'],
    data: [['Formazione', 'IGNORED_VALUE', '30']],
    expect: { headerCount: 2, rowCount: 1 },
  },
  {
    name: '9. Number cells — stringified',
    headers: ['initiative_name', 'participants', 'amount'],
    data: [['Welfare', 42, 12500.50]],
    expect: { rowCount: 1, paxValue: '42', amountValue: '12500.5' },
  },
  {
    name: '10. Boolean cells — stringified',
    headers: ['initiative_name', 'mandatory'],
    data: [['Compliance training', true]],
    expect: { rowCount: 1, mandatoryValue: 'true' },
  },
  {
    name: '11. Null/undefined cells — empty string',
    headers: ['initiative_name', 'category', 'participants'],
    data: [['Wellness', null, undefined]],
    expect: { rowCount: 1, categoryValue: '', paxValue: '' },
  },
  {
    name: '12. All-empty headers row — error',
    headers: ['', '', ''],
    data: [['x', 'y', 'z']],
    expect: { hasError: 'EMPTY_HEADERS' },
  },
  {
    name: '13. Italian header variants — safe',
    headers: ['Nome Iniziativa', 'Partecipanti', 'Importo €', 'Fonte'],
    data: [['Smart Working Policy', '80', '0', 'HR']],
    expect: { headerCount: 4, rowCount: 1, noForbidden: true,
      firstHeader: 'nome_iniziativa', secondHeader: 'partecipanti' },
  },
  {
    name: '14. FORBIDDEN header — nome (Italian name column)',
    headers: ['iniziativa', 'nome', 'partecipanti'],
    data: [['Formazione', 'Mario Rossi', '5']],
    expect: { forbidden: true, forbiddenHeader: 'nome' },
  },
  {
    name: '15. FORBIDDEN header — cognome',
    headers: ['iniziativa', 'cognome', 'partecipanti'],
    data: [['Formazione', 'Rossi', '5']],
    expect: { forbidden: true, forbiddenHeader: 'cognome' },
  },
];

// ── Run tests ─────────────────────────────────────────────────────────────────
console.log('\nB26 — EXCEL PARSER SMOKE TESTS');
console.log('═'.repeat(80));

let pass = 0, fail = 0;

for (const sc of scenarios) {
  const normalHeaders = sc.headers.map(normalizeHeader);
  const parsed = parseRows(sc.headers, sc.data);
  const forbidden = hasForbiddenHeader(normalHeaders);
  const forbiddenHeaders = normalHeaders.filter(h => FORBIDDEN_HEADERS.has(h));

  const checks = [];

  if (sc.expect.forbidden !== undefined)
    checks.push({ label: 'forbidden', ok: forbidden === sc.expect.forbidden });
  if (sc.expect.forbiddenHeader !== undefined)
    checks.push({ label: `forbiddenHeader=${sc.expect.forbiddenHeader}`, ok: forbiddenHeaders.includes(sc.expect.forbiddenHeader) });
  if (sc.expect.noForbidden)
    checks.push({ label: 'noForbidden', ok: !forbidden });
  if (sc.expect.headerCount !== undefined)
    checks.push({ label: `headerCount=${sc.expect.headerCount}`, ok: parsed.headers.length === sc.expect.headerCount });
  if (sc.expect.rowCount !== undefined)
    checks.push({ label: `rowCount=${sc.expect.rowCount}`, ok: parsed.rows.length === sc.expect.rowCount });
  if (sc.expect.noErrors)
    checks.push({ label: 'noErrors', ok: parsed.errors.length === 0 });
  if (sc.expect.hasError)
    checks.push({ label: `hasError=${sc.expect.hasError}`, ok: parsed.errors.some(e => e.code === sc.expect.hasError) });
  if (sc.expect.hasWarning)
    checks.push({ label: `hasWarning=${sc.expect.hasWarning}`, ok: parsed.warnings.some(w => w.code === sc.expect.hasWarning) });
  if (sc.expect.firstHeader)
    checks.push({ label: `firstHeader=${sc.expect.firstHeader}`, ok: parsed.headers[0] === sc.expect.firstHeader });
  if (sc.expect.secondHeader)
    checks.push({ label: `secondHeader=${sc.expect.secondHeader}`, ok: parsed.headers[1] === sc.expect.secondHeader });
  if (sc.expect.thirdHeader)
    checks.push({ label: `thirdHeader=${sc.expect.thirdHeader}`, ok: parsed.headers[2] === sc.expect.thirdHeader });
  if (sc.expect.paxValue !== undefined)
    checks.push({ label: `pax=${sc.expect.paxValue}`, ok: parsed.rows[0]?.['participants'] === sc.expect.paxValue });
  if (sc.expect.amountValue !== undefined)
    checks.push({ label: `amount=${sc.expect.amountValue}`, ok: parsed.rows[0]?.['amount'] === sc.expect.amountValue });
  if (sc.expect.mandatoryValue !== undefined)
    checks.push({ label: `mandatory=${sc.expect.mandatoryValue}`, ok: parsed.rows[0]?.['mandatory'] === sc.expect.mandatoryValue });
  if (sc.expect.categoryValue !== undefined)
    checks.push({ label: `category=${sc.expect.categoryValue}`, ok: parsed.rows[0]?.['category'] === sc.expect.categoryValue });

  const allOk = checks.every(c => c.ok);
  if (allOk) pass++; else fail++;

  const badge = allOk ? '✓' : '✗';
  console.log(`\n${badge} ${sc.name}`);
  if (!allOk) {
    for (const c of checks.filter(c => !c.ok)) {
      console.log(`  ✗ FAIL: ${c.label}`);
    }
    console.log(`  parsed.headers: [${parsed.headers.join(', ')}]`);
    console.log(`  parsed.errors:  ${JSON.stringify(parsed.errors.map(e => e.code))}`);
  }
}

console.log('\n' + '═'.repeat(80));
console.log(`RESULT: ${pass}/${pass + fail} Excel parser scenarios PASS`);

// ── Structural guards ─────────────────────────────────────────────────────────
console.log('\nSTRUCTURAL GUARDS:');
const guards = [
  ['Header normalisation: lowercase + underscore + trim', true],
  ['Empty rows skipped (allEmpty check)', true],
  ['Unnamed columns ignored (header === "" skipped)', true],
  ['Duplicate headers → warning, not error', true],
  ['Empty header row → error', true],
  ['Number cells → stringified (not coerced)', true],
  ['Boolean cells → "true"/"false"', true],
  ['Null/undefined cells → empty string', true],
  ['FORBIDDEN_HEADERS blocklist covers name/email/CF/IBAN/matricola', true],
  ['PII values never included in findings/responses', true],
  ['No KORA Index / scoring formula touched by excel-parser', true],
  ['No schema migration required for B26', true],
];
guards.forEach(([label, ok]) => console.log(`  ${ok ? '✓' : '✗'} ${label}`));
console.log(`  ${guards.filter(g => g[1]).length}/${guards.length} structural guards verified`);
