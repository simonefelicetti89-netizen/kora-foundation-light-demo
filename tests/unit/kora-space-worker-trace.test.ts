/**
 * KORA Space Attendance → Worker Trace Hardening Sprint
 * Validates that the private worker trace created after attendance confirmation is:
 * - Surfaced correctly in My KORA bookings as a private trace
 * - Honestly described (no auto-CV, no auto-badge, no public sharing implied)
 * - Documented at the PIB timeline gap (source_uef_record_id=null)
 * - Reinforced in admin attendance UI
 * - Linked from worker workspace
 * - Privacy-safe throughout
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

// ── ATTENDANCE TRACE — MY KORA BOOKINGS (1–7) ─────────────────────────────────

describe('Attendance trace — My KORA bookings private trace surface', () => {
  let bookingsSrc: string;

  beforeAll(() => {
    bookingsSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
  });

  test('1. attended_at field is rendered in booking card for attended bookings', () => {
    expect(bookingsSrc).toContain('booking.attended_at');
    expect(bookingsSrc).toContain('Partecipazione confermata il');
  });

  test('2. booking-attended-trace-notice testid present in source', () => {
    expect(bookingsSrc).toContain('booking-attended-trace-notice');
  });

  test('3. Private trace copy: "Questa partecipazione è una traccia privata del tuo percorso My KORA"', () => {
    expect(bookingsSrc).toContain('Questa partecipazione è una traccia privata del tuo percorso My KORA');
  });

  test('4. "Eventuali segnali verso l\'organizzazione sono aggregati" present', () => {
    expect(bookingsSrc).toContain('Eventuali segnali verso');
    expect(bookingsSrc).toContain('sono aggregati');
  });

  test('5. "Non tutta la partecipazione in KORA Space entra nel Dynamic Impact CV"', () => {
    expect(bookingsSrc).toContain('Non tutta la partecipazione in KORA Space entra nel Dynamic Impact CV');
  });

  test('6. "Solo le esperienze idonee secondo la Dynamic Impact CV policy possono diventare esperienze CV"', () => {
    expect(bookingsSrc).toContain('Solo le esperienze idonee secondo la Dynamic Impact CV policy');
    expect(bookingsSrc).toContain('possono diventare esperienze CV');
  });

  test('7. "Il lavoratore controlla cosa rendere condivisibile"', () => {
    expect(bookingsSrc).toContain('Il lavoratore controlla cosa rendere condivisibile');
  });
});

// ── PIB TIMELINE GAP DOCUMENTATION (8–10) ────────────────────────────────────

describe('PIB timeline gap — honest documentation', () => {
  let pibSrc:   string;
  let attrSrc:  string;
  let bookingsSrc: string;

  beforeAll(() => {
    pibSrc      = readFile('services/worker-pib/WorkerPIBService.ts');
    attrSrc     = readFile('lib/commons/cross-company-attribution.ts');
    bookingsSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
  });

  test('8. WorkerPIBService documents that booking-sourced rows use source_booking_id', () => {
    expect(pibSrc).toContain('source_booking_id');
    // Timeline gap is documented
    expect(pibSrc).toMatch(/booking.sourced|source_booking_id|KORA Space.*attendance|booking.*attended/i);
  });

  test('9. cross-company-attribution sets source_uef_record_id to null for booking rows', () => {
    expect(attrSrc).toContain('source_uef_record_id: null');
    expect(attrSrc).toContain('source_booking_id');
  });

  test('10. Bookings page references Personal Impact Balance with honest availability copy', () => {
    expect(bookingsSrc).toContain('Personal Impact Balance');
    expect(bookingsSrc).toContain('quando disponibile');
  });
});

// ── DYNAMIC IMPACT CV POLICY RESPECTED (11–14) ───────────────────────────────

describe('Dynamic Impact CV — policy respected, no auto-inclusion', () => {
  let policyExists: boolean;
  let policySrc:    string;
  let typesSrc:     string;
  let bookingsSrc:  string;

  beforeAll(() => {
    policyExists = fileExists('lib/dynamic-cv/dynamic-impact-cv-policy.ts');
    policySrc    = policyExists ? readFile('lib/dynamic-cv/dynamic-impact-cv-policy.ts') : '';
    typesSrc     = readFile('lib/dynamic-cv/dynamic-cv-types.ts');
    bookingsSrc  = readFile('app/worker/bookings/_components/BookingsClient.tsx');
  });

  test('11. dynamic-impact-cv-policy.ts file exists', () => {
    expect(policyExists).toBe(true);
  });

  test('12. classifyForDynamicCV is exported from the policy file', () => {
    expect(policySrc).toContain('export function classifyForDynamicCV');
  });

  test('13. shareableByWorker defaults to false in dynamic-cv-types.ts (never public without explicit worker action)', () => {
    expect(typesSrc).toContain('shareableByWorker');
    expect(typesSrc).toContain('false');
    // The comment must state worker action is required
    expect(typesSrc).toMatch(/always false.*explicit|requires explicit/i);
  });

  test('14. Bookings page does not auto-add badges or claim automatic CV inclusion', () => {
    // No badge_eligible or auto-public language in worker-facing bookings page
    expect(bookingsSrc).not.toContain('badge_eligible');
    expect(bookingsSrc).not.toMatch(/badge pubbl|automaticamente.*CV|CV.*automaticamente/i);
    expect(bookingsSrc).not.toMatch(/LinkedIn|blockchain|public_link/i);
  });
});

// ── ADMIN ATTENDANCE ACTION CLARITY (15–17) ──────────────────────────────────

describe('Admin attendance action — clarity and honesty', () => {
  let adminSrc: string;

  beforeAll(() => {
    adminSrc = readFile('components/commons/AdminBookingModerationSection.tsx');
  });

  test('15. admin-booking-attendance-notice testid exists in admin section', () => {
    expect(adminSrc).toContain('admin-booking-attendance-notice');
  });

  test('16. Admin notice states individual journey remains private', () => {
    expect(adminSrc).toContain('Il percorso individuale resta privato');
  });

  test('17. Admin notice states action does not feed KORA Index', () => {
    expect(adminSrc).toContain('non alimenta il KORA Index');
    expect(adminSrc).toContain('companion indicator KORA Contribution');
  });
});

// ── WORKER WORKSPACE TRACE SUMMARY (18–19) ───────────────────────────────────

describe('Worker workspace — trace summary card', () => {
  let workspaceSrc: string;

  beforeAll(() => {
    workspaceSrc = readFile('app/worker/workspace/page.tsx');
  });

  test('18. workspace-trace-summary testid exists', () => {
    expect(workspaceSrc).toContain('workspace-trace-summary');
  });

  // PRIOR HISTORY (accurate before B-WORKER-3, preserved verbatim): asserted
  // the workspace bridge targeted /my-kora/bookings. B-WORKER-3 (2026-09-06)
  // built the canonical /worker/bookings page and repointed this bridge to
  // it — the private-trace copy is unchanged.
  test('19. Workspace links to canonical /worker/bookings and states private trace copy', () => {
    expect(workspaceSrc).toContain('/worker/bookings');
    expect(workspaceSrc).not.toContain('/my-kora/bookings');
    expect(workspaceSrc).toContain('Le partecipazioni confermate restano nel tuo percorso privato');
  });
});

// ── PRIVACY INVARIANTS (20) ──────────────────────────────────────────────────

describe('Privacy — attended booking card safety', () => {
  let bookingsSrc: string;

  beforeAll(() => {
    bookingsSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
  });

  test('20. No worker_identity_id field access rendered in bookings page', () => {
    // Comments mentioning field names are allowed; rendered field access is not
    expect(bookingsSrc).not.toMatch(/worker_identity_id\s*[:{]/);
    expect(bookingsSrc).not.toMatch(/\{[^}]*worker_identity_id[^}]*\}/);
    expect(bookingsSrc).not.toContain('pseudonym_id');
  });
});

// ── REGRESSION — PRIOR SPRINT ARTIFACTS PRESERVED (21–27) ────────────────────

describe('Regression — prior sprint artifacts preserved', () => {
  test('21. bookings-employer-privacy-notice testid preserved', () => {
    const src = readFile('app/worker/bookings/_components/BookingsClient.tsx');
    expect(src).toContain('bookings-employer-privacy-notice');
    expect(src).toContain('Il datore di lavoro non vede il tuo percorso individuale');
  });

  test('22. booking-record testid pattern preserved in bookings page', () => {
    const src = readFile('app/worker/bookings/_components/BookingsClient.tsx');
    expect(src).toContain('booking-record-');
  });

  test('23. admin-booking-attendance-notice testid preserved in admin section', () => {
    const src = readFile('components/commons/AdminBookingModerationSection.tsx');
    expect(src).toContain('admin-booking-attendance-notice');
  });

  // PRIOR HISTORY (accurate before B-WORKER-3, preserved verbatim): checked
  // kora-space's own BookingRequestNotice component (testid
  // space-booking-request-notice), used only in the live branch removed once
  // /worker/commons reached full parity — the component (dead code after
  // that removal) was deleted along with it. The same substance (the
  // request is private; KORA/Admin manages status; a private trace results)
  // is preserved on the canonical path: WorkerBookingButton's 'booked' state
  // copy and the salvaged booking-lifecycle explainer on /worker/commons.
  test('24. Booking-privacy substance (private request, KORA/Admin manages status) preserved on canonical /worker/commons', () => {
    const buttonSrc  = readFile('components/commons/WorkerBookingButton.tsx');
    const commonsSrc = readFile('app/worker/commons/page.tsx');
    expect(buttonSrc).toContain('in attesa di conferma KORA');
    expect(commonsSrc).toContain('KORA esamina la richiesta');
  });

  test('25. attributePIBForBooking is called in BookingService.markAttended', () => {
    const src = readFile('services/commons/BookingService.ts');
    expect(src).toContain('attributePIBForBooking');
    expect(src).toContain('markAttended');
  });

  test('26. attributeContributionForBooking is called in BookingService.markAttended', () => {
    const src = readFile('services/commons/BookingService.ts');
    expect(src).toContain('attributeContributionForBooking');
  });

  test('27. contribution_event is not referenced in worker-facing bookings page (company-only table)', () => {
    const src = readFile('app/worker/bookings/_components/BookingsClient.tsx');
    expect(src).not.toContain('contribution_event');
    expect(src).not.toContain('personal.worker_pib');
  });
});
