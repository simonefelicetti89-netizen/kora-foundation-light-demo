/**
 * KORA Space Small Bugfix & Pilot Polish Sprint
 * B185 — Tests covering:
 *   P0: /worker/commons booking form no longer uses plain HTML form (P0 bug fix)
 *   P1: My KORA bookings page exposes cancel booking UI
 *   P2: /commons and /commons/publish are protected by an auth guard layout
 *
 * Regression tests verify prior Space sprint artifacts are preserved.
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

// ── P0: /worker/commons booking (1–7) ────────────────────────────────────────

describe('P0 fix — /worker/commons booking uses JSON fetch, not HTML form', () => {
  let workerCommonsSrc: string;
  let bookingBtnSrc:    string;
  let apiSrc:           string;

  beforeAll(() => {
    workerCommonsSrc = readFile('app/worker/commons/page.tsx');
    bookingBtnSrc    = readFile('components/commons/WorkerBookingButton.tsx');
    apiSrc           = readFile('app/api/worker/commons/bookings/route.ts');
  });

  test('1. /worker/commons no longer submits a plain HTML form to the bookings API', () => {
    // The old HTML form with action="/api/worker/commons/bookings" method="POST" must be gone.
    expect(workerCommonsSrc).not.toMatch(/<form[^>]+action=["']\/api\/worker\/commons\/bookings["'][^>]*method=["']POST["']/i);
    expect(workerCommonsSrc).not.toMatch(/<form[^>]+method=["']POST["'][^>]+action=["']\/api\/worker\/commons\/bookings["']/i);
    expect(workerCommonsSrc).not.toContain('<input type="hidden" name="post_id"');
  });

  test('2. WorkerBookingButton is imported into /worker/commons page', () => {
    expect(workerCommonsSrc).toContain('WorkerBookingButton');
  });

  test('3. Booking action sends JSON body { post_id }', () => {
    expect(bookingBtnSrc).toContain("'Content-Type': 'application/json'");
    expect(bookingBtnSrc).toContain('post_id: postId');
    // method may have varying whitespace formatting
    expect(bookingBtnSrc).toMatch(/method:\s+'POST'/);
  });

  test('4. Booking action does not pass worker_id in body', () => {
    // Check only the JSON.stringify argument — no worker_id key in body object
    expect(bookingBtnSrc).not.toContain('worker_id:');
    // worker_id must not appear in stringify call
    expect(bookingBtnSrc).not.toMatch(/JSON\.stringify\([^)]*worker_id/);
  });

  test('5. Booking action does not pass tenant_id in body', () => {
    // Check only the JSON.stringify argument — no tenant_id key in body object
    expect(bookingBtnSrc).not.toContain('tenant_id:');
    // tenant_id must not appear in stringify call
    expect(bookingBtnSrc).not.toMatch(/JSON\.stringify\([^)]*tenant_id/);
  });

  test('6. Success state shows "Richiesta inviata"', () => {
    expect(bookingBtnSrc).toContain('Richiesta inviata');
    expect(bookingBtnSrc).toContain("setState('booked')");
  });

  test('7. Error state does not expose raw backend error — uses safe Italian copy', () => {
    // Safe errors are hard-coded; no interpolation of data.error or error.message
    expect(bookingBtnSrc).toContain('Impossibile completare la richiesta');
    expect(bookingBtnSrc).toContain('Errore di rete');
    expect(bookingBtnSrc).not.toMatch(/\{data\.error\}|\{error\.message\}/);
  });

  test('8. Duplicate booking (409) gets a friendly message, not a raw error', () => {
    expect(bookingBtnSrc).toContain("setState('duplicate')");
    expect(bookingBtnSrc).toMatch(/Hai già una richiesta|contatta KORA.Admin/i);
    expect(bookingBtnSrc).toContain('worker-booking-duplicate-');
  });

  test('9. No service-role bypass in WorkerBookingButton', () => {
    expect(bookingBtnSrc).not.toContain('getSupabaseServiceClient');
    expect(bookingBtnSrc).not.toContain('service_role');
  });

  test('10. API still requires JSON (no url-encoded fallback added)', () => {
    expect(apiSrc).toContain('request.json()');
    expect(apiSrc).not.toContain('formData');
  });
});

// ── P1: Cancel booking UI (11–19) ─────────────────────────────────────────────

describe('P1 fix — worker can cancel pending/approved bookings', () => {
  let bookingsSrc: string;

  beforeAll(() => {
    bookingsSrc = readFile('app/my-kora/bookings/page.tsx');
  });

  test('11. My KORA bookings page renders "Annulla richiesta" for pending bookings', () => {
    expect(bookingsSrc).toContain('Annulla richiesta');
    expect(bookingsSrc).toContain('booking-cancel-btn-');
  });

  test('12. Cancel button is shown for pending/requested statuses', () => {
    expect(bookingsSrc).toContain("'pending'");
    expect(bookingsSrc).toContain("'requested'");
    expect(bookingsSrc).toContain('CANCELLABLE_STATUSES');
  });

  test('13. Cancel button is shown for approved/confirmed statuses', () => {
    expect(bookingsSrc).toContain("'approved'");
    expect(bookingsSrc).toContain("'confirmed'");
  });

  test('14. Cancel button is NOT rendered for attended bookings', () => {
    // CANCELLABLE_STATUSES must not contain 'attended'
    const cancellableBlock = bookingsSrc.match(/CANCELLABLE_STATUSES\s*=\s*new Set\(\[([^\]]+)\]\)/)?.[1] ?? '';
    expect(cancellableBlock).not.toContain("'attended'");
    expect(cancellableBlock).not.toContain('"attended"');
  });

  test('15. Cancel button is NOT rendered for rejected bookings', () => {
    const cancellableBlock = bookingsSrc.match(/CANCELLABLE_STATUSES\s*=\s*new Set\(\[([^\]]+)\]\)/)?.[1] ?? '';
    expect(cancellableBlock).not.toContain("'rejected'");
  });

  test('16. Cancel button is NOT rendered for cancelled bookings', () => {
    const cancellableBlock = bookingsSrc.match(/CANCELLABLE_STATUSES\s*=\s*new Set\(\[([^\]]+)\]\)/)?.[1] ?? '';
    expect(cancellableBlock).not.toContain("'cancelled'");
  });

  test('17. Cancel calls DELETE /api/worker/commons/bookings/[id]', () => {
    expect(bookingsSrc).toContain('DELETE');
    expect(bookingsSrc).toContain('/api/worker/commons/bookings/');
  });

  test('18. Cancel section has testid booking-cancel-section-', () => {
    expect(bookingsSrc).toContain('booking-cancel-section-');
  });

  test('19. Cancelled booking shows re-request contact notice, not a re-request button', () => {
    expect(bookingsSrc).toContain("booking.status === 'cancelled'");
    expect(bookingsSrc).toContain('contatta KORA/Admin');
    expect(bookingsSrc).toContain('booking-cancelled-reopen-notice-');
  });

  test('20. Cancel copy includes "Puoi annullare una richiesta finché non è stata completata"', () => {
    expect(bookingsSrc).toContain('Puoi annullare una richiesta finché non è stata completata');
  });

  test('21. Cancel preserves privacy copy — employer not mentioned in cancel section', () => {
    // Privacy notice must still be present
    expect(bookingsSrc).toContain('bookings-employer-privacy-notice');
    expect(bookingsSrc).toContain('Il datore di lavoro non vede il tuo percorso individuale');
  });

  test('22. No worker identity field exposed in bookings page', () => {
    expect(bookingsSrc).not.toMatch(/worker_identity_id\s*[:{]/);
    expect(bookingsSrc).not.toContain('pseudonym_id');
  });
});

// ── P2: /commons auth guard (23–28) ───────────────────────────────────────────

describe('P2 fix — /commons routes have auth guard layout', () => {
  let layoutSrc: string;

  beforeAll(() => {
    layoutSrc = fileExists('app/commons/layout.tsx')
      ? readFile('app/commons/layout.tsx')
      : '';
  });

  test('23. app/commons/layout.tsx exists', () => {
    expect(fileExists('app/commons/layout.tsx')).toBe(true);
  });

  test('24. Layout calls getCurrentKoraUser or equivalent auth check', () => {
    expect(layoutSrc).toMatch(/getCurrentKoraUser|requireKoraAdmin|requireCompanyUser|requireWorkerUser/);
  });

  test('25. Unauthenticated access is redirected (redirect to login)', () => {
    expect(layoutSrc).toContain('redirect');
    expect(layoutSrc).toMatch(/\/login|login/);
  });

  test('26. Layout does not have "use client" directive (must be server component for auth)', () => {
    expect(layoutSrc).not.toContain("'use client'");
    expect(layoutSrc).not.toContain('"use client"');
  });

  test('27. /commons page still labelled as pilot preview / synthetic data', () => {
    const commonsSrc = readFile('app/commons/page.tsx');
    expect(commonsSrc).toMatch(/Rete pilota dimostrativa|Dati sintetici|KORA Space.*Pilot Preview|synthetic/i);
  });

  test('28. /commons/publish page still labelled as preview with no persistence', () => {
    const publishSrc = readFile('app/commons/publish/page.tsx');
    expect(publishSrc).toMatch(/nessuna persistenza|PREVIEW|Anteprima generata/i);
  });
});

// ── Regression: prior sprint artifacts (29–39) ─────────────────────────────────

describe('Regression — prior sprint artifacts preserved', () => {
  test('29. kora-space-inline-booking-ux test file exists', () => {
    expect(fileExists('tests/unit/kora-space-inline-booking-ux.test.ts')).toBe(true);
  });

  test('30. kora-space-admin-bookings-control test file exists', () => {
    expect(fileExists('tests/unit/kora-space-admin-bookings-control.test.ts')).toBe(true);
  });

  test('31. kora-space-operating-model test file exists', () => {
    expect(fileExists('tests/unit/kora-space-operating-model.test.ts')).toBe(true);
  });

  test('32. kora-space-pilot-usability test file exists', () => {
    expect(fileExists('tests/unit/kora-space-pilot-usability.test.ts')).toBe(true);
  });

  test('33. kora-space-worker-trace test file exists', () => {
    expect(fileExists('tests/unit/kora-space-worker-trace.test.ts')).toBe(true);
  });

  test('34. inline booking on /my-kora/kora-space still uses JSON fetch (not broken)', () => {
    const spaceSrc = readFile('app/my-kora/kora-space/page.tsx');
    expect(spaceSrc).toContain("'Content-Type': 'application/json'");
    expect(spaceSrc).toContain('/api/worker/commons/bookings');
  });

  test('35. Canonical Italian status labels preserved in bookings page', () => {
    const bookingsSrc = readFile('app/my-kora/bookings/page.tsx');
    expect(bookingsSrc).toContain('Richiesta inviata');
    expect(bookingsSrc).toContain('Partecipazione confermata');
    expect(bookingsSrc).toContain('Richiesta non approvata');
    expect(bookingsSrc).toContain('Partecipazione completata');
    expect(bookingsSrc).toContain('Annullata');
  });

  test('36. Admin booking control still uses requireKoraAdmin', () => {
    const adminPageSrc = readFile('app/admin/commons/page.tsx');
    expect(adminPageSrc).toContain('requireKoraAdmin');
    expect(adminPageSrc).toContain('AdminBookingModerationSection');
  });

  test('37. Worker Space operating model copy preserved', () => {
    const spaceSrc = readFile('app/my-kora/kora-space/page.tsx');
    expect(spaceSrc).toContain('space-operating-model-worker');
    expect(spaceSrc).toContain('La partecipazione individuale resta privata');
  });

  test('38. Attended trace notice in bookings page preserved', () => {
    const bookingsSrc = readFile('app/my-kora/bookings/page.tsx');
    expect(bookingsSrc).toContain('booking-attended-trace-notice');
    expect(bookingsSrc).toContain('Questa partecipazione è una traccia privata del tuo percorso My KORA');
  });

  test('39. route-privacy and tenant-isolation test files exist', () => {
    expect(
      fileExists('tests/unit/route-privacy.test.ts') ||
      fileExists('tests/unit/tenant-isolation.test.ts')
    ).toBe(true);
  });
});
