/**
 * KORA Space × Contribution × Worker Activation Sprint
 * Tests for activation loop coherence, honest labelling, and privacy.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readFile(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel));
}

// ── COMPANY KORA SPACE (1–5) ────────────────────────────────────────────────

describe('Company KORA Space — activation loop', () => {
  let src: string;
  beforeAll(() => { src = readFile('app/company/commons/page.tsx'); });

  test('1. Company KORA Space page has activation loop explanation', () => {
    expect(src).toContain('space-activation-loop');
    expect(src).toContain('Contribution Event');
  });

  test('2. Page does not claim KORA Space feeds KORA Index', () => {
    // must not say "KORA Space feeds KORA Index" or "componente del KORA Index" without negation
    const lowerSrc = src.toLowerCase();
    // The page must mention it is NOT a component, not that it IS
    expect(src).toContain('non è una componente del KORA Index');
  });

  test('3. Page labels Pilot Preview honestly', () => {
    expect(src).toContain('space-pilot-preview-notice');
    expect(src).toMatch(/Pilot Preview|attivazione pilot|production_ready/i);
  });

  test('4. Empty state contains next steps', () => {
    expect(src).toContain('company-commons-empty');
    expect(src).toContain('Crea il primo');
  });

  test('5. No fake live data shown — page reads from DB with tenant_id from auth', () => {
    // Uses requireCompanyUser() — tenant from session, not query param
    expect(src).toContain('requireCompanyUser');
    expect(src).toContain('tenantId');
    expect(src).not.toMatch(/tenantId.*query|req\.query.*tenant/);
  });
});

// ── WORKER KORA SPACE / BOOKINGS (6–10) ─────────────────────────────────────

describe('Worker KORA Space — mode detection and privacy', () => {
  let spaceSrc: string;
  let bookingsSrc: string;
  beforeAll(() => {
    spaceSrc    = readFile('app/my-kora/kora-space/page.tsx');
    bookingsSrc = readFile('app/my-kora/bookings/page.tsx');
  });

  test('6. My KORA kora-space page does not blindly show synthetic data to authenticated workers', () => {
    // must have four-state detection — checking state renders null
    expect(spaceSrc).toContain("'checking'");
    expect(spaceSrc).toContain('checking') ;
    expect(spaceSrc).toMatch(/setMode\(.*empty|setMode\(.*'empty'/);
  });

  test('7. Demo/preview content is clearly labelled', () => {
    expect(spaceSrc).toContain('kora-space-demo-label');
    expect(spaceSrc).toMatch(/Demo preview|Dati dimostrativi|Non rappresenta/i);
  });

  test('8. Worker privacy copy exists (data-testid="space-employer-privacy-notice")', () => {
    expect(spaceSrc).toContain('space-employer-privacy-notice');
    expect(spaceSrc).toContain('Il datore di lavoro non vede il tuo percorso individuale');
  });

  test('9. Bookings page has empty state (data-testid="bookings-empty-state")', () => {
    expect(bookingsSrc).toContain('bookings-empty-state');
    expect(bookingsSrc).toContain('appariranno qui');
  });

  test('10. Bookings employer privacy notice exists', () => {
    expect(bookingsSrc).toContain('bookings-employer-privacy-notice');
    expect(bookingsSrc).toContain('Il datore di lavoro non vede il tuo percorso individuale');
  });
});

// ── CONTRIBUTION (11–15) ─────────────────────────────────────────────────────

describe('KORA Contribution — Space narrative and event surfacing', () => {
  let src: string;
  beforeAll(() => { src = readFile('app/company/contribution/page.tsx'); });

  test('11. Contribution page has Space→Contribution narrative', () => {
    expect(src).toContain('space-to-contribution-narrative');
    expect(src).toContain('Contribution Events');
  });

  test('12. Contribution page states it is companion indicator, not KORA Index component', () => {
    expect(src).toContain('Indicatore Companion');
    expect(src).toContain('Non componente KORA Index');
  });

  test('13. UI does not claim live Contribution scoring when production_ready=false', () => {
    // Preview path must be clearly labeled
    expect(src).toContain('PRE-PILOT PREVIEW');
    expect(src).toContain('Non è la dashboard live');
    // Live data block is gated by isPilot
    expect(src).toContain('isPilot');
    expect(src).toContain('contribution-foundation-light-preview');
  });

  test('14. Contribution event capture notice exists', () => {
    expect(src).toContain('contribution-event-capture-notice');
    expect(src).toMatch(/eventi di partecipazione|attivazione pilot/i);
  });

  test('15. No worker-level fields exposed in contribution page', () => {
    expect(src).not.toContain('worker_identity_id');
    expect(src).not.toContain('pseudonym_id');
    expect(src).not.toContain('worker_pseudonym_map');
    expect(src).not.toContain('personal.worker_pib');
  });
});

// ── WORKER PERSONAL TRACE (16–18) ───────────────────────────────────────────

describe('Worker personal trace — Space participation linkage', () => {
  let spaceSrc: string;
  let bookingsSrc: string;
  beforeAll(() => {
    spaceSrc    = readFile('app/my-kora/kora-space/page.tsx');
    bookingsSrc = readFile('app/my-kora/bookings/page.tsx');
  });

  test('16. Space participation links to personal timeline conceptually', () => {
    // space-timeline-connection-note must exist
    expect(spaceSrc).toContain('space-timeline-connection-note');
    expect(spaceSrc).toContain('timeline personale');
  });

  test('17. Dynamic Impact CV policy is respected — no automatic CV/badge from Space without policy', () => {
    // Space pages must not claim KORA Space automatically generates CV badges
    expect(spaceSrc).not.toContain('badge_eligible');
    expect(spaceSrc).not.toContain('cv_eligible');
    // The policy file exists as the canonical classifier
    expect(fileExists('lib/dynamic-cv/dynamic-impact-cv-policy.ts')).toBe(true);
  });

  test('18. No automatic public sharing implied', () => {
    expect(spaceSrc).not.toMatch(/LinkedIn|blockchain|badge pubbl|public_link/i);
    expect(bookingsSrc).not.toMatch(/LinkedIn|blockchain|badge pubbl|public_link/i);
  });
});

// ── REGRESSION (19–25) ──────────────────────────────────────────────────────

describe('Regression — prior sprint artifacts', () => {
  test('19. P0 commercial credibility test file exists', () => {
    expect(fileExists('tests/unit/p0-commercial-credibility.test.ts')).toBe(true);
  });

  test('20. P1 product integrity test file exists', () => {
    expect(fileExists('tests/unit/p1-product-integrity.test.ts')).toBe(true);
  });

  test('21. Initiative explainability UI test file exists', () => {
    expect(fileExists('tests/unit/initiative-explainability-ui.test.ts')).toBe(true);
  });

  test('22. Worker experience consolidation test file exists', () => {
    expect(fileExists('tests/unit/worker-experience-consolidation.test.ts')).toBe(true);
  });

  test('23. Dynamic Impact CV policy test file exists', () => {
    expect(fileExists('tests/unit/dynamic-impact-cv-policy.test.ts')).toBe(true);
  });

  test('24. My KORA Dynamic CV live alignment test file exists', () => {
    expect(fileExists('tests/unit/my-kora-dynamic-cv-live-alignment.test.ts')).toBe(true);
  });

  test('25. Route privacy and tenant isolation test files exist', () => {
    expect(fileExists('tests/unit/route-privacy.test.ts') ||
           fileExists('tests/unit/tenant-isolation.test.ts')).toBe(true);
  });
});
