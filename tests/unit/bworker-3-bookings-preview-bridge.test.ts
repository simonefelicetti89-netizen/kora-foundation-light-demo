// tests/unit/bworker-3-bookings-preview-bridge.test.ts
// B-WORKER Slice 3 — Bookings + founder-preview bridge convergence (2026-09-06).
//
// Fresh booking inventory found the canonical booking authority already
// fully real and complete: services/commons/BookingService.ts +
// app/api/worker/commons/bookings (GET/POST) + .../[id] (DELETE) — real
// create/list/cancel, RLS-scoped, tenant-validated, no synthetic fallback.
// The only real gap was WorkerBookingButton always starting 'idle' (never
// reflecting a persisted booking) — the KORA Space parity gap Slice 2 found.
//
// This slice: (1) fixed that gap, (2) re-ran KORA Space parity → FULL,
// (3) built /worker/bookings (canonical bookings list, migrating the
// existing real /my-kora/bookings capability verbatim), (4) retired the
// real-session paths of /my-kora/bookings and /my-kora/kora-space (redirect,
// demo path unchanged), (5) repointed every real-session bridge (workspace,
// Sidebar, WorkerBookingButton's own link), (6) migrated the KORA_ADMIN
// founder-preview bridge off /my-kora onto a new /admin/preview/worker hub
// (reusing the existing requireKoraAdmin + synthetic-illustrative pattern —
// no new preview architecture).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(root, rel));
}

// ── 1. Canonical booking authority — already complete, no new domain ───────

describe('B-WORKER-3 — canonical booking authority is the existing services/commons/BookingService.ts', () => {
  const service = read('services/commons/BookingService.ts');
  const getPost = read('app/api/worker/commons/bookings/route.ts');
  const del     = read("app/api/worker/commons/bookings/[id]/route.ts");

  it('createBooking/listMyBookings/cancelBooking are the only worker booking write/read paths', () => {
    expect(service).toContain('export async function createBooking');
    expect(service).toContain('export async function listMyBookings');
    expect(service).toContain('export async function cancelBooking');
  });

  it('GET/POST/DELETE all require a real WORKER session, no service-role shortcut for auth', () => {
    expect(getPost).toContain('requireWorkerUser');
    expect(del).toContain('requireWorkerUser');
  });

  it('no new booking domain/schema was introduced — RLS (mig 025) is the isolation mechanism', () => {
    expect(service).toContain('RLS');
    expect(service).not.toContain('CREATE TABLE');
  });
});

// ── 2. WorkerBookingButton reflects persisted status on load ───────────────

describe('B-WORKER-3 — WorkerBookingButton booking-status-persistence gap is fixed', () => {
  const button = read('components/commons/WorkerBookingButton.tsx');
  const commons = read('app/worker/commons/page.tsx');

  it('accepts an initialStatus prop and derives initial render state from it (no new booking states)', () => {
    expect(button).toContain('initialStatus?: string');
    expect(button).toContain('function initialStateFor(status: string | undefined): BookingState');
    expect(button).toMatch(/type BookingState = 'idle' \| 'loading' \| 'booked' \| 'duplicate' \| 'error'/);
  });

  it('active statuses (pending/approved/attended) map to booked; everything else to duplicate', () => {
    expect(button).toMatch(/status === 'pending' \|\| status === 'approved' \|\| status === 'attended'\) return 'booked'/);
    expect(button).toContain("return 'duplicate'");
  });

  it('attended status shows truthful "Partecipazione completata", not the generic pending label', () => {
    expect(button).toContain("initialStatus === 'attended' ? 'Partecipazione completata' : 'Richiesta inviata'");
  });

  it('/worker/commons pre-fetches the worker\'s own booking status server-side (RLS-scoped) and passes it down', () => {
    expect(commons).toContain('bookingStatusByPostId');
    expect(commons).toContain("schema('commons')");
    expect(commons).toContain("from('booking')");
    expect(commons).toContain('initialStatus={bookingStatusByPostId[initiative.id]}');
  });

  it('no worker_identity_id resolution needed — same RLS trust boundary as other worker reads on this page', () => {
    const arrayScoped = commons.slice(commons.indexOf('crossCompanyIds'), commons.indexOf('crossCompanyIds') + 800);
    expect(arrayScoped).not.toMatch(/worker_identity_id\s*[:{]/);
  });
});

// ── 3. KORA Space parity re-run: FULL after the booking fix ────────────────

