// tests/unit/bworker-2-surface-parity.test.ts
// B-WORKER Slice 2 — Dynamic CV / KORA Space / Privacy convergence (2026-09-06).
//
// Fresh parity audit found:
//   - Dynamic CV:  /worker/dynamic-cv (DynamicCVClient) is a proven
//     CANONICAL_SUPERSET — same /api/worker/dynamic-cv data /my-kora/dynamic-cv's
//     live branch used, plus real sharing/print /my-kora/dynamic-cv never
//     implemented (its own removed live branch told workers to go there for
//     exactly that). Retired: the live/empty render branches, replaced by a
//     redirect for any confirmed real session.
//   - Privacy:     /worker/privacy (PrivacySettingsClient) is a proven
//     CANONICAL_SUPERSET — real /api/worker/privacy-settings data, real
//     interactive rows (/my-kora/privacy's own toggles were always
//     explicitly non-interactive "solo anteprima"). Retired: unconditional
//     synthetic rendering, replaced by real-session detection + redirect.
//   - KORA Space:  INCOMPLETE parity — /worker/commons's WorkerBookingButton
//     does not pre-fetch/display existing booking status the way
//     /my-kora/kora-space's bookingsByPostId does; that gap is bookings
//     work, explicitly deferred to Slice 3 ("Do NOT touch bookings yet").
//     /my-kora/kora-space is UNCHANGED this slice — already honestly
//     labelled "(Anteprima)"/"Dati sintetici" in the sidebar, not linked as
//     canonical anywhere.

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

// ── 1. Dynamic CV parity ────────────────────────────────────────────────────

describe('B-WORKER-2 — Dynamic CV: canonical /worker/dynamic-cv is a proven superset', () => {
  const client = read('app/worker/dynamic-cv/_components/DynamicCVClient.tsx');

  it('DynamicCVClient fetches the same real API the legacy live branch used', () => {
    expect(client).toContain("fetch('/api/worker/dynamic-cv'");
  });

  it('DynamicCVClient implements sharing (create/revoke) that the legacy page never did', () => {
    expect(client).toContain('/api/worker/dynamic-cv/shares');
    expect(client).toContain('/api/worker/dynamic-cv/share');
  });

  it('/worker/dynamic-cv page is real, requireWorkerUser-gated (auth foundation preserved)', () => {
    const page = read('app/worker/dynamic-cv/page.tsx');
    expect(page).toContain('requireWorkerUser');
    expect(page).toContain("redirect('/login')");
  });
});

// ── 2. Dynamic CV legacy retirement (zero business logic for real sessions) ─
//
// PRIOR HISTORY (accurate as of B-WORKER-2, preserved as a record, not
// verbatim given the volume): asserted /my-kora/dynamic-cv redirected only a
// confirmed real session (fetch probe) while preserving a full demo/persona
// preview render (myKoraPreviewService, workerAchievementService,
// canAccess-gated access-denied block) for anonymous/persona visitors.
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): the
// page is now a one-line, unconditional redirect() to /worker/dynamic-cv —
// no fetch probe, no session check, no demo/persona render of any kind, for
// any visitor (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md).

describe('B-WORKER-2/B-WORKER preview retirement — /my-kora/dynamic-cv is a pure canonical redirect', () => {
  const page = read('app/my-kora/dynamic-cv/page.tsx');

  it('redirects unconditionally to canonical /worker/dynamic-cv, for every visitor', () => {
    expect(page).toContain("redirect('/worker/dynamic-cv')");
  });

  it('no demo/persona preview content, fetch probe, or synthetic service call remains', () => {
    expect(page).not.toContain('myKoraPreviewService');
    expect(page).not.toContain('workerAchievementService');
    expect(page).not.toContain('fetch(');
    expect(page).not.toContain("'use client'");
  });
});

// ── 3. Privacy parity ────────────────────────────────────────────────────────

describe('B-WORKER-2 — Privacy: canonical /worker/privacy is a proven superset', () => {
  const client = read('app/worker/privacy/_components/PrivacySettingsClient.tsx');
  const legacy = read('app/my-kora/privacy/page.tsx');

  it('PrivacySettingsClient fetches real /api/worker/privacy-settings data', () => {
    expect(client).toContain("fetch('/api/worker/privacy-settings')");
  });

  // PRIOR HISTORY (accurate as of B-WORKER-2, preserved verbatim): "the
  // legacy page always labelled its own toggles as non-interactive preview
  // (self-admitted subset)." B-WORKER "One Product / No Demo Runtime"
  // correction (2026-09-06) retired that content entirely — the page is now
  // a pure redirect with no toggles, no labels, no content of its own.
  it('the legacy page is now a pure canonical redirect — no toggles, no preview labels', () => {
    expect(legacy).toContain("redirect('/worker/privacy')");
    expect(legacy).not.toContain('Solo anteprima — Foundation Light');
  });

  it('/worker/privacy page is real, requireWorkerUser-gated (auth foundation preserved)', () => {
    const page = read('app/worker/privacy/page.tsx');
    expect(page).toContain('requireWorkerUser');
    expect(page).toContain("redirect('/login')");
  });
});

