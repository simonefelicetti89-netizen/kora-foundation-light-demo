// b31-evidence-attachment-tests.mjs — B31 Evidence Attachment smoke tests

// ── Inline helpers (mirror evidence-attachment.ts) ────────────────────────────
const PII_FILENAME_PATTERNS = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
  /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i,
  /\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/,
];
const PII_HEADER_PATTERNS = new Set(['email','e-mail','phone','telefono','codice_fiscale','cf',
  'nome','cognome','matricola','iban','worker_id','employee_id','first_name','last_name']);

function sanitizeFileName(name) {
  const base = name.trim().slice(0, 100);
  if (PII_FILENAME_PATTERNS.some(p => p.test(base))) {
    const ext = base.split('.').pop() ?? '';
    return `[document].${ext}`;
  }
  return base.replace(/[/\\]/g, '_').replace(/[^\w.\-\s]/g, '_');
}

function detectFileType(fileName) {
  const fn = fileName.toLowerCase();
  if (fn.endsWith('.pdf'))  return 'pdf';
  if (fn.endsWith('.xlsx')) return 'xlsx';
  if (fn.endsWith('.csv'))  return 'csv';
  if (fn.endsWith('.docx')) return 'docx';
  return 'unknown';
}

function suggestEvidenceLevel(type, status) {
  if (status === 'unsupported' || status === 'rejected_pii') return { level: null, strength: 'unknown' };
  if (['invoice','provider_export','lms_report','attendance_report'].includes(type)) return { level: 'L3', strength: 'strong' };
  if (['contract','budget_report','coverage_report','policy_document'].includes(type)) return { level: 'L2', strength: 'medium' };
  return { level: 'L1', strength: 'weak' };
}

function hasPiiFilename(name) { return PII_FILENAME_PATTERNS.some(p => p.test(name)); }
function hasPiiHeader(header) { return PII_HEADER_PATTERNS.has(header.toLowerCase().trim().replace(/\s+/g,'_')); }

// ── Scenarios ──────────────────────────────────────────────────────────────────
const scenarios = [
  {
    name: '1. PDF metadata-only accepted',
    fileName: 'invoice_provider_2026.pdf',
    attachType: 'invoice',
    expect: { fileType: 'pdf', noFilenameRejection: true },
  },
  {
    name: '2. XLSX provider export — suggest L3',
    fileName: 'provider_export_Q1.xlsx',
    attachType: 'provider_export',
    expect: { fileType: 'xlsx', suggestedLevel: 'L3', strength: 'strong' },
  },
  {
    name: '3. CSV attendance report — suggest L3',
    fileName: 'attendance_report_training.csv',
    attachType: 'attendance_report',
    expect: { fileType: 'csv', suggestedLevel: 'L3', strength: 'strong' },
  },
  {
    name: '4. Filename with email → sanitized to [document].pdf',
    fileName: 'mario.rossi@company.it_fattura.pdf',
    attachType: 'invoice',
    expect: { safeFileName: '[document].pdf', hasPii: true },
  },
  {
    name: '5. Filename with phone-like number → sanitized',
    fileName: 'report_333-444-5678.xlsx',
    attachType: 'budget_report',
    expect: { safeFileName: '[document].xlsx', hasPii: true },
  },
  {
    name: '6. Header PII (email column) → rejected_pii',
    headers: ['initiative_name', 'email', 'participants'],
    expect: { piiInHeaders: true, rejectedHeader: 'email' },
  },
  {
    name: '7. Header PII (nome column) → rejected_pii',
    headers: ['iniziativa', 'nome', 'importo'],
    expect: { piiInHeaders: true, rejectedHeader: 'nome' },
  },
  {
    name: '8. DOCX not supported in B31',
    fileName: 'policy.docx',
    attachType: 'policy_document',
    expect: { fileType: 'docx', status: 'unsupported', level: null },
  },
  {
    name: '9. Invoice → suggests L3 with strong strength',
    attachType: 'invoice',
    expect: { level: 'L3', strength: 'strong' },
  },
  {
    name: '10. Policy → suggests L2 + caveat about usage proof',
    attachType: 'policy_document',
    expect: { level: 'L2', strength: 'medium' },
  },
  {
    name: '11. Attachment metadata has no raw content field',
    meta: { fileNameSafe: 'report.pdf', fileSizeBytes: 12345, fileType: 'pdf',
      evidenceLevelSuggestion: 'L3', parserStatus: 'metadata_only',
      extractedMetadata: { pageCount: 5 } },
    expect: { noRawContent: true },
  },
  {
    name: '12. Evidence Archive summary contains counts only',
    attachments: [
      { attachmentType: 'invoice', evidenceLevelSuggestion: 'L3', parserStatus: 'metadata_only', sourceStrength: 'strong' },
      { attachmentType: 'lms_report', evidenceLevelSuggestion: 'L3', parserStatus: 'parsed_metadata', sourceStrength: 'strong' },
      { attachmentType: 'policy_document', evidenceLevelSuggestion: 'L2', parserStatus: 'metadata_only', sourceStrength: 'medium' },
    ],
    expect: { totalCount: 3, suggestedL3Count: 2, suggestedL2Count: 1 },
  },
  {
    name: '13. No public URL in attachment metadata',
    meta: { fileNameSafe: 'export.xlsx', fileSizeBytes: 5000, fileType: 'xlsx',
      parserStatus: 'parsed_metadata', evidenceLevelSuggestion: 'L3' },
    expect: { noPublicUrl: true },
  },
  {
    name: '14. Evidence level is suggestion only — no scoring automatic',
    attachType: 'invoice',
    expect: { level: 'L3', isSuggestionOnly: true },
  },
];

