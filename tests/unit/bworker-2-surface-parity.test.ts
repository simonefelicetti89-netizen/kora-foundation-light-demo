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

describe('B-WORKER-2 — /my-kora/dynamic-cv: real sessions redirect, zero duplicated business logic', () => {
  const page = read('app/my-kora/dynamic-cv/page.tsx');

  it('a confirmed real session (fetch ok) redirects to canonical /worker/dynamic-cv', () => {
    expect(page).toContain("router.replace('/worker/dynamic-cv')");
  });

  it('the removed live/empty states no longer exist as distinct render branches', () => {
    expect(page).not.toContain("cvMode === 'live'");
    expect(page).not.toContain("cvMode === 'empty'");
    expect(page).not.toContain('data-testid="dynamic-cv-live"');
    expect(page).not.toContain('data-testid="dynamic-cv-empty"');
  });

  it('no duplicated real-data fetch/render remains for a real session (LiveCVData/liveCV state removed)', () => {
    expect(page).not.toContain('LiveCVData');
    expect(page).not.toContain('liveCV');
  });

  it('the demo/persona preview path (no real session) is completely unchanged', () => {
    expect(page).toContain('data-testid="dynamic-cv-demo"');
    expect(page).toContain('myKoraPreviewService');
    expect(page).toContain('workerAchievementService');
  });

  it('the access-denied block for employer demo-state roles is unchanged', () => {
    expect(page).toContain('myKoraPreviewService.canAccess(activeRole)');
    expect(page).toContain('Accesso Limitato');
  });
});

// ── 3. Privacy parity ────────────────────────────────────────────────────────

describe('B-WORKER-2 — Privacy: canonical /worker/privacy is a proven superset', () => {
  const client = read('app/worker/privacy/_components/PrivacySettingsClient.tsx');
  const legacy = read('app/my-kora/privacy/page.tsx');

  it('PrivacySettingsClient fetches real /api/worker/privacy-settings data', () => {
    expect(client).toContain("fetch('/api/worker/privacy-settings')");
  });

  it('the legacy page always labelled its own toggles as non-interactive preview (self-admitted subset)', () => {
    expect(legacy).toContain('Solo anteprima — Foundation Light');
    expect(legacy).toContain('Queste impostazioni non modificano dati reali');
  });

  it('/worker/privacy page is real, requireWorkerUser-gated (auth foundation preserved)', () => {
    const page = read('app/worker/privacy/page.tsx');
    expect(page).toContain('requireWorkerUser');
    expect(page).toContain("redirect('/login')");
  });
});

// ── 4. Privacy legacy retirement (zero business logic for real sessions) ────

describe('B-WORKER-2 — /my-kora/privacy: real sessions redirect, no unconditional synthetic rendering', () => {
  const page = read('app/my-kora/privacy/page.tsx');

  it('checks for a real session before rendering anything (new: previously always synthetic)', () => {
    expect(page).toContain("fetch('/api/worker/privacy-settings')");
    expect(page).toContain("router.replace('/worker/privacy')");
  });

  it('holds render (returns null) while checking or redirecting — no flash of synthetic content for real workers', () => {
    expect(page).toMatch(/mode === ['"]checking['"] \|\| mode === ['"]redirecting['"]\) return null/);
  });

  it('the demo/persona preview content (canAccess gate + getPrivacySummary) is unchanged for non-real sessions', () => {
    expect(page).toContain('myKoraPreviewService.canAccess(activeRole)');
    expect(page).toContain('myKoraPreviewService.getPrivacySummary(');
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
    expect(legacy).toContain("router.replace('/worker/commons')");
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

describe('B-WORKER-2 — no synthetic fallback reachable by a real session for Dynamic CV or Privacy', () => {
  it('a real session on /my-kora/dynamic-cv never reaches myKoraPreviewService/workerAchievementService content', () => {
    const page = read('app/my-kora/dynamic-cv/page.tsx');
    const redirectIdx = page.indexOf("router.replace('/worker/dynamic-cv')");
    const demoCommentIdx = page.indexOf('Demo mode — unauthenticated or non-WORKER role');
    expect(redirectIdx).toBeGreaterThan(-1);
    expect(demoCommentIdx).toBeGreaterThan(redirectIdx);
  });

  it('a real session on /my-kora/privacy never reaches myKoraPreviewService.getPrivacySummary', () => {
    const page = read('app/my-kora/privacy/page.tsx');
    const redirectIdx = page.indexOf("router.replace('/worker/privacy')");
    const summaryIdx = page.indexOf('myKoraPreviewService.getPrivacySummary(');
    expect(redirectIdx).toBeGreaterThan(-1);
    expect(summaryIdx).toBeGreaterThan(redirectIdx);
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

  it('the "In arrivo" (future/disabled) badge/public-link/PDF/LinkedIn controls are untouched, still disabled', () => {
    const legacy = read('app/my-kora/dynamic-cv/page.tsx');
    expect(legacy).toContain('LinkedIn — Non attivo');
  });

  it('KORA Contribution / collective and bookings list remain untouched (explicitly out of this slice)', () => {
    expect(exists('app/my-kora/collective/page.tsx')).toBe(true);
    expect(exists('app/my-kora/bookings/page.tsx')).toBe(true);
    const collective = read('app/my-kora/collective/page.tsx');
    expect(collective).not.toContain('router.replace');
  });
});