// ── 4. Privacy legacy retirement (zero business logic for real sessions) ────
//
// PRIOR HISTORY (accurate as of B-WORKER-2, preserved as a record, not
// verbatim given the volume): asserted /my-kora/privacy fetched
// /api/worker/privacy-settings to detect a real session before redirecting,
// held render (checking/redirecting states) to avoid a synthetic-content
// flash, and preserved myKoraPreviewService.canAccess/getPrivacySummary for
// non-real sessions.
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): the
// page is now a one-line, unconditional redirect() to /worker/privacy — no
// fetch probe, no session check, no demo/persona render of any kind.

describe('B-WORKER-2/B-WORKER preview retirement — /my-kora/privacy is a pure canonical redirect', () => {
  const page = read('app/my-kora/privacy/page.tsx');

  it('redirects unconditionally to canonical /worker/privacy, for every visitor', () => {
    expect(page).toContain("redirect('/worker/privacy')");
  });

  it('no demo/persona preview content, fetch probe, or synthetic service call remains', () => {
    expect(page).not.toContain('myKoraPreviewService');
    expect(page).not.toContain('fetch(');
    expect(page).not.toContain("'use client'");
  });
});

// ── 5. KORA Space — parity incomplete, correctly untouched this slice ──────

describe('B-WORKER-2 — KORA Space: parity incomplete (booking-status gap), correctly deferred', () => {
  const button = read('components/commons/WorkerBookingButton.tsx');
  const legacy = read('app/my-kora/kora-space/page.tsx');

  // PRIOR HISTORY (accurate as of B-WORKER-2, preserved verbatim): this
  // whole describe block documented the booking-status-persistence gap as
  // still open, deferred to a later slice. B-WORKER-3 (2026-09-06) closed
  // it — see tests/unit/kora-space-inline-booking-ux.test.ts and
  // kora-space-pilot-usability.test.ts for the current assertions
  // (initialStatus/initialStateFor on WorkerBookingButton, server-side
  // pre-fetch on /worker/commons, kora-space redirect once parity was
  // proven with the gap closed).
  it('the booking-status-persistence gap identified here is now closed (B-WORKER-3)', () => {
    expect(button).toContain('initialStatus');
    expect(button).toContain('initialStateFor');
    expect(legacy).toContain("redirect('/worker/commons')");
  });

  it('the sidebar already honestly labels /my-kora/kora-space as synthetic preview, /worker/commons as real', () => {
    const sidebar = read('components/layout/Sidebar.tsx');
    expect(sidebar).toContain("label: 'KORA Space (Anteprima)', description: 'Dati sintetici — non il tuo spazio reale'");
    expect(sidebar).toContain("label: 'KORA Space', description: 'Iniziative e contenuti reali della tua azienda'");
  });
});

// ── 6. Bridge inventory — repointed only where parity was proven ───────────

describe('B-WORKER-2 — bridge links repointed for proven-parity capabilities only', () => {
  const workspace = read('app/worker/workspace/page.tsx');
  const sidebar   = read('components/layout/Sidebar.tsx');

  it('/worker/workspace: PIB and Dynamic CV bridge links point to canonical /worker routes', () => {
    expect(workspace).toContain('/worker/personal-impact-balance');
    expect(workspace).toContain('/worker/dynamic-cv');
    expect(workspace).not.toContain('/my-kora/personal-impact-balance');
    expect(workspace).not.toContain('/my-kora/dynamic-cv');
  });

  // PRIOR HISTORY (accurate as of B-WORKER-2, preserved verbatim): bookings
  // bridge was untouched, PIB's Sidebar entry was a plain (non-ternary)
  // /worker/... string, and the admin pipeline link was unchanged. B-WORKER-3
  // (2026-09-06) built /worker/bookings and the /admin/preview/worker hub,
  // repointed the workspace bookings bridge, made the Sidebar's PIB entry
  // isAdminPreview-aware (matching the existing Dynamic CV/Privacy pattern —
  // it had been incorrectly left unconditional in Slice 2, which would have
  // sent an admin-preview KORA_ADMIN into a 401), and repointed the pipeline
  // console link off /my-kora entirely.
  it('/worker/workspace: bookings bridge link now repointed to canonical /worker/bookings', () => {
    expect(workspace).toContain('/worker/bookings');
    expect(workspace).not.toContain('/my-kora/bookings');
  });

  it('Sidebar: Personal Impact Balance entry is isAdminPreview-aware, pointing real workers to canonical /worker route', () => {
    const workerSection = sidebar.slice(sidebar.indexOf("heading: isAdminPreview ? 'Worker Preview (Admin)'"));
    expect(workerSection).toContain("isAdminPreview ? '/admin/preview/worker' : '/worker/personal-impact-balance'");
    expect(workerSection).not.toContain("href: '/my-kora/personal-impact-balance'");
  });

  it('Sidebar: Dynamic CV and Privacy entries already pointed to canonical /worker routes (pre-existing, unchanged)', () => {
    expect(sidebar).toContain("isAdminPreview ? '/admin/preview/worker/dynamic-cv' : '/worker/dynamic-cv'");
    expect(sidebar).toContain("isAdminPreview ? '/admin/preview/worker/privacy' : '/worker/privacy'");
  });

  it('admin pipeline "My KORA Preview (Worker Space)" link now points at the canonical admin preview hub', () => {
    const pipeline = read('app/admin/pipeline/_components/PilotLifecycleClient.tsx');
    expect(pipeline).toContain("href: '/admin/preview/worker'");
    expect(pipeline).not.toContain("href: '/my-kora'");
  });
});

