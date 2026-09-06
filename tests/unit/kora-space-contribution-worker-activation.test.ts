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

  // PRIOR HISTORY (accurate as of the original four-state build, preserved
  // verbatim): "must have four-state detection — checking state renders
  // null" — asserted a setMode('empty') call existed. B-WORKER-3 (2026-09-06)
  // proved /worker/commons full parity and replaced kora-space's live/empty
  // distinction with a single redirect for any confirmed real session — an
  // authenticated worker now never sees this page's own content at all
  // (real or synthetic), regardless of whether they have data yet.
  // PRIOR HISTORY (accurate as of B-WORKER-3, preserved verbatim): asserted
  // a 'checking' state existed before redirecting a confirmed real session.
  // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06) made
  // the redirect unconditional — no checking state, no session probe.
  test('6. My KORA kora-space page redirects unconditionally to /worker/commons — no content of its own', () => {
    expect(spaceSrc).not.toContain("'checking'");
    expect(spaceSrc).toContain("redirect('/worker/commons')");
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): "Demo/
  // preview content is clearly labelled." B-WORKER "One Product / No Demo
  // Runtime" correction (2026-09-06) removed the demo/preview content
  // entirely — there is nothing left to label.
  test('7. No demo/preview content remains to label — page is a pure redirect', () => {
    expect(spaceSrc).not.toContain('kora-space-demo-label');
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): checked
  // app/my-kora/kora-space/page.tsx for testid "space-employer-privacy-notice".
  // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06) retired
  // that page — the canonical /worker/commons page carries the equivalent
  // guarantee under its own testid.
  test('8. Worker privacy copy exists on canonical /worker/commons (data-testid="worker-commons-privacy-notice")', () => {
    const commonsSrc = readFile('app/worker/commons/page.tsx');
    expect(commonsSrc).toContain('worker-commons-privacy-notice');
    expect(commonsSrc).toContain("il datore di lavoro non vede il tuo percorso individuale");
  });

  // PRIOR HISTORY (accurate as of the original four-state build, preserved
  // verbatim): asserted "appariranno qui" copy (the real-session, no-data-yet
  // wording) appeared alongside the empty-state testid. B-WORKER-3 retired
  // the real-session live/empty distinction here too (redirects to
  // /worker/bookings instead). B-WORKER "One Product / No Demo Runtime"
  // correction (2026-09-06) made the redirect unconditional — the canonical
  // /worker/bookings surface (BookingsClient.tsx) carries the empty state.
  test('9. Bookings page redirects unconditionally; canonical /worker/bookings has the empty state', () => {
    expect(bookingsSrc).not.toContain("'checking'");
    expect(bookingsSrc).toContain("redirect('/worker/bookings')");
    const clientSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
    expect(clientSrc).toContain('worker-bookings-empty-state');
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): checked
  // app/my-kora/bookings/page.tsx for testid "bookings-employer-privacy-notice".
  // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06) retired
  // that page — the canonical /worker/bookings surface carries the
  // equivalent guarantee under its own testid.
  test('10. Bookings employer privacy notice exists on canonical /worker/bookings', () => {
    const clientSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
    expect(clientSrc).toContain('worker-bookings-employer-privacy-notice');
    expect(clientSrc).toContain('Il datore di lavoro non vede il tuo percorso individuale');
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

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): checked
  // app/my-kora/kora-space/page.tsx for testid "space-timeline-connection-note".
  // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06) retired
  // that page — the canonical /worker/bookings surface links participation
  // to the personal timeline in its own copy.
  test('16. Space participation links to personal timeline conceptually (canonical /worker/bookings)', () => {
    const clientSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
    expect(clientSrc).toContain('timeline personale');
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
