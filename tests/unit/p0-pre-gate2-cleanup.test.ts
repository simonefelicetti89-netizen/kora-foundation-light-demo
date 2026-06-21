/**
 * P0 Pre-Gate 2 Cleanup Sprint
 * Three pre-Gate-2 risks identified by Broad KORA Platform Readiness Audit:
 *
 *   1. BookingService exposes raw Postgres/Supabase error messages to client
 *   2. Worker PIB trend hardcoded as 'stable' (no historical data exists)
 *   3. PIB overall_index formula undocumented and methodology-sensitive
 *
 * Static source analysis — no DB, no migration, no live calls.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel));
}

const BOOKING_SERVICE = 'services/commons/BookingService.ts';
const WORKER_PIB_SERVICE = 'services/worker-pib/WorkerPIBService.ts';
const WORKER_PIB_TYPES = 'lib/types/domains/worker-pib.ts';
const PIB_PAGE = 'app/my-kora/personal-impact-balance/page.tsx';

// ── Section 1: BookingService DB error sanitization (1–6) ─────────────────────

describe('BookingService — DB error sanitization', () => {
  let src: string;

  beforeAll(() => { src = read(BOOKING_SERVICE); });

  test('1. createBooking does not return raw error.message on DB failure', () => {
    // Find the insert block and verify no raw error.message is returned after it
    // The UNIQUE constraint 409 is a safe business-rule error — check the generic 500 path
    const insertBlock = src.match(/\.from\('booking'\)\s*\.insert\([\s\S]{0,500}?if \(error\) \{[\s\S]{0,500}?\}/)?.[0] ?? '';
    expect(insertBlock).not.toMatch(/return \{ ok: false, error: error\.message/);
  });

  test('2. cancelBooking does not return raw error.message on DB failure', () => {
    const cancelBlock = src.match(/async function cancelBooking[\s\S]{0,2000}?return \{ ok: true \}/)?.[0] ?? '';
    expect(cancelBlock).not.toMatch(/return \{ ok: false, error: error\.message/);
  });

  test('3. moderate does not return raw error.message on DB failure', () => {
    const moderateBlock = src.match(/async function moderate[\s\S]{0,2000}?booking: data as CommonsBooking/)?.[0] ?? '';
    expect(moderateBlock).not.toMatch(/return \{ ok: false, error: error\.message/);
  });

  test('4. markAttended does not return raw error.message on DB failure', () => {
    const attendedBlock = src.match(/async function markAttended[\s\S]{0,2000}?attribution: \{/)?.[0] ?? '';
    expect(attendedBlock).not.toMatch(/return \{ ok: false, error: updateErr\.message/);
  });

  test('5. Generic safe internal error constant defined', () => {
    expect(src).toContain('SAFE_INTERNAL_ERROR');
    expect(src).toContain('Errore interno. Riprova più tardi.');
  });

  test('6. Friendly 409 duplicate booking copy preserved', () => {
    expect(src).toContain('Prenotazione già esistente per questa iniziativa.');
    expect(src).toContain("error.code === '23505'");
  });

  test('6b. Safe business-rule errors preserved (not found, capacity, state machine)', () => {
    expect(src).toContain('Iniziativa non trovata.');
    expect(src).toContain('Solo le iniziative cross_company accettano prenotazioni.');
    expect(src).toContain('Capienza cross-azienda esaurita per questa iniziativa.');
    expect(src).toContain('Prenotazione non trovata.');
    expect(src).toContain('Solo le prenotazioni approved possono essere marcate attended.');
  });
});

// ── Section 2: Worker PIB trend (7–10) ────────────────────────────────────────

describe('WorkerPIBService — PIB pillar trend', () => {
  let src: string;
  let typesSrc: string;

  beforeAll(() => {
    src = read(WORKER_PIB_SERVICE);
    typesSrc = read(WORKER_PIB_TYPES);
  });

  test('7. _aggregatePIBRows does not hardcode trend: stable in live path', () => {
    // Extract the _aggregatePIBRows function block
    const fnBlock = src.match(/_aggregatePIBRows[\s\S]{0,4000}?return \{[\s\S]{0,200}?isSynthetic/)?.[0] ?? src;
    // The live path must not assign 'stable' as the trend
    expect(fnBlock).not.toMatch(/trend:\s*'stable' as const/);
  });

  test('8. _aggregatePIBRows uses not_available for trend when history is unavailable', () => {
    expect(src).toContain("'not_available' as const");
  });

  test('9. Code documents that cross-period trend requires historical worker PIB data', () => {
    expect(src).toContain('Cross-period trend non disponibile in Foundation Light');
  });

  test('10. WorkerPillarData type includes not_available as valid trend value', () => {
    expect(typesSrc).toContain("'not_available'");
    expect(typesSrc).toMatch(/trend:\s+'up' \| 'stable' \| 'down' \| 'not_available'/);
  });
});

// ── Section 3: PIB overall_index formula documentation (11–17) ───────────────

describe('WorkerPIBService — PIB overall_index formula', () => {
  let src: string;

  beforeAll(() => { src = read(WORKER_PIB_SERVICE); });

  test('11. Formula uses named scale factor constant, not bare literal 10', () => {
    // The formula should reference the named constant, not an anonymous literal
    expect(src).toContain('PIB_OVERALL_INDEX_SCALE_FACTOR');
    expect(src).toMatch(/period_iu_total \* PIB_OVERALL_INDEX_SCALE_FACTOR/);
    // Must not use the bare ×10 literal in the overall_index formula line
    // (note: \b avoids false match on period_iu_total * 100 used for pillar %)
    expect(src).not.toMatch(/period_iu_total \* 10\b/);
  });

  test('12. Scale factor constant value is 10 (documented provisional)', () => {
    expect(src).toMatch(/PIB_OVERALL_INDEX_SCALE_FACTOR\s*=\s*10/);
  });

  test('13. Documentation states pre_empirical_calibration', () => {
    expect(src).toContain('pre_empirical_calibration');
  });

  test('14. Documentation states worker PIB index is not employer-visible', () => {
    expect(src).toMatch(/NON è visibile al datore di lavoro|not_employer_visible/);
  });

  test('15. Documentation states worker PIB index is not a performance score', () => {
    expect(src).toMatch(/NON è un indicatore di performance|not_performance_score/);
  });

  test('16. Documentation states worker PIB index is not part of KORA Index', () => {
    expect(src).toMatch(/NON fa parte del KORA Index/);
  });

  test('17. Numerical formula structure unchanged: min(round(iu * factor), 100)', () => {
    expect(src).toMatch(/Math\.min\(Math\.round\(period_iu_total \* PIB_OVERALL_INDEX_SCALE_FACTOR\),\s*100\)/);
  });
});

// ── Section 4: UI — PIB page does not render unstable data (18) ──────────────

describe('PIB page — trend and formula display', () => {
  let src: string;

  beforeAll(() => { src = read(PIB_PAGE); });

  test('18. PIB page does not render overall_index as primary numeric metric to worker', () => {
    // B140b regression: overall_index must not appear as headline JSX interpolation
    const pibSectionStart = src.indexOf('data-testid="pib-section"');
    const pibSectionEnd   = src.indexOf('data-testid="iu-educational-panel"', pibSectionStart);
    const pibSection = pibSectionStart > 0 && pibSectionEnd > 0
      ? src.slice(pibSectionStart, pibSectionEnd)
      : '';
    expect(pibSection).not.toContain('pib_light.overall_index}');
    expect(pibSection).not.toContain('{pib.overall_index}');
  });
});

// ── Section 5: Regression — prior sprint and platform artifacts (19–23) ───────

describe('Regression — prior sprint artifacts preserved', () => {

  test('19. KORA Space booking tests still exist', () => {
    expect(fileExists('tests/unit/kora-space-inline-booking-ux.test.ts')).toBe(true);
    expect(fileExists('tests/unit/kora-space-small-bugfix-pilot-polish.test.ts')).toBe(true);
    expect(fileExists('tests/unit/b166-bookings-contribution.test.ts')).toBe(true);
  });

  test('20. Worker experience tests still exist', () => {
    expect(fileExists('tests/unit/worker-experience-consolidation.test.ts')).toBe(true);
    expect(fileExists('tests/unit/b161-worker-pib-routes.test.ts')).toBe(true);
    expect(fileExists('tests/unit/b161-worker-pib-live.test.ts')).toBe(true);
  });

  test('21. Route privacy test still exists', () => {
    expect(fileExists('tests/unit/route-privacy.test.ts')).toBe(true);
  });

  test('22. Methodology/scoring tests still exist', () => {
    expect(fileExists('tests/unit/pib-aggregation.test.ts')).toBe(true);
    expect(
      fileExists('tests/unit/b89b-pipeline-integration.test.ts') ||
      fileExists('tests/unit/sprint2-robustness.test.ts')
    ).toBe(true);
  });

  test('23. BookingService still enforces booking state machine rules', () => {
    const src = read(BOOKING_SERVICE);
    expect(src).toContain("Impossibile cancellare una prenotazione in stato: ");
    expect(src).toContain("Stato non moderabile:");
    expect(src).toContain("Solo le prenotazioni approved possono essere marcate attended.");
  });
});
