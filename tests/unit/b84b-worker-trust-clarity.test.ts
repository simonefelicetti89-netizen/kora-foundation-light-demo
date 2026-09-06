import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── B84-B — Worker Trust & Preview-to-Live Clarity ────────────────────────────
//
// PRIOR HISTORY (accurate as of B84-B, preserved as a record, not verbatim
// given the volume): T1/T2/T4/T5/T6/T7/T8/T9/T10/T11 tested trust-clarity
// copy (entry framing, IU/PIB plain-language explanations, KORA Link
// FUTURE_VISION badge, PreviewToLiveNotice rendered on all 5 /my-kora
// routes, non-interactive toggle warnings, honest empty states) across
// app/my-kora/page.tsx, personal-impact-balance/page.tsx, dynamic-cv/page.tsx,
// privacy/page.tsx, opportunities/page.tsx, and collective/page.tsx.
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): all 5
// routes are now one-line, unconditional redirect()s to their canonical
// /worker/** equivalent — none of this trust-clarity copy exists on them
// anymore (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md).
// WorkerSessionProvider.tsx is deleted (zero real callers, verified fresh
// before deletion) — its own "DO NOT TOUCH" invariant check below is
// updated to confirm the deletion instead.
//
// PRIOR HISTORY (accurate as of the retirement's first pass, preserved as a
// record): T3 initially left components/my-kora/PreviewToLiveNotice.tsx in
// place as "orphaned but structurally valid," reasoning that deleting
// production code was out of a test-only fork's scope. On review: the
// component's sole reason to exist was rendering trust-clarity copy on the
// now-fully-retired /my-kora routes above — it has zero real callers
// anywhere. Deleted, following the same "confirmed zero callers before
// deletion" discipline already applied to KoraActivationSignature.tsx,
// WorkerActivationSignatureCard.tsx, and lib/my-kora/nextActionLogic.ts
// earlier in this same correction.

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

function exists(rel: string) {
  return fs.existsSync(path.resolve(__dirname, '../..', rel));
}

// ── T3: PreviewToLiveNotice component — deleted (orphaned by the retirement) ──

describe('B84-B T3 — PreviewToLiveNotice component is deleted, not merely orphaned', () => {
  it('the component file no longer exists', () => {
    expect(exists('components/my-kora/PreviewToLiveNotice.tsx')).toBe(false);
  });

  it('no file anywhere still imports or renders it', () => {
    for (const route of [
      'app/my-kora/page.tsx',
      'app/my-kora/personal-impact-balance/page.tsx',
      'app/my-kora/dynamic-cv/page.tsx',
      'app/my-kora/privacy/page.tsx',
      'app/my-kora/opportunities/page.tsx',
      'app/my-kora/collective/page.tsx',
    ]) {
      expect(read(route)).not.toContain('PreviewToLiveNotice');
    }
  });
});

// ── All 5 /my-kora routes are now pure canonical redirects ──────────────────

describe('B-WORKER preview retirement — all 5 B84-B routes are pure canonical redirects', () => {
  const routes: Record<string, string> = {
    'app/my-kora/page.tsx':                         '/worker/workspace',
    'app/my-kora/personal-impact-balance/page.tsx': '/worker/personal-impact-balance',
    'app/my-kora/dynamic-cv/page.tsx':               '/worker/dynamic-cv',
    'app/my-kora/privacy/page.tsx':                  '/worker/privacy',
    'app/my-kora/opportunities/page.tsx':            '/worker/opportunities',
    'app/my-kora/collective/page.tsx':                '/worker/workspace',
  };

  for (const [route, target] of Object.entries(routes)) {
    it(`${route} redirects unconditionally to ${target}, no trust-clarity copy of its own remains`, () => {
      const src = read(route);
      expect(src).toContain(`redirect('${target}')`);
      expect(src).not.toContain('PreviewToLiveNotice');
      expect(src).not.toContain('BoundaryBadge');
    });
  }
});

// ── Invariants — nothing forbidden was changed ────────────────────────────────

describe('B84-B invariants — no forbidden changes', () => {
  // PRIOR HISTORY (accurate as of B84-B, preserved verbatim): "WorkerSessionProvider
  // is unchanged (DO NOT TOUCH)." B-WORKER "One Product / No Demo Runtime"
  // correction (2026-09-06) deleted it entirely — zero real callers once the
  // anonymous/persona demo runtime it backed was retired.
  it('WorkerSessionProvider.tsx no longer exists (retired with the demo runtime)', () => {
    expect(exists('app/my-kora/_providers/WorkerSessionProvider.tsx')).toBe(false);
  });

  it('WorkerSpaceCapabilityService is unchanged (DO NOT TOUCH)', () => {
    const src = read('services/worker-space/WorkerSpaceCapabilityService.ts');
    expect(src).toContain('getCapabilityByCompanyId');
  });

  it('methodology config unchanged — 10 KORA Index components', () => {
    const src = read('lib/constants/kora.ts');
    expect(src).toContain("KORA_INDEX_COMPONENTS = ['AR', 'MAR', 'EVQ', 'INT', 'CONT', 'EQW', 'EQS', 'PC', 'PB', 'CS']");
  });

  it('no SQL or Prisma added', () => {
    const home = read('app/my-kora/page.tsx');
    expect(home).not.toContain('CREATE TABLE');
    expect(home).not.toContain('prisma');
    expect(home).not.toContain('supabase');
  });

  it('no new KORA Index component added', () => {
    const src = read('lib/constants/kora.ts');
    const match = src.match(/KORA_INDEX_COMPONENTS\s*=\s*\[([^\]]+)\]/);
    if (match) {
      const components = match[1].split(',').map((s) => s.trim().replace(/['"]/g, ''));
      expect(components.length).toBe(10);
    }
  });

  it('no hardcoded methodology weights in any of the 5 retired routes', () => {
    const files = [
      'app/my-kora/page.tsx',
      'app/my-kora/dynamic-cv/page.tsx',
      'app/my-kora/privacy/page.tsx',
      'app/my-kora/opportunities/page.tsx',
      'app/my-kora/collective/page.tsx',
    ];
    files.forEach((f) => {
      const src = read(f);
      expect(src).not.toContain('weight: 0.');
      expect(src).not.toContain('0.10 *');
    });
  });
});