// ── 7. No preview fallback remains for the two retired capabilities ────────
//
// PRIOR HISTORY (accurate as of B-WORKER-2, preserved verbatim): asserted a
// real session's redirect happened before any demo/persona content in
// source order (both paths coexisted in the same file). B-WORKER "One
// Product / No Demo Runtime" correction (2026-09-06): there is no
// demo/persona content left in either file to order against — both are
// unconditional single-statement redirects.

describe('B-WORKER-2/B-WORKER preview retirement — no synthetic fallback reachable by anyone for Dynamic CV or Privacy', () => {
  it('/my-kora/dynamic-cv never reaches myKoraPreviewService/workerAchievementService content — none exists', () => {
    const page = read('app/my-kora/dynamic-cv/page.tsx');
    expect(page).toContain("redirect('/worker/dynamic-cv')");
    expect(page).not.toContain('myKoraPreviewService');
    expect(page).not.toContain('workerAchievementService');
  });

  it('/my-kora/privacy never reaches myKoraPreviewService.getPrivacySummary — none exists', () => {
    const page = read('app/my-kora/privacy/page.tsx');
    expect(page).toContain("redirect('/worker/privacy')");
    expect(page).not.toContain('myKoraPreviewService');
  });
});

// ── 8. Real worker auth remains fail-closed ─────────────────────────────────

describe('B-WORKER-2 — auth foundation and RLS boundary preserved', () => {
  it('requireWorkerUser / getCurrentWorkerUser are unchanged (spot check)', () => {
    const session = read('lib/auth/kora-session.ts');
    expect(session).toContain('export async function requireWorkerUser');
    expect(session).toContain('export async function getCurrentWorkerUser');
  });

  it('no new getSupabaseServiceClient() call was introduced by this slice in worker-facing routes', () => {
    for (const file of [
      'app/worker/dynamic-cv/_components/DynamicCVClient.tsx',
      'app/worker/privacy/_components/PrivacySettingsClient.tsx',
      'app/my-kora/dynamic-cv/page.tsx',
      'app/my-kora/privacy/page.tsx',
    ]) {
      expect(read(file)).not.toContain('getSupabaseServiceClient');
    }
  });
});

// ── 9. No net-new worker feature introduced ─────────────────────────────────

describe('B-WORKER-2 — no net-new product scope', () => {
  it('no new API route was added by this slice (only client redirects + link repoints)', () => {
    expect(exists('app/api/worker/dynamic-cv-live')).toBe(false);
    expect(exists('app/api/worker/privacy-live')).toBe(false);
  });

  // PRIOR HISTORY (accurate as of B-WORKER-2, preserved verbatim): asserted
  // /my-kora/dynamic-cv still rendered an "In arrivo"/LinkedIn-disabled
  // badge (future/disabled controls untouched, not newly enabled). B-WORKER
  // "One Product / No Demo Runtime" correction (2026-09-06) removed that
  // content entirely along with the rest of the page's synthetic rendering
  // — the canonical /worker/dynamic-cv surface (DynamicCVClient) is the
  // real, current source of truth for any such controls, unaffected here.
  it('the retired legacy page has no "In arrivo"/LinkedIn UI of its own left to check (content removed, not newly enabled)', () => {
    const legacy = read('app/my-kora/dynamic-cv/page.tsx');
    expect(legacy).toContain("redirect('/worker/dynamic-cv')");
    expect(legacy).not.toContain('LinkedIn');
  });

  // PRIOR HISTORY (accurate as of B-WORKER-2, preserved verbatim): asserted
  // collective had no redirect logic (explicitly out of Slice 2's scope).
  // B-WORKER-4 (2026-09-06) added a real-session redirect there. B-WORKER
  // "One Product / No Demo Runtime" correction (2026-09-06) made that
  // redirect unconditional — no 'empty' state or any other content remains.
  it('bookings list remains untouched by Slice 2 (migrated later, in Slice 3); collective is now a pure unconditional redirect, no new functionality', () => {
    expect(exists('app/my-kora/collective/page.tsx')).toBe(true);
    expect(exists('app/my-kora/bookings/page.tsx')).toBe(true);
    const collective = read('app/my-kora/collective/page.tsx');
    expect(collective).toContain("redirect('/worker/workspace')");
    expect(collective).not.toContain('collective-empty-state');
  });
});
