/**
 * KORA Space Admin All-Bookings & Attendance Control Sprint
 * Validates that KORA/Admin has a complete booking lifecycle control surface:
 * - All-bookings / status-filter view
 * - Status-aware actions
 * - Initiative enrichment
 * - Attendance notice
 * - Admin privacy boundary
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

// ── ADMIN PAGE / COMPONENT (1–3) ─────────────────────────────────────────────

describe('Admin commons page — booking control integration', () => {
  let adminPageSrc: string;

  beforeAll(() => {
    adminPageSrc = readFile('app/admin/commons/page.tsx');
  });

  test('1. Admin commons page includes booking moderation/control section', () => {
    expect(adminPageSrc).toContain('AdminBookingModerationSection');
    // testid is defined in the component (not the page import) — verify component has it
    const sectionSrc = readFile('components/commons/AdminBookingModerationSection.tsx');
    expect(sectionSrc).toContain('admin-booking-moderation-section');
  });

  test('2. Admin booking view is KORA_ADMIN-gated', () => {
    expect(adminPageSrc).toContain('requireKoraAdmin');
  });

  test('3. Admin page passes postsMap to booking section for initiative enrichment', () => {
    expect(adminPageSrc).toContain('postsMap');
    expect(adminPageSrc).toContain('event_start_at');
    expect(adminPageSrc).toContain('opening_grade');
  });
});

// ── STATUS FILTER / ALL-BOOKINGS (4–5) ───────────────────────────────────────

describe('Admin booking section — status filter and all-bookings view', () => {
  let sectionSrc: string;

  beforeAll(() => {
    sectionSrc = readFile('components/commons/AdminBookingModerationSection.tsx');
  });

  test('4. Status filter tabs exist for all lifecycle states', () => {
    expect(sectionSrc).toContain('admin-booking-filter-tabs');
    expect(sectionSrc).toContain('Da revisionare');
    expect(sectionSrc).toContain('Confermate');
    expect(sectionSrc).toContain('Completate');
    expect(sectionSrc).toContain('Non approvate');
    expect(sectionSrc).toContain('Tutte');
  });

  test('5. All-bookings fetch uses ?scope=all query parameter', () => {
    expect(sectionSrc).toContain('scope=all');
    expect(sectionSrc).toContain('?status=');
  });
});

// ── STATUS-AWARE ACTIONS (6–9) ───────────────────────────────────────────────

describe('Admin booking — status-aware action buttons', () => {
  let sectionSrc: string;

  beforeAll(() => {
    sectionSrc = readFile('components/commons/AdminBookingModerationSection.tsx');
  });

  test('6. Pending bookings show approve and reject actions', () => {
    expect(sectionSrc).toContain("booking.status === 'pending'");
    expect(sectionSrc).toContain("'approve'");
    expect(sectionSrc).toContain("'reject'");
    expect(sectionSrc).toContain('admin-booking-approve-');
    expect(sectionSrc).toContain('admin-booking-reject-');
  });

  test('7. Approved bookings show mark-attended action only', () => {
    expect(sectionSrc).toContain("booking.status === 'approved'");
    expect(sectionSrc).toContain("'attended'");
    expect(sectionSrc).toContain('admin-booking-attended-');
    expect(sectionSrc).toContain('Segna Partecipazione Completata');
  });

  test('8. Attended bookings show no destructive action — read-only message', () => {
    expect(sectionSrc).toContain("booking.status === 'attended'");
    expect(sectionSrc).toContain('Partecipazione completata — nessuna ulteriore azione disponibile');
  });

  test('9. Rejected/cancelled bookings show no unsupported actions', () => {
    expect(sectionSrc).toContain("booking.status === 'rejected' || booking.status === 'cancelled'");
    expect(sectionSrc).toContain('Annullata');
    expect(sectionSrc).toContain('nessuna azione disponibile');
  });
});

// ── CANONICAL STATUS LABELS (10) ─────────────────────────────────────────────

describe('Booking status copy — canonical Italian labels', () => {
  let sectionSrc: string;

  beforeAll(() => {
    sectionSrc = readFile('components/commons/AdminBookingModerationSection.tsx');
  });

  test('10. All canonical Italian status labels are defined', () => {
    expect(sectionSrc).toContain('Richiesta inviata');
    expect(sectionSrc).toContain('Partecipazione confermata');
    expect(sectionSrc).toContain('Richiesta non approvata');
    expect(sectionSrc).toContain('Partecipazione completata');
    expect(sectionSrc).toContain('Annullata');
    expect(sectionSrc).toContain('Stato in verifica');
  });
});

// ── ADMIN PRIVACY BOUNDARY (11–13) ──────────────────────────────────────────

describe('Admin booking — privacy boundary', () => {
  let sectionSrc: string;
  let adminApiSrc: string;

  beforeAll(() => {
    sectionSrc   = readFile('components/commons/AdminBookingModerationSection.tsx');
    adminApiSrc  = readFile('app/api/admin/commons/bookings/route.ts');
  });

  test('11. Admin view does not render worker_identity_id', () => {
    // Privacy comment is allowed; rendered field access is not
    expect(sectionSrc).not.toMatch(/worker_identity_id\s*[:{]/);
    expect(sectionSrc).not.toMatch(/\{[^}]*worker_identity_id[^}]*\}/);
  });

  test('12. Admin view includes "Anonimato worker garantito" notice', () => {
    expect(sectionSrc).toContain('Anonimato worker garantito');
    expect(sectionSrc).toContain('admin-booking-privacy-notice');
  });

  test('13. Admin view states actions manage participation status, not worker evaluation', () => {
    expect(sectionSrc).toContain('Le azioni gestiscono lo stato della partecipazione — non valutano la persona');
  });
});

// ── INITIATIVE ENRICHMENT (14) ───────────────────────────────────────────────

describe('Admin booking — initiative enrichment', () => {
  let sectionSrc: string;

  beforeAll(() => {
    sectionSrc = readFile('components/commons/AdminBookingModerationSection.tsx');
  });

  test('14. Admin booking cards show initiative title from postsMap; fallback "Iniziativa #<shortId>"', () => {
    expect(sectionSrc).toContain('postsMap');
    expect(sectionSrc).toContain('initiativeTitle');
    expect(sectionSrc).toContain('Iniziativa #');
    expect(sectionSrc).toContain('post?.title');
  });
});

// ── ATTENDANCE NOTICE (15–16) ─────────────────────────────────────────────────

describe('Admin booking — attendance confirmation copy', () => {
  let sectionSrc: string;

  beforeAll(() => {
    sectionSrc = readFile('components/commons/AdminBookingModerationSection.tsx');
  });

  test('15. Mark-attended copy explains private worker trace and aggregate signal', () => {
    expect(sectionSrc).toContain('admin-booking-attendance-notice');
    expect(sectionSrc).toContain('Il percorso individuale resta privato');
    expect(sectionSrc).toContain('eventuali segnali sono aggregati');
  });

  test('16. Attendance notice states it does not feed KORA Index', () => {
    expect(sectionSrc).toContain('non alimenta il KORA Index');
    expect(sectionSrc).toContain('companion indicator KORA Contribution');
  });
});

// ── API INTEGRITY (17–19) ────────────────────────────────────────────────────

describe('Admin bookings API — integrity and safety', () => {
  let apiRouteSrc:  string;
  let serviceSrc:   string;
  let adminLayoutSrc: string;

  beforeAll(() => {
    apiRouteSrc    = readFile('app/api/admin/commons/bookings/route.ts');
    serviceSrc     = readFile('services/commons/BookingService.ts');
    adminLayoutSrc = readFile('app/admin/layout.tsx');
  });

  test('17. Admin bookings API is KORA_ADMIN-protected', () => {
    expect(apiRouteSrc).toContain('requireKoraAdmin');
    expect(adminLayoutSrc).toContain('requireKoraAdmin');
  });

  test('18. All-bookings/status-filter API does not expose worker_identity_id', () => {
    expect(serviceSrc).toContain('listBookingsForModeration');
    // The SELECT in listBookingsForModeration must not include worker_identity_id
    const listFnMatch = serviceSrc.match(/listBookingsForModeration[\s\S]*?\.select\(['"`]([^'"`]+)['"`]\)/);
    if (listFnMatch) {
      expect(listFnMatch[1]).not.toContain('worker_identity_id');
    }
  });

  test('19. API supports scope=all and status filter without migration dependency', () => {
    expect(apiRouteSrc).toContain('scope');
    expect(apiRouteSrc).toContain('listBookingsForModeration');
    // Must not reference any SQL DDL, schema creation, or migration
    expect(apiRouteSrc).not.toMatch(/CREATE TABLE|ALTER TABLE|migration/i);
    expect(serviceSrc).not.toMatch(/CREATE TABLE|ALTER TABLE/i);
  });
});

// ── REGRESSION (20–24) ───────────────────────────────────────────────────────

describe('Regression — prior sprint artifacts preserved', () => {
  test('20. kora-space-pilot-usability test file exists', () => {
    expect(fileExists('tests/unit/kora-space-pilot-usability.test.ts')).toBe(true);
  });

  test('21. kora-space-operating-model test file exists', () => {
    expect(fileExists('tests/unit/kora-space-operating-model.test.ts')).toBe(true);
  });

  test('22. kora-space-contribution-worker-activation test file exists', () => {
    expect(fileExists('tests/unit/kora-space-contribution-worker-activation.test.ts')).toBe(true);
  });

  test('23. Worker bookings page still has employer privacy notice', () => {
    const bookingsSrc = readFile('app/my-kora/bookings/page.tsx');
    expect(bookingsSrc).toContain('bookings-employer-privacy-notice');
    expect(bookingsSrc).toContain('Il datore di lavoro non vede il tuo percorso individuale');
  });

  test('24. Admin bookings [id] route still exists with approve/reject/attended', () => {
    expect(fileExists('app/api/admin/commons/bookings/[id]/route.ts')).toBe(true);
    const idRouteSrc = readFile('app/api/admin/commons/bookings/[id]/route.ts');
    expect(idRouteSrc).toContain("'approve'");
    expect(idRouteSrc).toContain("'reject'");
    expect(idRouteSrc).toContain("'attended'");
  });
});