describe('B-WORKER-3 — KORA Space parity is FULL after the booking-status fix', () => {
  it('/worker/commons now shows persisted booking status AND the booking-lifecycle explainer (salvaged from kora-space)', () => {
    const commons = read('app/worker/commons/page.tsx');
    expect(commons).toContain('space-booking-lifecycle');
    expect(commons).toContain('Come funziona la partecipazione');
  });

  it('kora-space\'s live/empty branches (now redundant) were removed, replaced by a redirect for real sessions', () => {
    const legacy = read('app/my-kora/kora-space/page.tsx');
    expect(legacy).not.toContain("mode === 'live'");
    expect(legacy).not.toContain("mode === 'empty'");
    expect(legacy).toContain("router.replace('/worker/commons')");
  });

  it('the demo-only SpaceItemType fixtures (opportunity/kora_recommendation) are unaffected — never part of live parity', () => {
    const legacy = read('app/my-kora/kora-space/page.tsx');
    expect(legacy).toContain('KORA_SPACE_ITEMS');
    expect(legacy).toContain("'opportunity'");
  });
});

// ── 4. Canonical bookings list on /worker ───────────────────────────────────

describe('B-WORKER-3 — canonical /worker/bookings migrates the existing real capability verbatim', () => {
  it('page.tsx is a real, requireWorkerUser-gated server wrapper', () => {
    expect(exists('app/worker/bookings/page.tsx')).toBe(true);
    const page = read('app/worker/bookings/page.tsx');
    expect(page).toContain('requireWorkerUser');
    expect(page).toContain("redirect('/login')");
  });

  it('BookingsClient reuses the exact same canonical data/actions as the legacy live branch did', () => {
    expect(exists('app/worker/bookings/_components/BookingsClient.tsx')).toBe(true);
    const client = read('app/worker/bookings/_components/BookingsClient.tsx');
    expect(client).toContain('/api/worker/commons/bookings');
    expect(client).toContain('/api/commons/initiatives');
    expect(client).toContain("method: 'DELETE'");
  });

  it('no probe fetch needed — the server wrapper already guarantees a real session (simpler than the legacy 4-state page)', () => {
    const client = read('app/worker/bookings/_components/BookingsClient.tsx');
    expect(client).not.toContain("fetch('/api/worker/pib')");
    expect(client).toMatch(/type BookingsMode = 'loading' \| 'live' \| 'empty'/);
  });

  it('the attended-trace copy (Dynamic CV eligibility caveat) was fully preserved, not truncated', () => {
    const client = read('app/worker/bookings/_components/BookingsClient.tsx');
    expect(client).toContain('Non tutta la partecipazione in KORA Space entra nel Dynamic Impact CV');
    expect(client).toContain('Il lavoratore controlla cosa rendere condivisibile');
  });
});

// ── 5. Legacy real-session retirement — zero business logic ────────────────

describe('B-WORKER-3 — legacy /my-kora/bookings and /my-kora/kora-space: real sessions redirect, demo path unchanged', () => {
  it('/my-kora/bookings redirects a confirmed real session to /worker/bookings', () => {
    const legacy = read('app/my-kora/bookings/page.tsx');
    expect(legacy).toContain("router.replace('/worker/bookings')");
    expect(legacy).not.toContain('handleCancel');
    expect(legacy).not.toContain('liveBookings');
  });

  it('/my-kora/kora-space redirects a confirmed real session to /worker/commons', () => {
    const legacy = read('app/my-kora/kora-space/page.tsx');
    expect(legacy).toContain("router.replace('/worker/commons')");
    expect(legacy).not.toContain('requestBooking');
    expect(legacy).not.toContain('liveInitiatives');
  });

  it('both demo/persona preview paths are unchanged — still fully synthetic, clearly labelled', () => {
    const bookings = read('app/my-kora/bookings/page.tsx');
    const space    = read('app/my-kora/kora-space/page.tsx');
    expect(bookings).toContain('bookings-demo-label');
    expect(space).toContain('kora-space-demo-label');
  });
});

// ── 6. Bridge repoint — every real-session bridge, once parity was proven ──

describe('B-WORKER-3 — every real-session bridge repointed to canonical /worker routes', () => {
  it('/worker/workspace: all bridge links (PIB, Dynamic CV, bookings) point to canonical /worker routes', () => {
    const workspace = read('app/worker/workspace/page.tsx');
    for (const canonical of ['/worker/personal-impact-balance', '/worker/dynamic-cv', '/worker/bookings']) {
      expect(workspace).toContain(canonical);
    }
    for (const legacy of ['/my-kora/personal-impact-balance', '/my-kora/dynamic-cv', '/my-kora/bookings']) {
      expect(workspace).not.toContain(legacy);
    }
  });

  it('WorkerBookingButton\'s own "see your bookings" link points to canonical /worker/bookings', () => {
    const button = read('components/commons/WorkerBookingButton.tsx');
    expect(button).toContain('/worker/bookings');
    expect(button).not.toContain('/my-kora/bookings');
  });

  // PRIOR HISTORY (accurate as of B-WORKER-3, preserved verbatim): the
  // Prenotazioni entry's admin-preview branch fell back to /my-kora/bookings
  // (no dedicated admin-preview page existed for it yet). B-WORKER-4
  // (2026-09-06) repointed it to the existing /admin/preview/worker hub
  // instead — closing this residual too.
  it('Sidebar: Prenotazioni entry is isAdminPreview-aware (real worker → canonical /worker/bookings, admin preview → hub, no /my-kora fallback)', () => {
    const sidebar = read('components/layout/Sidebar.tsx');
    expect(sidebar).toContain("isAdminPreview ? '/admin/preview/worker' : '/worker/bookings'");
  });
});