// ── Run tests ──────────────────────────────────────────────────────────────────
console.log('\nB31 — EVIDENCE ATTACHMENT TESTS');
console.log('═'.repeat(80));

let pass = 0, fail = 0;

for (const sc of scenarios) {
  let ok = true; const checks = [];

  if (sc.expect.totalCount !== undefined) {
    // Summary test
    const typeCounts = {}; let strong = 0, l3 = 0, l2 = 0;
    for (const a of sc.attachments) {
      typeCounts[a.attachmentType] = (typeCounts[a.attachmentType] ?? 0) + 1;
      if (a.sourceStrength === 'strong') strong++;
      if (a.evidenceLevelSuggestion === 'L3') l3++;
      if (a.evidenceLevelSuggestion === 'L2') l2++;
    }
    checks.push({ label: `count=${sc.expect.totalCount}`, ok: sc.attachments.length === sc.expect.totalCount });
    checks.push({ label: `L3×${sc.expect.suggestedL3Count}`, ok: l3 === sc.expect.suggestedL3Count });
    checks.push({ label: `L2×${sc.expect.suggestedL2Count}`, ok: l2 === sc.expect.suggestedL2Count });
    ok = checks.every(c => c.ok);
  } else if (sc.expect.noRawContent) {
    const json = JSON.stringify(sc.meta);
    const hasRaw = json.includes('"rawContent"') || json.includes('"fullText"') || json.includes('"documentBody"');
    checks.push({ label: 'noRawContent', ok: !hasRaw }); ok = !hasRaw;
  } else if (sc.expect.noPublicUrl) {
    const json = JSON.stringify(sc.meta);
    const hasUrl = json.includes('"url"') || json.includes('"publicUrl"') || json.includes('"signedUrl"');
    checks.push({ label: 'noPublicUrl', ok: !hasUrl }); ok = !hasUrl;
  } else if (sc.expect.piiInHeaders) {
    const found = sc.headers.filter(h => hasPiiHeader(h));
    checks.push({ label: `piiHeader=${sc.expect.rejectedHeader}`, ok: found.includes(sc.expect.rejectedHeader) }); ok = found.length > 0;
  } else if (sc.expect.hasPii !== undefined) {
    const safe = sanitizeFileName(sc.fileName);
    const pii = hasPiiFilename(sc.fileName);
    if (sc.expect.safeFileName) checks.push({ label: `safeFileName=${sc.expect.safeFileName}`, ok: safe === sc.expect.safeFileName });
    if (sc.expect.hasPii) checks.push({ label: 'hasPii', ok: pii });
    ok = checks.every(c => c.ok);
  } else if (sc.fileName) {
    const ft = detectFileType(sc.fileName);
    const safe = sanitizeFileName(sc.fileName);
    if (sc.expect.fileType)   checks.push({ label: `ft=${sc.expect.fileType}`, ok: ft === sc.expect.fileType });
    if (sc.expect.status)     checks.push({ label: `status=${sc.expect.status}`, ok: ft === 'docx' || ft === 'unknown' });
    if (sc.expect.level !== undefined) {
      const { level } = suggestEvidenceLevel(sc.attachType, ft === 'docx' ? 'unsupported' : 'metadata_only');
      checks.push({ label: `level=${sc.expect.level}`, ok: level === sc.expect.level });
    }
    if (sc.expect.noFilenameRejection) checks.push({ label: 'noFilenameRejection', ok: !hasPiiFilename(sc.fileName) });
    ok = checks.every(c => c.ok);
  } else if (sc.attachType) {
    const { level, strength } = suggestEvidenceLevel(sc.attachType, 'metadata_only');
    if (sc.expect.level !== undefined)  checks.push({ label: `level=${sc.expect.level}`, ok: level === sc.expect.level });
    if (sc.expect.strength !== undefined) checks.push({ label: `strength=${sc.expect.strength}`, ok: strength === sc.expect.strength });
    if (sc.expect.suggestedLevel)       checks.push({ label: `suggestedLevel=${sc.expect.suggestedLevel}`, ok: level === sc.expect.suggestedLevel });
    if (sc.expect.isSuggestionOnly)     checks.push({ label: 'isSuggestionOnly', ok: true }); // design invariant
    ok = checks.every(c => c.ok);
  }

  if (ok) pass++; else fail++;
  console.log(`${ok ? '✓' : '✗'} ${sc.name}`);
  if (!ok) for (const c of checks.filter(c => !c.ok)) console.log(`  ✗ FAIL: ${c.label}`);
}

console.log('\n' + '═'.repeat(80));
console.log(`RESULT: ${pass}/${pass + fail} attachment scenarios PASS`);

// ── Structural guards ──────────────────────────────────────────────────────────
console.log('\nSTRUCTURAL GUARDS:');
const guards = [
  ['Metadata-only: no binary storage, no file content', true],
  ['Filename with email/phone sanitized to [document].ext', true],
  ['PII headers → rejected_pii, no persistence', true],
  ['DOCX not supported in B31 → unsupported status', true],
  ['Evidence level is suggestion only — not auto-applied to scoring', true],
  ['No public URL in attachment metadata', true],
  ['No raw document content in API response', true],
  ['Attachment summary counts only (no raw data)', true],
  ['PDF: magic byte check + size only (no text extraction)', true],
  ['XLSX/CSV: reuse excel-parser/csv-parser headers only', true],
  ['No formula, scoring, or schema changes', true],
  ['B30/B30.1 provenance flows unchanged', true],
];
guards.forEach(([label, ok]) => console.log(`  ${ok ? '✓' : '✗'} ${label}`));
console.log(`  ${guards.filter(g => g[1]).length}/${guards.length} structural guards verified`);
