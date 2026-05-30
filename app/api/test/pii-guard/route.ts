// app/api/test/pii-guard/route.ts
// DEV/TEST ONLY — remove or isolate before production.
// Uses server-side PII guard only. No service_role, no DB access.
//
// Runs detection cases against lib/privacy/pii-guard.ts using
// SYNTHETIC and FAKE payloads only.
// No real PII, no real people data, no real emails/phones/CFs.
//
// Protection:
//   1. Returns 404 in NODE_ENV === 'production'.
//   2. Requires header x-kora-test-secret.

import { NextRequest, NextResponse } from 'next/server';
import {
  detectPiiInPayload,
  sanitizePayload,
  summarizePiiFindings,
} from '@/lib/privacy/pii-guard';

interface CaseResult {
  name:       string;
  pass:       boolean;
  hasPii:     boolean;
  findings:   number;
  detail:     string;
  sanitized?: boolean;
  // NEVER include actual PII values in the response
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const clientSecret = request.headers.get('x-kora-test-secret');
  if (!clientSecret || clientSecret !== process.env.KORA_TEST_SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cases: CaseResult[] = [];

  // ── Case 1: Safe synthetic payload ─────────────────────────────────────────

  {
    const payload = {
      synthetic: true, tenant_code: 'OP-001', row_index: 0,
      eligibility_status: 'eligible', primary_pillar: 'LIFE',
      raw_hash: 'sha256:synthetic:test', pseudonym_id: 'PSY-001',
    };
    const r = detectPiiInPayload(payload);
    cases.push({ name: 'safe_synthetic', pass: !r.hasPii, hasPii: r.hasPii, findings: r.findings.length, detail: 'synthetic payload — expect no PII' });
  }

  // ── Case 2: Email (synthetic, example.test domain) ──────────────────────────

  {
    // Uses RFC-reserved domain — not a real email address
    const payload = { contact_field: 'test-synthetic@example.test', row: 1 };
    const r = detectPiiInPayload(payload);
    const hasEmail = r.findings.some(f => f.riskType === 'EMAIL');
    // Verify no email value in findings
    const noValueLeaked = !JSON.stringify(r.findings).includes('example.test');
    cases.push({ name: 'email_flagged', pass: r.hasPii && hasEmail && noValueLeaked, hasPii: r.hasPii, findings: r.findings.length, detail: 'email pattern flagged; no value in findings' });
  }

  // ── Case 3: Italian CF (synthetic pattern) ──────────────────────────────────

  {
    // Constructed to match CF regex; not a real person's CF
    const fakeCf = 'TSTPRS80A01H501Y';
    const payload = { id_field: fakeCf };
    const r = detectPiiInPayload(payload);
    const hasCf = r.findings.some(f => f.riskType === 'ITALIAN_CF');
    const noValueLeaked = !JSON.stringify(r.findings).includes(fakeCf);
    cases.push({ name: 'cf_flagged', pass: r.hasPii && hasCf && noValueLeaked, hasPii: r.hasPii, findings: r.findings.length, detail: 'Italian CF pattern flagged; no value in findings' });
  }

  // ── Case 4: IBAN (synthetic test value) ─────────────────────────────────────

  {
    const fakeIban = 'IT00X0000000000000000000000';
    const payload  = { bank_field: fakeIban };
    const r = detectPiiInPayload(payload);
    const hasIban = r.findings.some(f => f.riskType === 'IBAN');
    const noValueLeaked = !JSON.stringify(r.findings).includes(fakeIban);
    cases.push({ name: 'iban_flagged', pass: r.hasPii && hasIban && noValueLeaked, hasPii: r.hasPii, findings: r.findings.length, detail: 'IBAN pattern flagged; no value in findings' });
  }

  // ── Case 5: Phone (all-zero synthetic) ─────────────────────────────────────

  {
    const payload = { contatto: '+39 0000000000' };
    const r = detectPiiInPayload(payload);
    const hasPhone = r.findings.some(f => f.riskType === 'PHONE');
    cases.push({ name: 'phone_flagged', pass: r.hasPii && hasPhone, hasPii: r.hasPii, findings: r.findings.length, detail: 'phone pattern flagged' });
  }

  // ── Case 6: Name keys ──────────────────────────────────────────────────────

  {
    const payload = { nome: 'SyntheticName', cognome: 'SyntheticSurname' };
    const r = detectPiiInPayload(payload);
    const hasName = r.findings.some(f => f.riskType === 'SUSPICIOUS_NAME_KEY');
    const noValueLeaked = !JSON.stringify(r.findings).includes('SyntheticName');
    cases.push({ name: 'name_key_flagged', pass: r.hasPii && hasName && noValueLeaked, hasPii: r.hasPii, findings: r.findings.length, detail: 'name keys flagged; no values in findings' });
  }

  // ── Case 7: Sanitization — PII replaced, safe fields preserved ─────────────

  {
    const fakeEmail = 'sanitize-test@example.test';
    const payload   = { email: fakeEmail, safe_data: 'FORM-2026', row_index: 5 };
    const result    = sanitizePayload(payload);
    const sanitizedStr = JSON.stringify(result.sanitized);
    const noEmailInSanitized = !sanitizedStr.includes(fakeEmail);
    const hasRedacted = sanitizedStr.includes('REDACTED_PII');
    const safePreserved = (result.sanitized['safe_data'] as string) === 'FORM-2026';
    cases.push({
      name: 'sanitize_redacts_pii',
      pass: noEmailInSanitized && hasRedacted && safePreserved,
      hasPii: true, findings: result.findingsCount,
      detail: 'PII replaced in sanitized output; safe fields preserved',
      sanitized: true,
    });
  }

  // ── Case 8: False positive — short numbers not phone ───────────────────────

  {
    const payload = {
      nome_iniziativa: 'Formazione professionale',  // "nome" is a prefix, not exact key
      partecipanti: 25, durata_ore: 120, importo: 1500,
    };
    const r = detectPiiInPayload(payload);
    cases.push({ name: 'false_positive_numbers', pass: !r.hasPii, hasPii: r.hasPii, findings: r.findings.length, detail: 'short numbers and nome_iniziativa should not be flagged' });
  }

  // ── Case 9: Audit summary — safe for logging ────────────────────────────────

  {
    const fakeEmail = 'audit-test@example.test';
    const payload   = { email: fakeEmail, extra: 'safe' };
    const { findings } = detectPiiInPayload(payload);
    const summary = summarizePiiFindings(findings);
    const summaryStr = JSON.stringify(summary);
    const noValueInSummary = !summaryStr.includes(fakeEmail);
    cases.push({ name: 'audit_summary_safe', pass: noValueInSummary && summary.total > 0, hasPii: true, findings: summary.total, detail: 'summary contains no PII values, only metadata' });
  }

  // ── Case 10: Nested PII ────────────────────────────────────────────────────

  {
    const payload = {
      meta: { synthetic: true },
      record: { contact: { email_field: 'deep@example.test' } },
    };
    const r = detectPiiInPayload(payload);
    const emailFinding = r.findings.find(f => f.riskType === 'EMAIL');
    const correctPath = emailFinding?.fieldPath === 'record.contact.email_field';
    cases.push({ name: 'nested_pii_detected', pass: r.hasPii && !!emailFinding && correctPath, hasPii: r.hasPii, findings: r.findings.length, detail: 'nested PII detected at correct path' });
  }

  const allPass = cases.every(c => c.pass);
  return NextResponse.json({
    ok:      allPass,
    verdict: allPass ? 'PASS' : 'FAIL',
    summary: { total: cases.length, pass: cases.filter(c => c.pass).length, fail: cases.filter(c => !c.pass).length },
    cases,
    // Safety confirmation: no PII values in this response
    pii_values_in_response: false,
    synthetic_test: true,
  }, { status: allPass ? 200 : 422 });
}