// ── 7. Founder preview — migrated off /my-kora, no new preview engine ──────

describe('B-WORKER-3 — KORA_ADMIN founder preview migrated to /admin/preview/worker (existing pattern reused)', () => {
  it('the admin preview hub exists, requireKoraAdmin-gated, linking to the 3 existing preview pages', () => {
    expect(exists('app/admin/preview/worker/page.tsx')).toBe(true);
    const hub = read('app/admin/preview/worker/page.tsx');
    expect(hub).toContain('requireKoraAdmin');
    for (const p of ['/admin/preview/worker/dynamic-cv', '/admin/preview/worker/opportunities', '/admin/preview/worker/privacy']) {
      expect(hub).toContain(p);
    }
  });

  it('no new preview engine or synthetic scoring was introduced — hub is pure navigation, zero business logic', () => {
    const hub = read('app/admin/preview/worker/page.tsx');
    expect(hub).not.toContain('getSupabaseServiceClient');
    expect(hub).not.toMatch(/fetch\(/);
  });

  it('the admin pipeline console link no longer bridges into /my-kora', () => {
    const pipeline = read('app/admin/pipeline/_components/PilotLifecycleClient.tsx');
    expect(pipeline).toContain("href: '/admin/preview/worker'");
    expect(pipeline).not.toContain("href: '/my-kora'");
  });

  it('the hub explicitly states no real worker data is shown (non-suppressible)', () => {
    const hub = read('app/admin/preview/worker/page.tsx');
    expect(hub).toContain('nessun dato worker reale');
  });
});

// ── 8. Remaining real-session dependency on /my-kora ────────────────────────

describe('B-WORKER-3 — remaining real-session dependency on /my-kora (honestly reported, not hidden)', () => {
  // PRIOR HISTORY (accurate as of B-WORKER-3, preserved verbatim): the
  // Sidebar's admin-preview "My KORA Home" entry still fell back to
  // /my-kora — no dedicated admin-preview page existed for it yet.
  // B-WORKER-4 (2026-09-06) repointed it to the existing /admin/preview/worker
  // hub (no new preview page built) — this residual is now resolved.
  it('the Sidebar admin-preview Home entry no longer falls back to /my-kora — repointed to the existing hub', () => {
    const sidebar = read('components/layout/Sidebar.tsx');
    const workerSection = sidebar.slice(sidebar.indexOf("heading: isAdminPreview ? 'Worker Preview (Admin)'"));
    expect(workerSection).toContain("isAdminPreview ? '/admin/preview/worker' : '/worker/workspace'");
    expect(workerSection).not.toContain("href:    isAdminPreview ? '/admin/preview/worker' : '/my-kora'");
  });

  it('/my-kora/layout.tsx real-session admission branch is still present — not globally retired this slice', () => {
    const layout = read('app/my-kora/layout.tsx');
    expect(layout).toContain('realUserPermitted');
    expect(layout).toContain('WorkerSessionProvider');
  });
});

// ── 9. Security / scope discipline ──────────────────────────────────────────

describe('B-WORKER-3 — auth foundation, RLS, and scope discipline preserved', () => {
  it('requireWorkerUser / requireKoraAdmin unchanged (spot check)', () => {
    const session = read('lib/auth/kora-session.ts');
    expect(session).toContain('export async function requireWorkerUser');
    expect(session).toContain('export async function requireKoraAdmin');
  });

  it('no new getSupabaseServiceClient() call introduced by this slice in worker-facing files', () => {
    for (const file of [
      'app/worker/bookings/page.tsx',
      'app/worker/bookings/_components/BookingsClient.tsx',
      'app/worker/commons/page.tsx',
      'components/commons/WorkerBookingButton.tsx',
      'app/admin/preview/worker/page.tsx',
    ]) {
      expect(read(file)).not.toContain('getSupabaseServiceClient');
    }
  });

  it('no net-new product scope: no payments, waitlists, notifications, or new booking states', () => {
    const button = read('components/commons/WorkerBookingButton.tsx');
    expect(button).not.toMatch(/waitlist|payment|notification|calendar/i);
  });
});
