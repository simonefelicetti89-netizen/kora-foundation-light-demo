/**
 * KORA Space Pilot Usability Sprint
 * Validates enriched booking list, booking journey, admin moderation,
 * status copy normalization, and regression of operating model invariants.
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

// ── WORKER BOOKINGS (1–6) ────────────────────────────────────────────────────

// PRIOR HISTORY (accurate as of the original sprint, preserved verbatim):
// every assertion below read app/my-kora/bookings/page.tsx, which had its own
// real 'live' rendering of the worker's bookings. B-WORKER-3 (2026-09-06)
// migrated that EXISTING capability verbatim onto the canonical
// app/worker/bookings/_components/BookingsClient.tsx (a real,
// requireWorkerUser-gated page) — the legacy page now redirects a confirmed
// real session there instead of rendering its own copy of this content.
describe('Worker bookings — enriched list (canonical, /worker/bookings)', () => {
  let bookingsSrc: string;

  beforeAll(() => {
    bookingsSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
  });

  test('1. BookingsClient fetches real worker bookings from /api/worker/commons/bookings', () => {
    expect(bookingsSrc).toContain('/api/worker/commons/bookings');
    expect(bookingsSrc).toMatch(/setMode\(.*'live'|setMode\(.*'empty'/);
  });

  test('2. Booking list shows a human-readable initiative title, not only raw post_id', () => {
    expect(bookingsSrc).toContain('initiative?.title');
    expect(bookingsSrc).toContain('Iniziativa #');
  });

  test('3. Booking enrichment fetches /api/commons/initiatives to resolve titles', () => {
    expect(bookingsSrc).toContain('/api/commons/initiatives');
    expect(bookingsSrc).toContain('initiativesMap');
  });

  test('4. Empty state is honest when no bookings exist', () => {
    expect(bookingsSrc).toContain("worker-bookings-empty-state");
    expect(bookingsSrc).toMatch(/Vai a KORA Space|Le tue prenotazioni.*appariranno/i);
  });

  test('5. Employer privacy copy remains visible', () => {
    expect(bookingsSrc).toContain('worker-bookings-employer-privacy-notice');
    expect(bookingsSrc).toContain('Il datore di lavoro non vede il tuo percorso individuale');
  });

  test('6. No worker IDs or other workers fields exposed', () => {
    expect(bookingsSrc).not.toContain('worker_identity_id');
    expect(bookingsSrc).not.toContain('worker_email');
    expect(bookingsSrc).not.toContain('worker_name');
    expect(bookingsSrc).not.toContain('worker_pib');
  });
});

// ── STATUS COPY (7–9) ────────────────────────────────────────────────────────

describe('Booking status copy — canonical Italian labels', () => {
  let bookingsSrc: string;

  beforeAll(() => {
    bookingsSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
  });

  test('7. Status pending/requested maps to "Richiesta inviata"', () => {
    expect(bookingsSrc).toContain('Richiesta inviata');
    expect(bookingsSrc).toContain("pending");
  });

  test('8. Status approved/confirmed maps to "Partecipazione confermata"', () => {
    expect(bookingsSrc).toContain('Partecipazione confermata');
    expect(bookingsSrc).toContain("approved");
  });

  test('9. Status rejected, attended, cancelled, and unknown fallback all present', () => {
    expect(bookingsSrc).toContain('Richiesta non approvata');
    expect(bookingsSrc).toContain('Partecipazione completata');
    expect(bookingsSrc).toContain('Annullata');
    expect(bookingsSrc).toContain('Stato in verifica');
  });
});

// ── WORKER BOOKING JOURNEY (10–15) ──────────────────────────────────────────

// PRIOR HISTORY (accurate as of the original sprint, preserved verbatim):
// tests 10–12 read app/my-kora/kora-space/page.tsx's own removed live
// branch. B-WORKER-3 (2026-09-06) salvaged the booking-lifecycle explainer
// verbatim onto /worker/commons (the proven canonical superset) instead of
// leaving it duplicated/stranded — see app/worker/commons/page.tsx's
// space-booking-lifecycle block. WorkerBookingButton is the canonical CTA.
describe('Worker KORA Space — booking journey (canonical, /worker/commons)', () => {
  let commonsSrc: string;
  let buttonSrc:  string;
  let spaceSrc:   string; // still used by tests 13–15 below (unchanged demo-mode copy)

  beforeAll(() => {
    commonsSrc = readFile('app/worker/commons/page.tsx');
    buttonSrc  = readFile('components/commons/WorkerBookingButton.tsx');
    spaceSrc   = readFile('app/my-kora/kora-space/page.tsx');
  });

  test('10. Live initiative cards link to booking flow intentionally', () => {
    expect(buttonSrc).toContain('Prenota partecipazione');
    expect(commonsSrc).toContain('WorkerBookingButton');
  });

  test('11. UI explains the booking lifecycle steps', () => {
    expect(commonsSrc).toContain('space-booking-lifecycle');
    expect(commonsSrc).toContain('Come funziona la partecipazione');
    expect(commonsSrc).toContain('Richiedi partecipazione su KORA Space');
    expect(commonsSrc).toContain('Traccia privata nel tuo percorso personale');
  });

  test('12. UI states employer sees only aggregate signals', () => {
    expect(commonsSrc).toContain('il datore di lavoro non vede il tuo percorso individuale');
  });

  test('13. UI does not claim automatic badge for all participation', () => {
    expect(spaceSrc).toMatch(/Non tutta la partecipazione.*badge|non tutta.*diventa badge/i);
    expect(spaceSrc).not.toMatch(/automaticamente.*badge|badge.*automatico/i);
  });

  test('14. UI does not claim automatic Dynamic CV inclusion', () => {
    expect(spaceSrc).toContain('Dynamic Impact CV policy');
    expect(spaceSrc).not.toMatch(/automaticamente.*Dynamic CV|Dynamic CV.*automatico/i);
  });

  test('15. UI does not reference LinkedIn, blockchain, or public badge features', () => {
    expect(spaceSrc).not.toContain('LinkedIn');
    expect(spaceSrc).not.toContain('blockchain');
    expect(spaceSrc).not.toMatch(/public badge|badge pubblico/i);
  });
});

// ── ADMIN MODERATION (16–19) ─────────────────────────────────────────────────

describe('Admin booking moderation', () => {
  let adminCommonsSrc: string;
  let adminBookingSectionSrc: string;
  let adminLayoutSrc: string;

  beforeAll(() => {
    adminCommonsSrc       = readFile('app/admin/commons/page.tsx');
    adminBookingSectionSrc = readFile('components/commons/AdminBookingModerationSection.tsx');
    adminLayoutSrc        = readFile('app/admin/layout.tsx');
  });

  test('16. Admin booking UI is KORA_ADMIN-gated via layout and page', () => {
    expect(adminLayoutSrc).toContain('requireKoraAdmin');
    expect(adminCommonsSrc).toContain('requireKoraAdmin');
  });

  test('17. Admin UI lists bookings using /api/admin/commons/bookings (safe fields only)', () => {
    expect(adminBookingSectionSrc).toContain('/api/admin/commons/bookings');
    // worker_identity_id may appear in privacy-notice comments but must not be a rendered field
    expect(adminBookingSectionSrc).not.toMatch(/worker_identity_id\s*:/); // no field definition/access
    expect(adminBookingSectionSrc).not.toContain('worker_email');
    expect(adminBookingSectionSrc).not.toContain('worker_name');
  });

  test('18. Admin UI exposes approve/reject/mark-attended actions through existing APIs', () => {
    expect(adminBookingSectionSrc).toContain("'approve'");
    expect(adminBookingSectionSrc).toContain("'reject'");
    expect(adminBookingSectionSrc).toContain("'attended'");
    expect(adminBookingSectionSrc).toContain('/api/admin/commons/bookings/');
  });

  test('19. Admin booking privacy notice is non-suppressible', () => {
    expect(adminBookingSectionSrc).toContain('admin-booking-privacy-notice');
    expect(adminBookingSectionSrc).toContain('Anonimato worker garantito');
  });
});

// ── OPERATING MODEL REGRESSION (20–22) ──────────────────────────────────────

describe('Operating model — regression', () => {
  let spaceSrc: string;
  let companyCommonsSrc: string;
  let contributionSrc: string;

  beforeAll(() => {
    spaceSrc          = readFile('app/my-kora/kora-space/page.tsx');
    companyCommonsSrc = readFile('app/company/commons/page.tsx');
    contributionSrc   = readFile('app/company/contribution/page.tsx');
  });

  test('20. KORA Space still describes itself as activation environment', () => {
    expect(companyCommonsSrc).toContain("layer operativo dell&apos;attivazione umana");
  });

  test('21. KORA Contribution is still companion indicator — not KORA Index component', () => {
    expect(spaceSrc).toMatch(/indicatore companion/i);
    expect(spaceSrc).toMatch(/non è una componente del KORA Index|non è il KORA Index/i);
    expect(contributionSrc).toContain('Non componente KORA Index');
  });

  test('22. Space does not claim to feed KORA Index', () => {
    expect(companyCommonsSrc).toContain('non influenza');
    expect(companyCommonsSrc).not.toMatch(/KORA Space alimenta.*KORA Index|KORA Space è.*componente.*KORA Index/i);
  });
});

// ── PRIOR SPRINT REGRESSION (file existence) ────────────────────────────────

describe('Prior sprint test files exist', () => {
  test('operating model test file exists', () => {
    expect(fileExists('tests/unit/kora-space-operating-model.test.ts')).toBe(true);
  });

  test('contribution activation test file exists', () => {
    expect(fileExists('tests/unit/kora-space-contribution-worker-activation.test.ts')).toBe(true);
  });

  test('admin API files exist', () => {
    expect(fileExists('app/api/admin/commons/bookings/route.ts')).toBe(true);
    expect(fileExists('app/api/admin/commons/bookings/[id]/route.ts')).toBe(true);
  });

  test('worker booking API files exist', () => {
    expect(fileExists('app/api/worker/commons/bookings/route.ts')).toBe(true);
    expect(fileExists('app/api/worker/commons/bookings/[id]/route.ts')).toBe(true);
  });
});
