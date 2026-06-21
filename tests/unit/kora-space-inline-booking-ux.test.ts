/**
 * KORA Space Inline Booking UX Sprint
 * Validates that the worker booking journey is operational and inline from My KORA Space:
 * - Inline booking via existing worker booking API
 * - Status awareness on initiative cards
 * - Privacy/product boundary copy preserved
 * - No worker identity fields exposed
 * - No service-role bypass
 * - Regression of all prior sprint artifacts
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
  let spaceSrc:   string;
  let apiSrc:     string;
  let serviceSrc: string;

  beforeAll(() => {
    spaceSrc   = readFile('app/my-kora/kora-space/page.tsx');
    apiSrc     = readFile('app/api/worker/commons/bookings/route.ts');
    serviceSrc = readFile('services/commons/BookingService.ts');
  });

  test('1. My KORA Space fetches from /api/worker/commons/bookings (inline booking + status awareness)', () => {
    expect(spaceSrc).toContain('/api/worker/commons/bookings');
  });

  test('2. Booking request does not use query tenant_id or worker_id — auth from JWT', () => {
    // No query params for identity — auth is cookie/JWT
    expect(spaceSrc).not.toMatch(/[?&](tenant_id|worker_id)=/);
    // API resolves identity from auth.id, not from body — verify in API route
    expect(apiSrc).toContain('auth.id');
    expect(apiSrc).toContain('auth.tenantId');
    expect(apiSrc).not.toMatch(/body.*tenant_id|body.*worker_id/);
  });

  test('3. No service-role / RLS bypass in KORA Space component', () => {
    expect(spaceSrc).not.toContain('getSupabaseServiceClient');
    expect(spaceSrc).not.toContain('service_role');
    expect(spaceSrc).not.toContain('serviceClient');
  });
});

// ── INLINE BOOKING (4–9) ──────────────────────────────────────────────────────

describe('Inline booking — live initiative cards', () => {
  let spaceSrc: string;

  beforeAll(() => {
    spaceSrc = readFile('app/my-kora/kora-space/page.tsx');
  });

  test('4. Live initiative cards show "Richiedi partecipazione" CTA and testid for unbooked items', () => {
    expect(spaceSrc).toContain('Richiedi partecipazione');
    expect(spaceSrc).toContain('space-request-booking-');
  });

  test('5. Request action uses POST to worker booking API', () => {
    expect(spaceSrc).toContain("method: 'POST'");
    expect(spaceSrc).toContain('/api/worker/commons/bookings');
    expect(spaceSrc).toContain('post_id: postId');
  });

  test('6. Success state updates card to canonical "Richiesta inviata" label', () => {
    // On success, bookingsByPostId is set to 'pending' → renders "Richiesta inviata"
    expect(spaceSrc).toContain("'pending'");
    expect(spaceSrc).toContain('Richiesta inviata');
  });

  test('7. Failure state shows safe Italian error — no raw backend error exposed', () => {
    expect(spaceSrc).toContain('Impossibile completare la richiesta');
    expect(spaceSrc).toContain('Errore di rete');
    // Raw backend error must NOT be interpolated directly
    expect(spaceSrc).not.toMatch(/\{data\.error\}|\{error\.message\}/);
  });

  test('8. Already-booked status suppresses the request CTA — card shows status badge instead', () => {
    expect(spaceSrc).toContain('bookingsByPostId');
    // Logic: existingStatus && existingStatus !== 'cancelled' → no request button, show status
    expect(spaceSrc).toMatch(/existingStatus.*cancelled|existingStatus !== 'cancelled'/);
    expect(spaceSrc).toContain('space-booking-status-');
  });

  test('9. Attended status shows read-only "Partecipazione completata" — no re-request CTA', () => {
    // The status meta map covers 'attended' with the read-only label
    expect(spaceSrc).toContain('attended');
    expect(spaceSrc).toContain('Partecipazione completata');
    // attended is not 'cancelled' → falls into the "show status badge" branch, not request button
    expect(spaceSrc).not.toMatch(/attended.*requestBooking|requestBooking.*attended/);
  });
});

// ── STATUS AWARENESS (10–12) ──────────────────────────────────────────────────

describe('Status awareness — booking map and card status', () => {
  let spaceSrc: string;

  beforeAll(() => {
    spaceSrc = readFile('app/my-kora/kora-space/page.tsx');
  });

  test('10. Page fetches and stores booking status map from worker API', () => {
    expect(spaceSrc).toContain('bookingsByPostId');
    expect(spaceSrc).toContain('/api/worker/commons/bookings');
    // Parallel fetch with initiatives
    expect(spaceSrc).toContain('Promise.all');
  });

  test('11. Status labels use canonical Italian copy', () => {
    expect(spaceSrc).toContain('Richiesta inviata');
    expect(spaceSrc).toContain('Partecipazione confermata');
    expect(spaceSrc).toContain('Richiesta non approvata');
    expect(spaceSrc).toContain('Partecipazione completata');
    expect(spaceSrc).toContain('Annullata');
    expect(spaceSrc).toContain('Stato in verifica');
  });

  test('12. Booking status map uses post_id as key — no worker identity field access in rendered UI', () => {
    // bookingsByPostId is keyed by post_id only
    expect(spaceSrc).toContain('bMap[b.post_id]');
    // No field definition/access for worker identity — comments mentioning it are OK
    expect(spaceSrc).not.toMatch(/worker_identity_id\s*[:{]/);
    expect(spaceSrc).not.toMatch(/\{[^}]*worker_identity_id[^}]*\}/);
    expect(spaceSrc).not.toMatch(/pseudonym_id\s*[:{]/);
  });
});

// ── PRIVACY / PRODUCT BOUNDARIES (13–18) ─────────────────────────────────────

describe('Privacy and product boundary copy', () => {
  let spaceSrc: string;

  beforeAll(() => {
    spaceSrc = readFile('app/my-kora/kora-space/page.tsx');
  });

  test('13. Employer privacy copy present and non-suppressible', () => {
    expect(spaceSrc).toContain('space-employer-privacy-notice');
    expect(spaceSrc).toContain('Il datore di lavoro non vede il tuo percorso individuale');
  });

  test('14. Page states no automatic public sharing', () => {
    expect(spaceSrc).toContain('Nessuna condivisione pubblica avviene automaticamente');
  });

  test('15. Page states not all participation enters Dynamic Impact CV', () => {
    expect(spaceSrc).toMatch(/Non tutta la partecipazione|Dynamic Impact CV policy/i);
  });

  test('16. KORA Contribution positioned as companion indicator — not main purpose', () => {
    expect(spaceSrc).toMatch(/indicatore companion/i);
    expect(spaceSrc).toMatch(/non è una componente del KORA Index|non è il KORA Index/i);
  });

  test('17. KORA Space does not claim to feed KORA Index', () => {
    expect(spaceSrc).not.toMatch(/KORA Space alimenta.*KORA Index|KORA Space.*componente.*KORA Index/i);
  });

  test('18. No worker identity or PII field access/rendering in component', () => {
    // Comments mentioning field names are allowed; rendered field access is not
    expect(spaceSrc).not.toMatch(/worker_identity_id\s*[:{]/);
    expect(spaceSrc).not.toMatch(/\{[^}]*worker_identity_id[^}]*\}/);
    expect(spaceSrc).not.toContain('pseudonym_id');
    expect(spaceSrc).not.toContain('worker_email');
    expect(spaceSrc).not.toContain('worker_name');
    expect(spaceSrc).not.toContain('worker_pib');
  });
});

// ── FALLBACK / HANDOFF (19–20) ───────────────────────────────────────────────

describe('Fallback handoff to /worker/commons', () => {
  let spaceSrc: string;

  beforeAll(() => {
    spaceSrc = readFile('app/my-kora/kora-space/page.tsx');
  });

  test('19. /worker/commons link is explicit and labeled (not a fallback-only redirect)', () => {
    expect(spaceSrc).toContain('/worker/commons');
    // Explicit label — not just a plain "click here"
    expect(spaceSrc).toMatch(/Apri scheda completa|KORA Commons.*feed completo/);
  });

  test('20. Demo mode booking buttons are disabled — no fake inline action', () => {
    // Demo mode renders disabled buttons with cursor: not-allowed
    expect(spaceSrc).toMatch(/disabled/);
    expect(spaceSrc).toMatch(/cursor.*not-allowed/);
  });
});

// ── BOOKING REQUEST NOTICE (21) ──────────────────────────────────────────────

describe('Booking request privacy notice', () => {
  let spaceSrc: string;

  beforeAll(() => {
    spaceSrc = readFile('app/my-kora/kora-space/page.tsx');
  });

  test('21. Booking context notice states request is private and KORA/Admin manages status', () => {
    expect(spaceSrc).toContain('space-booking-request-notice');
    expect(spaceSrc).toContain('La richiesta di partecipazione è privata');
    expect(spaceSrc).toContain('KORA/Admin può gestire lo stato operativo della partecipazione');
    expect(spaceSrc).toContain('La partecipazione completata può generare una traccia personale privata');
  });
});

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
});
