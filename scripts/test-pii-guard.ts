/**
 * Unit tests for lib/privacy/pii-guard.ts
 * Run with: npx tsx scripts/test-pii-guard.ts
 *
 * All "PII" in these tests is SYNTHETIC and FAKE:
 *   - Emails use example.test (RFC-reserved domain)
 *   - CFs are constructed to match the pattern but do NOT belong to real people
 *   - Phones are obviously fake (all-zero sequences)
 *   - IBANs are test-only values
 *
 * INVARIANT: this file must never contain real PII.
 */

import {
  detectPiiInPayload,
  sanitizePayload,
  validateNoPii,
  summarizePiiFindings,
} from '../lib/privacy/pii-guard';

let passed = 0;
let failed = 0;

function suite(name: string) { console.log(`\n${name}`); }

function expect(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// ── Suite 1: Safe synthetic payload — should PASS without findings ─────────

suite('Suite 1 — safe synthetic payload: no PII detected');
{
  const safe = {
    synthetic: true,
    tenant_code: 'OP-001',
    row_index: 0,
    eligibility_status: 'eligible',
    primary_pillar: 'LIFE',
    event_nature: 'consumed_service',
    raw_hash: 'sha256:synthetic:op:OP-001:001',
    pseudonym_id: 'PSY-OP-OP-001-001',
  };
  const r = detectPiiInPayload(safe);
  expect('hasPii = false', !r.hasPii);
  expect('findings empty', r.findings.length === 0);
  expect('validateNoPii = true', validateNoPii(safe));
}

// ── Suite 2: Email detection ──────────────────────────────────────────────────

suite('Suite 2 — email in payload: flagged as EMAIL/HIGH');
{
  // Synthetic fake email using RFC-reserved domain example.test
  const payload = { worker_contact: 'utente-sintetico@example.test', row: 1 };
  const r = detectPiiInPayload(payload);
  expect('hasPii = true', r.hasPii);
  const emailFinding = r.findings.find(f => f.riskType === 'EMAIL');
  expect('EMAIL finding exists', !!emailFinding);
  expect('severity = HIGH', emailFinding?.severity === 'HIGH');
  expect('fieldPath correct', emailFinding?.fieldPath === 'worker_contact');
  // Ensure value is NOT in findings
  expect('no PII value in finding', !JSON.stringify(emailFinding).includes('example.test'));
}

// ── Suite 3: Phone detection ──────────────────────────────────────────────────

suite('Suite 3 — phone number in payload: flagged as PHONE');
{
  // Fake Italian phone (all zeros — not a real number)
  const payload = { contatto: '+39 0000000000', codice: 'FORM-001' };
  const r = detectPiiInPayload(payload);
  const phoneFinding = r.findings.find(f => f.riskType === 'PHONE');
  expect('PHONE finding exists', !!phoneFinding);
  expect('fieldPath = contatto', phoneFinding?.fieldPath === 'contatto');
  // Ensure value is NOT in findings
  const findingStr = JSON.stringify(r.findings);
  expect('no phone value in findings', !findingStr.includes('0000000000'));
}

// ── Suite 4: Italian Codice Fiscale detection ─────────────────────────────────

suite('Suite 4 — synthetic CF pattern: flagged as ITALIAN_CF/HIGH');
{
  // Constructed to match CF regex but not belonging to any real person.
  // Format: 6 letters + 2 digits + letter + 2 digits + letter + 3 digits + letter
  const fakeCf = 'TSTPRS80A01H501Y';
  const payload = { identificativo: fakeCf, programma: 'FORM-2026' };
  const r = detectPiiInPayload(payload);
  const cfFinding = r.findings.find(f => f.riskType === 'ITALIAN_CF');
  expect('ITALIAN_CF finding exists', !!cfFinding);
  expect('severity = HIGH', cfFinding?.severity === 'HIGH');
  // Ensure value is NOT in findings
  expect('no CF value in findings', !JSON.stringify(r.findings).includes(fakeCf));
}

// ── Suite 5: IBAN detection ───────────────────────────────────────────────────

suite('Suite 5 — synthetic IBAN pattern: flagged as IBAN/HIGH');
{
  // Synthetic test IBAN — not a real account
  const fakeIban = 'IT00X0000000000000000000000';
  const payload = { coordinate_bancarie: fakeIban };
  const r = detectPiiInPayload(payload);
  const ibanFinding = r.findings.find(f => f.riskType === 'IBAN');
  expect('IBAN finding exists', !!ibanFinding);
  expect('severity = HIGH', ibanFinding?.severity === 'HIGH');
  expect('no IBAN value in findings', !JSON.stringify(r.findings).includes(fakeIban));
}

// ── Suite 6: Suspicious name key ─────────────────────────────────────────────

suite('Suite 6 — suspicious name keys: flagged as SUSPICIOUS_NAME_KEY/MEDIUM');
{
  const payload = { nome: 'Mario', cognome: 'Rossi', programma: 'FORM-2026' };
  const r = detectPiiInPayload(payload);
  const nameFindings = r.findings.filter(f => f.riskType === 'SUSPICIOUS_NAME_KEY');
  expect('at least 1 SUSPICIOUS_NAME_KEY finding', nameFindings.length >= 1);
  expect('nome or cognome flagged', nameFindings.some(f => f.fieldPath === 'nome' || f.fieldPath === 'cognome'));
  const findingStr = JSON.stringify(r.findings);
  expect('no name value in findings', !findingStr.includes('Mario') && !findingStr.includes('Rossi'));
}

// ── Suite 7: Nested payload with PII ─────────────────────────────────────────

suite('Suite 7 — nested payload with PII: flagged recursively');
{
  const payload = {
    meta: { synthetic: true },
    data: {
      worker: {
        contact: 'nested@example.test',
        pseudonym: 'PSY-001',
      },
    },
  };
  const r = detectPiiInPayload(payload);
  expect('hasPii = true', r.hasPii);
  const emailFinding = r.findings.find(f => f.riskType === 'EMAIL');
  expect('EMAIL found in nested path', emailFinding?.fieldPath === 'data.worker.contact');
}

// ── Suite 8: Audit summary — no PII values ───────────────────────────────────

suite('Suite 8 — summarizePiiFindings: no values in summary');
{
  const fakeIban = 'IT00X0000000000000000000000';
  const payload = {
    email: 'test@example.test',
    iban: fakeIban,
    nome: 'Mario',
  };
  const { findings } = detectPiiInPayload(payload);
  const summary = summarizePiiFindings(findings);

  const summaryStr = JSON.stringify(summary);
  expect('total > 0', summary.total > 0);
  expect('highSeverityCount > 0', summary.highSeverityCount > 0);
  expect('byRiskType populated', Object.keys(summary.byRiskType).length > 0);
  expect('no email address in summary', !summaryStr.includes('test@example.test'));
  expect('no IBAN in summary', !summaryStr.includes(fakeIban));
  expect('no name value in summary', !summaryStr.includes('Mario'));
  expect('fieldPaths are paths only', summary.fieldPaths.every(p => typeof p === 'string'));
}

// ── Suite 9: sanitizePayload — redacted output contains no PII values ────────

suite('Suite 9 — sanitizePayload: PII replaced, original not exposed');
{
  const fakeEmail = 'redact-me@example.test';
  const fakeCf    = 'TSTPRS80A01H501Y';
  const payload   = { email: fakeEmail, cf: fakeCf, safe_field: 'safe-value' };

  const result = sanitizePayload(payload);
  const sanitizedStr = JSON.stringify(result.sanitized);

  expect('findingsCount > 0', result.findingsCount > 0);
  expect('email value not in sanitized', !sanitizedStr.includes(fakeEmail));
  expect('CF value not in sanitized', !sanitizedStr.includes(fakeCf));
  expect('REDACTED placeholder present', sanitizedStr.includes('REDACTED_PII'));
  expect('safe_field preserved', (result.sanitized['safe_field'] as string) === 'safe-value');
  expect('fieldsRedacted populated', result.fieldsRedacted.length > 0);
}

// ── Suite 10: False positives — short numbers, initiative names ───────────────

suite('Suite 10 — false positives: short numbers and initiative names not flagged');
{
  const safe = {
    nome_iniziativa: 'Programma di supporto psicologico',  // "nome" as prefix, not exact key
    partecipanti:    25,           // short number — not a phone
    durata_ore:      120,          // short number — not a phone
    importo_eur:     1500.50,      // decimal — not a phone
    categoria:       'salute e benessere',
    tipo:            'consumed_service',
    codice_prog:     'FORM-2026-Q1', // alphanumeric code — not CF/IBAN
    row_index:       3,
    synthetic:       true,
  };
  const r = detectPiiInPayload(safe);
  expect('hasPii = false for safe synthetic payload', !r.hasPii);
  expect('no findings for initiative names', r.findings.length === 0,
    `unexpected findings: ${r.findings.map(f => f.fieldPath + ':' + f.riskType).join(', ')}`);
}

// ── Suite 11: Direct identifier key detection ─────────────────────────────────

suite('Suite 11 — direct identifier keys flagged as DIRECT_IDENTIFIER_KEY/HIGH');
{
  const payload = { telefono: '+39 0000000000', codice_fiscale: 'placeholder' };
  const r = detectPiiInPayload(payload);
  const directFindings = r.findings.filter(f => f.riskType === 'DIRECT_IDENTIFIER_KEY');
  expect('DIRECT_IDENTIFIER_KEY finding for telefono', directFindings.some(f => f.fieldPath === 'telefono'));
  expect('DIRECT_IDENTIFIER_KEY finding for codice_fiscale', directFindings.some(f => f.fieldPath === 'codice_fiscale'));
  expect('severity HIGH for direct identifiers', directFindings.every(f => f.severity === 'HIGH'));
}

// ── Suite 12: Deterministic — same input same output ─────────────────────────

suite('Suite 12 — deterministic: same input → same output');
{
  const payload = { email: 'test@example.test', safe: 'value' };
  const r1 = detectPiiInPayload(payload);
  const r2 = detectPiiInPayload(payload);
  const r3 = detectPiiInPayload(payload);
  expect('run 1 === run 2', JSON.stringify(r1) === JSON.stringify(r2));
  expect('run 2 === run 3', JSON.stringify(r2) === JSON.stringify(r3));
}

// ── Final report ──────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\nFAIL — ${failed} assertion(s) failed`);
  process.exit(1);
} else {
  console.log('\nPASS — all assertions passed');
}
