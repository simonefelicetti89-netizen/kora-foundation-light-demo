/**
 * KORA Space Inline Booking UX Sprint
 *
 * PRIOR HISTORY (accurate as of the original sprint, preserved as this
 * file's original framing): "Validates that the worker booking journey is
 * operational and inline from My KORA Space" — every assertion below read
 * app/my-kora/kora-space/page.tsx, which implemented its own inline booking
 * request/status logic directly in the page component.
 *
 * B-WORKER-2/3 (2026-09-06): /worker/commons is a proven CANONICAL_SUPERSET
 * of that page's live branch (which was removed — real sessions now redirect
 * to /worker/commons). The inline booking UI itself lives in the separate,
 * reusable components/commons/WorkerBookingButton.tsx component (already the
 * canonical implementation used by /worker/commons since B185), extended in
 * Slice 3 to also load persisted booking status on render (previously always
 * started 'idle' — the KORA Space parity gap Slice 2 found). Assertions below
 * now read WorkerBookingButton.tsx and app/worker/commons/page.tsx instead.
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

// ── PREFLIGHT / API (1–3) ─────────────────────────────────────────────────────

describe('Preflight — booking API contract and safety', () => {
  let buttonSrc:  string;
  let commonsSrc: string;
  let apiSrc:     string;
  let serviceSrc: string;

  beforeAll(() => {
    buttonSrc  = readFile('components/commons/WorkerBookingButton.tsx');
    commonsSrc = readFile('app/worker/commons/page.tsx');
    apiSrc     = readFile('app/api/worker/commons/bookings/route.ts');
    serviceSrc = readFile('services/commons/BookingService.ts');
  });

  test('1. WorkerBookingButton posts to /api/worker/commons/bookings (inline booking); /worker/commons pre-loads status awareness', () => {
    expect(buttonSrc).toContain('/api/worker/commons/bookings');
    expect(commonsSrc).toContain("schema('commons')");
    expect(commonsSrc).toContain("from('booking')");
  });

  test('2. Booking request does not use query tenant_id or worker_id — auth from JWT', () => {
    expect(buttonSrc).not.toMatch(/[?&](tenant_id|worker_id)=/);
    expect(commonsSrc).not.toMatch(/[?&](tenant_id|worker_id)=/);
    // API resolves identity from auth.id, not from body — verify in API route
    expect(apiSrc).toContain('auth.id');
    expect(apiSrc).toContain('auth.tenantId');
    expect(apiSrc).not.toMatch(/body.*tenant_id|body.*worker_id/);
  });

  test('3. No service-role / RLS bypass in the worker-facing booking components', () => {
    for (const src of [buttonSrc, commonsSrc]) {
      expect(src).not.toContain('getSupabaseServiceClient');
      expect(src).not.toContain('service_role');
      expect(src).not.toContain('serviceClient');
    }
    void serviceSrc; // kept for context — used by other describe blocks in this suite family
  });
});

// ── INLINE BOOKING (4–9) ──────────────────────────────────────────────────────

describe('Inline booking — WorkerBookingButton (canonical, /worker/commons)', () => {
  let buttonSrc: string;

  beforeAll(() => {
    buttonSrc = readFile('components/commons/WorkerBookingButton.tsx');
  });

  // PRIOR HISTORY: kora-space's own removed inline flow used the CTA copy
  // "Richiedi partecipazione" with testid prefix "space-request-booking-".
  // WorkerBookingButton (the surviving canonical implementation, predating
  // kora-space's inline flow — B185) always used different, equally clear
  // copy/testids — a pre-existing, harmless naming difference between the
  // two independent implementations, not something this slice introduced.
  test('4. Unbooked cards show a clear booking CTA with a stable per-initiative testid', () => {
    expect(buttonSrc).toContain('Prenota partecipazione');
    expect(buttonSrc).toContain('worker-book-btn-');
  });

  test('5. Request action uses POST to worker booking API', () => {
    expect(buttonSrc).toContain("method:  'POST'");
    expect(buttonSrc).toContain('/api/worker/commons/bookings');
    expect(buttonSrc).toContain('post_id: postId');
  });

  test('6. Success state shows canonical "Richiesta inviata" label', () => {
    expect(buttonSrc).toContain("setState('booked')");
    expect(buttonSrc).toContain('Richiesta inviata');
  });

  test('7. Failure state shows safe Italian error — no raw backend error exposed', () => {
    expect(buttonSrc).toContain('Impossibile completare la richiesta');
    expect(buttonSrc).toContain('Errore di rete');
    expect(buttonSrc).not.toMatch(/\{data\.error\}|\{error\.message\}/);
  });

  test('8. Already-booked status (loaded on render, Slice 3) suppresses the request CTA — shows status instead', () => {
    expect(buttonSrc).toContain('initialStatus');
    expect(buttonSrc).toContain('initialStateFor');
    // pending/approved/attended → 'booked' (status shown, no CTA); rejected/cancelled → 'duplicate'
    expect(buttonSrc).toMatch(/status === 'pending' \|\| status === 'approved' \|\| status === 'attended'/);
    expect(buttonSrc).toContain('worker-booking-success-');
  });

  test('9. Attended status shows read-only "Partecipazione completata" — no re-request CTA', () => {
    expect(buttonSrc).toContain("initialStatus === 'attended' ? 'Partecipazione completata'");
    // attended maps to the 'booked' branch (status badge), never back to the request button
    expect(buttonSrc).not.toMatch(/attended.*handleBooking|handleBooking.*attended/);
  });
});

// ── STATUS AWARENESS (10–12) ──────────────────────────────────────────────────

describe('Status awareness — booking status map and card status (server-side, /worker/commons)', () => {
  let commonsSrc: string;
  let buttonSrc:  string;

  beforeAll(() => {
    commonsSrc = readFile('app/worker/commons/page.tsx');
    buttonSrc  = readFile('components/commons/WorkerBookingButton.tsx');
  });

  // PRIOR HISTORY: kora-space's own removed inline flow fetched the status
  // map client-side (Promise.all of two client fetches). B-WORKER-3 moved
  // this to a server-side pre-fetch on /worker/commons (one RLS-scoped read,
  // no client round-trip needed before first paint) — same substance
  // (persisted status reflected on load), different, simpler mechanism.
  test('10. /worker/commons pre-fetches persisted booking status server-side and passes it into the button', () => {
    expect(commonsSrc).toContain('bookingStatusByPostId');
    expect(commonsSrc).toContain("schema('commons')");
    expect(commonsSrc).toContain('initialStatus={bookingStatusByPostId[initiative.id]}');
  });

  test('11. Status labels use canonical Italian copy', () => {
    expect(buttonSrc).toContain('Richiesta inviata');
    expect(buttonSrc).toContain('Partecipazione completata');
    expect(buttonSrc).toContain('Hai già una richiesta per questa iniziativa');
  });

  test('12. Booking status map uses post_id as key — no worker identity field access in rendered UI', () => {
    expect(commonsSrc).toContain('b.post_id');
    expect(commonsSrc).not.toMatch(/worker_identity_id\s*[:{]/);
    expect(commonsSrc).not.toMatch(/\{[^}]*worker_identity_id[^}]*\}/);
    expect(commonsSrc).not.toMatch(/pseudonym_id\s*[:{]/);
    // Scoped to rendered field access, not prose — buttonSrc's own comment
    // legitimately names worker_identity_id when explaining the UNIQUE
    // constraint that drives initialStateFor()'s mapping.
    expect(buttonSrc).not.toMatch(/worker_identity_id\s*[:{]/);
    expect(buttonSrc).not.toMatch(/\{[^}]*worker_identity_id[^}]*\}/);
    expect(buttonSrc).not.toContain('pseudonym_id');
  });
});

// ── PRIVACY / PRODUCT BOUNDARIES (13–18) ─────────────────────────────────────

describe('Privacy and product boundary copy (/worker/commons)', () => {
  let commonsSrc: string;

  beforeAll(() => {
    commonsSrc = readFile('app/worker/commons/page.tsx');
  });

  test('13. Employer privacy copy present and non-suppressible', () => {
    expect(commonsSrc).toContain('worker-commons-privacy-notice');
    expect(commonsSrc).toMatch(/non viene mostrata al datore di lavoro|non genera classifiche individuali/);
  });

  test('18. No worker identity or PII field access/rendering in component', () => {
    expect(commonsSrc).not.toMatch(/worker_identity_id\s*[:{]/);
    expect(commonsSrc).not.toMatch(/\{[^}]*worker_identity_id[^}]*\}/);
    expect(commonsSrc).not.toContain('pseudonym_id');
    expect(commonsSrc).not.toContain('worker_email');
    expect(commonsSrc).not.toContain('worker_name');
    expect(commonsSrc).not.toContain('worker_pib');
  });
});

// PRIOR HISTORY: tests 14–17 (KORA Contribution / KORA Index copy claims)
// and the original 19–21 (fallback handoff / booking-request notice) asserted
// specific marketing/product copy that lived only in kora-space's own removed
// live branch (KORA Contribution companion-indicator framing, the
// "/worker/commons — apri scheda completa" handoff link, and the
// "space-booking-request-notice" privacy blurb). That copy was specific to
// the retired duplicate rendering, not carried into /worker/commons or
// WorkerBookingButton verbatim — /worker/commons has its own privacy notice
// (tested above, #13) covering the same substance. No regression: the
// underlying invariants (no KORA Index causality claim, privacy boundary
// stated) are enforced elsewhere — see kora-space-contribution-worker-activation.test.ts
// and tests/unit/b106-company-area-live-boundary.test.ts for KORA
// Contribution/Index separation guards that are not page-specific.

// ── REGRESSION (22–26) ───────────────────────────────────────────────────────

describe('Regression — prior sprint artifacts preserved', () => {
  test('22. kora-space-pilot-usability test file exists', () => {
    expect(fileExists('tests/unit/kora-space-pilot-usability.test.ts')).toBe(true);
  });

  test('23. kora-space-operating-model test file exists', () => {
    expect(fileExists('tests/unit/kora-space-operating-model.test.ts')).toBe(true);
  });

  test('24. kora-space-admin-bookings-control test file exists', () => {
    expect(fileExists('tests/unit/kora-space-admin-bookings-control.test.ts')).toBe(true);
  });

  test('25. kora-space-contribution-worker-activation test file exists', () => {
    expect(fileExists('tests/unit/kora-space-contribution-worker-activation.test.ts')).toBe(true);
  });

  test('26. worker-experience-consolidation test file exists', () => {
    expect(fileExists('tests/unit/worker-experience-consolidation.test.ts')).toBe(true);
  });

  test('27. bworker-2/bworker-3 surface parity test files exist', () => {
    expect(fileExists('tests/unit/bworker-2-surface-parity.test.ts')).toBe(true);
  });
});
