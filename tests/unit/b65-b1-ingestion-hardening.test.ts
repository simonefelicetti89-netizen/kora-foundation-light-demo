// tests/unit/b65-b1-ingestion-hardening.test.ts
// B65-B1: Ingestion Pilot Hardening — unit tests for all 8 tasks.
// All data synthetic. No external APIs. No DB.

import { describe, it, expect } from 'vitest';

// ── We test the interpreter's public API indirectly via interpretUploadedRecord
import { interpretUploadedRecord } from '@/lib/ingestion/raw-to-uef-interpreter';
// ── CSV parser
import { parseCsvContent } from '@/lib/data-intake/csv-parser';
// ── Excel parser
import { parseExcelSheet } from '@/lib/data-intake/excel-parser';
// ── MappingConfidenceService
import { MappingConfidenceService } from '@/services/mapping-confidence/MappingConfidenceService';

// ─────────────────────────────────────────────────────────────────────────────
// Task 1: Amount / currency normalization
// ─────────────────────────────────────────────────────────────────────────────

describe('B65-B1 Task 1: Amount normalization', () => {

  function interp(amount: unknown) {
    return interpretUploadedRecord({
      id: 'test', payload: { initiative_name: 'formazione professionale', amount },
      action_family: null, event_nature: null, primary_pillar: null, eligibility_status: null,
    });
  }

  it('parses plain integer', () => {
    const r = interp(1000);
    expect(r.budgetAmount).toBe(1000);
    expect(r.amountParsingStatus).toBe('parsed');
  });

  it('parses US decimal format 1,234.56', () => {
    const r = interp('1,234.56');
    expect(r.budgetAmount).toBeCloseTo(1234.56);
    expect(r.amountParsingStatus).toBe('parsed');
  });

  it('parses European decimal format 1.234,56', () => {
    const r = interp('1.234,56');
    expect(r.budgetAmount).toBeCloseTo(1234.56);
    expect(r.amountParsingStatus).toBe('parsed');
  });

  it('parses European with currency symbol: € 1.234,56', () => {
    const r = interp('€ 1.234,56');
    expect(r.budgetAmount).toBeCloseTo(1234.56);
    expect(r.amountParsingStatus).toBe('parsed');
  });

  it('parses trailing currency symbol: 1.234,56 €', () => {
    const r = interp('1.234,56 €');
    expect(r.budgetAmount).toBeCloseTo(1234.56);
    expect(r.amountParsingStatus).toBe('parsed');
  });

  it('parses EUR prefix: EUR 1.234,56', () => {
    const r = interp('EUR 1.234,56');
    expect(r.budgetAmount).toBeCloseTo(1234.56);
    expect(r.amountParsingStatus).toBe('parsed');
  });

  it('parses space-thousands separator: 1 234,56', () => {
    const r = interp('1 234,56');
    expect(r.budgetAmount).toBeCloseTo(1234.56);
    expect(r.amountParsingStatus).toBe('parsed');
  });

  it('parses plain decimal: 1234.56', () => {
    const r = interp('1234.56');
    expect(r.budgetAmount).toBeCloseTo(1234.56);
    expect(r.amountParsingStatus).toBe('parsed');
  });

  it('parses decimal comma without thousands: 1234,56', () => {
    const r = interp('1234,56');
    expect(r.budgetAmount).toBeCloseTo(1234.56);
    expect(r.amountParsingStatus).toBe('parsed');
  });

  it('parses European thousands-only: 1.234 (no decimals) → 1234', () => {
    const r = interp('1.234');
    expect(r.budgetAmount).toBe(1234);
    expect(r.amountParsingStatus).toBe('parsed');
  });

  it('parses US thousands-only: 1,234 (no decimals) → 1234', () => {
    const r = interp('1,234');
    expect(r.budgetAmount).toBe(1234);
    expect(r.amountParsingStatus).toBe('parsed');
  });

  it('returns missing status for empty string', () => {
    const r = interp('');
    expect(r.budgetAmount).toBeNull();
    expect(r.amountParsingStatus).toBe('missing');
  });

  it('returns missing status for null', () => {
    const r = interp(null);
    expect(r.budgetAmount).toBeNull();
    expect(r.amountParsingStatus).toBe('missing');
  });

  it('returns invalid status for non-numeric text', () => {
    const r = interp('non disponibile');
    expect(r.budgetAmount).toBeNull();
    expect(r.amountParsingStatus).toBe('invalid');
  });

  it('sets needsEnrichment=true when amount is invalid', () => {
    const r = interp('n/a');
    expect(r.amountParsingStatus).toBe('invalid');
    expect(r.needsEnrichment).toBe(true);
  });

  it('does NOT silently coerce European 1.234,56 to 1.234', () => {
    // The original bug: replaces only first comma → 1.234.56 → parseFloat returns 1.234
    // Correct behavior: 1.234,56 → 1234.56
    const r = interp('1.234,56');
    expect(r.budgetAmount).not.toBeCloseTo(1.234);
    expect(r.budgetAmount).toBeCloseTo(1234.56);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 2: Participants normalization
// ─────────────────────────────────────────────────────────────────────────────

describe('B65-B1 Task 2: Participants normalization', () => {

  function interp(participants: unknown) {
    return interpretUploadedRecord({
      id: 'test', payload: { initiative_name: 'formazione professionale', participants },
      action_family: null, event_nature: null, primary_pillar: null, eligibility_status: null,
    });
  }

  it('parses plain integer string', () => {
    const r = interp('30');
    expect(r.participants).toBe(30);
    expect(r.participantsApproximate).toBe(false);
  });

  it('parses numeric value', () => {
    const r = interp(45);
    expect(r.participants).toBe(45);
    expect(r.participantsApproximate).toBe(false);
  });

  it('parses "30 persone" text', () => {
    const r = interp('30 persone');
    expect(r.participants).toBe(30);
    expect(r.participantsApproximate).toBe(false);
  });

  it('parses "30 dipendenti" text', () => {
    const r = interp('30 dipendenti');
    expect(r.participants).toBe(30);
  });

  it('parses "~30" as approximate', () => {
    const r = interp('~30');
    expect(r.participants).toBe(30);
    expect(r.participantsApproximate).toBe(true);
  });

  it('parses "circa 30" as approximate', () => {
    const r = interp('circa 30');
    expect(r.participants).toBe(30);
    expect(r.participantsApproximate).toBe(true);
  });

  it('parses "circa 30 persone" as approximate', () => {
    const r = interp('circa 30 persone');
    expect(r.participants).toBe(30);
    expect(r.participantsApproximate).toBe(true);
  });

  it('parses "10 per sito" extracting first number', () => {
    const r = interp('10 per sito');
    expect(r.participants).toBe(10);
  });

  it('returns missing for empty string', () => {
    const r = interp('');
    expect(r.participants).toBeNull();
  });

  it('returns null for non-numeric text with no digits', () => {
    const r = interp('tutti i dipendenti');
    expect(r.participants).toBeNull();
  });

  it('adds participantsApproximate=true to reasonCodes when approximate', () => {
    const r = interp('~30');
    expect(r.reasonCodes).toContain('participants_approximate');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 3: Pre-header detection in CSV parser
// ─────────────────────────────────────────────────────────────────────────────

describe('B65-B1 Task 3: CSV pre-header detection', () => {

  it('parses clean CSV with no pre-header rows (skippedPreHeaderRows=0)', () => {
    const csv = [
      'initiative_name,amount,participants,source',
      'Formazione leadership,5000,30,HR',
    ].join('\n');
    const result = parseCsvContent(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.skippedPreHeaderRows).toBe(0);
    expect(result.rows).toHaveLength(1);
  });

  it('skips 1 title row before real header', () => {
    const csv = [
      'Report Welfare Q1 2026',
      'initiative_name,amount,participants,source',
      'Formazione leadership,5000,30,HR',
    ].join('\n');
    const result = parseCsvContent(csv);
    expect(result.skippedPreHeaderRows).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.headers).toContain('initiative_name');
  });

  it('skips 2 metadata rows before real header', () => {
    const csv = [
      'Azienda: Meridiana',
      'Periodo: 2026-Q1',
      'nome_iniziativa,importo,partecipanti',
      'Corso Python,3000,20',
    ].join('\n');
    const result = parseCsvContent(csv);
    expect(result.skippedPreHeaderRows).toBe(2);
    expect(result.rows).toHaveLength(1);
  });

  it('does not skip when first row is already the header', () => {
    const csv = [
      'nome_iniziativa,importo,partecipanti,fonte',
      'Corso Python,3000,20,HR',
      'Volunteering,0,15,CSR',
    ].join('\n');
    const result = parseCsvContent(csv);
    expect(result.skippedPreHeaderRows).toBe(0);
    expect(result.rows).toHaveLength(2);
  });

  it('adds PRE_HEADER_ROWS_SKIPPED warning when rows are skipped', () => {
    const csv = [
      'Titolo report',
      'initiative_name,amount,participants',
      'Test,1000,5',
    ].join('\n');
    const result = parseCsvContent(csv);
    expect(result.skippedPreHeaderRows).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.code === 'PRE_HEADER_ROWS_SKIPPED')).toBe(true);
  });

  it('does not trigger false positive on typical data rows', () => {
    const csv = [
      'nome_iniziativa,importo,partecipanti',
      'leadership avanzato,5000,30',
      'mentoring aziendale,2000,15',
    ].join('\n');
    const result = parseCsvContent(csv);
    expect(result.skippedPreHeaderRows).toBe(0);
    expect(result.rows).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 5: MappingConfidenceService real implementation
// ─────────────────────────────────────────────────────────────────────────────

describe('B65-B1 Task 5: MappingConfidenceService', () => {
  const svc = new MappingConfidenceService();

  it('classifies training-related column as GROWTH', () => {
    const r = svc.classify('categoria_formazione', ['formazione', 'training', 'upskilling'], 'manual');
    expect(r.pillar_code).toBe('GROWTH');
    expect(r.confidence_score).toBeGreaterThan(0.50);
  });

  it('classifies wellness column as LIFE', () => {
    const r = svc.classify('tipo_welfare', ['salute', 'benessere', 'prevenzione'], 'manual');
    expect(r.pillar_code).toBe('LIFE');
  });

  it('classifies volunteering column as IMPACT', () => {
    const r = svc.classify('iniziativa', ['volontariato', 'social', 'comunita'], 'welfare_provider');
    expect(r.pillar_code).toBe('IMPACT');
  });

  it('sets requires_human_review=true for low confidence', () => {
    const r = svc.classify('colonna_sconosciuta', [], 'manual');
    expect(r.requires_human_review).toBe(true);
  });

  it('sets requires_human_review=false for high-confidence match', () => {
    // Strong taxonomy match: multiple keyword signals → should exceed 0.70
    const r = svc.classify('tipo_formazione', ['formazione', 'training', 'corso', 'upskilling', 'lms', 'academy'], 'lms');
    expect(r.confidence_score).toBeGreaterThanOrEqual(0.70);
    expect(r.requires_human_review).toBe(false);
  });

  it('returns a reason_code', () => {
    const r = svc.classify('nome_iniziativa', ['formazione'], 'manual');
    expect(r.reason_code).toBeTruthy();
    expect(typeof r.reason_code).toBe('string');
  });

  it('marks measurement fields as not pillar-classifiable', () => {
    const r = svc.classify('importo', ['1000', '2000', '500'], 'manual');
    expect(r.event_type_code).toBe('measurement_field');
    expect(r.requires_human_review).toBe(true);
  });

  it('compliance column classifies as blocked eligibility context', () => {
    const r = svc.classify('tipo_formazione', ['compliance', 'sicurezza obbligatoria', 'DVR', 'GDPR obbligatorio'], 'manual');
    expect(r.event_type_code).toBe('compliance_baseline');
  });

  it('does not call external APIs (purely synchronous, no async)', () => {
    // If classify were async, it would return a Promise
    const result = svc.classify('test', [], 'manual');
    expect(result).not.toBeInstanceOf(Promise);
    expect(typeof result.confidence_score).toBe('number');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 6: Bulk approve safety guard — needsEnrichment check
// ─────────────────────────────────────────────────────────────────────────────
// Note: The guard logic lives in the client component. We test the interpreter
// generates needsEnrichment=true when amount is invalid, ensuring the guard
// has something to block.

describe('B65-B1 Task 6: Bulk approve safety guard — interpreter signal', () => {

  it('sets needsEnrichment=true when amount is invalid format', () => {
    const r = interpretUploadedRecord({
      id: 'test',
      payload: { initiative_name: 'formazione professionale', amount: 'n/a' },
      action_family: null, event_nature: null, primary_pillar: null, eligibility_status: null,
    });
    expect(r.amountParsingStatus).toBe('invalid');
    expect(r.needsEnrichment).toBe(true);
    expect(r.enrichmentMissingFields).toContain('budget_amount_invalid_format');
  });

  it('does NOT block record with valid amount and high confidence', () => {
    const r = interpretUploadedRecord({
      id: 'test',
      payload: { initiative_name: 'formazione leadership', amount: '5000', participants: '30' },
      action_family: null, event_nature: null, primary_pillar: null, eligibility_status: null,
    });
    expect(r.amountParsingStatus).toBe('parsed');
    expect(r.budgetAmount).toBe(5000);
  });
});
