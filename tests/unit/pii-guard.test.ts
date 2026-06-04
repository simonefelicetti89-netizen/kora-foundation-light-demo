import { describe, it, expect } from 'vitest';
import { detectPiiInPayload, sanitizePayload, summarizePiiFindings } from '@/lib/privacy/pii-guard';

// All payloads are synthetic. RFC-reserved domains (example.test) and
// fictional codici fiscali are used to exercise the detector without
// ever touching real personal data.

describe('PII Guard — detection', () => {

  it('passes a safe aggregate row with no PII', () => {
    const result = detectPiiInPayload({
      initiative_name: 'Corso leadership avanzato',
      participants: 45,
      amount: 8000,
      pillar: 'GROWTH',
      eligibility: 'eligible',
    });
    expect(result.hasPii).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it('passes an empty object', () => {
    const result = detectPiiInPayload({});
    expect(result.hasPii).toBe(false);
  });

  it('flags an email address', () => {
    const result = detectPiiInPayload({ contact: 'test-synthetic@example.test' });
    expect(result.hasPii).toBe(true);
    const emailFinding = result.findings.find(f => f.riskType === 'EMAIL');
    expect(emailFinding).toBeTruthy();
    // PII value must NOT appear in findings
    expect(JSON.stringify(result.findings)).not.toContain('example.test');
  });

  it('flags an Italian codice fiscale', () => {
    // Constructed pattern — not a real person's CF
    const fakeCf = 'TSTPRS80A01H501Y';
    const result = detectPiiInPayload({ id_field: fakeCf });
    expect(result.hasPii).toBe(true);
    const cfFinding = result.findings.find(f => f.riskType === 'ITALIAN_CF');
    expect(cfFinding).toBeTruthy();
    expect(JSON.stringify(result.findings)).not.toContain(fakeCf);
  });

  it('flags a phone number', () => {
    const result = detectPiiInPayload({ contatto: '+39 0000000000' });
    expect(result.hasPii).toBe(true);
    const phoneFinding = result.findings.find(f => f.riskType === 'PHONE');
    expect(phoneFinding).toBeTruthy();
  });

  it('flags suspicious name keys (nome, cognome)', () => {
    const result = detectPiiInPayload({ nome: 'SyntheticName', cognome: 'SyntheticSurname' });
    expect(result.hasPii).toBe(true);
    const nameFinding = result.findings.find(f => f.riskType === 'SUSPICIOUS_NAME_KEY');
    expect(nameFinding).toBeTruthy();
    // Values must not appear in findings output
    expect(JSON.stringify(result.findings)).not.toContain('SyntheticName');
    expect(JSON.stringify(result.findings)).not.toContain('SyntheticSurname');
  });

  it('does not flag nome_iniziativa as a name key', () => {
    // nome_iniziativa is a standard KORA intake field — must not be flagged
    const result = detectPiiInPayload({
      nome_iniziativa: 'Formazione professionale',
      partecipanti: 25,
      importo: 1500,
    });
    expect(result.hasPii).toBe(false);
  });

  it('detects PII in nested objects and reports correct field path', () => {
    const result = detectPiiInPayload({
      meta: { synthetic: true },
      record: { contact: { email_field: 'deep@example.test' } },
    });
    expect(result.hasPii).toBe(true);
    const emailFinding = result.findings.find(f => f.riskType === 'EMAIL');
    expect(emailFinding).toBeTruthy();
    expect(emailFinding?.fieldPath).toContain('email_field');
  });

});

describe('PII Guard — sanitization', () => {

  it('replaces PII values and preserves safe fields', () => {
    const fakeEmail = 'sanitize-test@example.test';
    const result = sanitizePayload({
      email: fakeEmail,
      safe_data: 'FORM-2026',
      row_index: 5,
    });
    const sanitizedStr = JSON.stringify(result.sanitized);
    expect(sanitizedStr).not.toContain(fakeEmail);
    expect(sanitizedStr).toContain('REDACTED_PII');
    expect(result.sanitized['safe_data']).toBe('FORM-2026');
  });

});

describe('PII Guard — audit summary', () => {

  it('produces a summary with no PII values in output', () => {
    const fakeEmail = 'audit-test@example.test';
    const { findings } = detectPiiInPayload({ email: fakeEmail });
    const summary = summarizePiiFindings(findings);
    expect(JSON.stringify(summary)).not.toContain(fakeEmail);
    expect(summary.total).toBeGreaterThan(0);
  });

});
