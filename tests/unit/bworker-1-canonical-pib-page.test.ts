// tests/unit/bworker-1-canonical-pib-page.test.ts
// B-WORKER-1 — canonical Personal Impact Balance page on /worker (2026-09-06).
//
// First bounded B-WORKER slice: an additive-only canonical replacement for
// the PIB concept currently served (to real WORKER sessions too) only
// through /my-kora's demo-state preview. This slice does NOT touch /my-kora,
// its layout, or WorkerSessionProvider — see docs/CC024_WORKER_ARCHITECTURE_MATRIX.md
// §0 and the B-WORKER slice plan for why (real bridge links from
// /worker/workspace and the admin pipeline console into /my-kora still rely
// on capabilities — bookings list, KORA_ADMIN founder preview — that have no
// canonical /worker replacement yet; retiring that bridge is a later slice).

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

describe('B-WORKER-1 — canonical PIB page exists on /worker', () => {
  it('page file exists at app/worker/personal-impact-balance/page.tsx', () => {
    expect(exists('app/worker/personal-impact-balance/page.tsx')).toBe(true);
  });

  const page = read('app/worker/personal-impact-balance/page.tsx');

  it('is a real, authenticated Server Component (no use client, requireWorkerUser-family gate)', () => {
    expect(page.trimStart().startsWith("'use client'")).toBe(false);
    expect(page).toContain('getCurrentWorkerUser');
    expect(page).toContain("redirect('/login')");
  });

  it('uses the real live PIB source (getPIBLive), never the synthetic preview methods', () => {
    expect(page).toContain('workerPIBService.getPIBLive');
    expect(page).not.toContain('myKoraPreviewService');
    expect(page).not.toContain('.getPIB(');
  });

  it('reuses the canonical activation-profile computation, not a re-derived copy', () => {
    expect(page).toContain('computeActivationProfile');
    expect(page).toContain('fetchWorkerParticipationRows');
    expect(page).toContain("from '@/app/api/worker/activation-profile/route'");
  });

  it('reuses ActivationProfileSection rather than re-implementing the pillar UI', () => {
    expect(page).toContain('ActivationProfileSection');
  });

  it('states the worker-private, not-employer-visible boundary in copy (non-suppressible per CLAUDE.md §13)', () => {
    expect(page).toContain('non può vedere questo bilancio');
  });

  it('workerId/session handling matches the established pattern — no client param trust', () => {
    expect(page).not.toContain('searchParams');
    expect(page).not.toContain('request.nextUrl');
  });
});

describe('B-WORKER-1 — computeActivationProfile / fetchWorkerParticipationRows extraction is a pure refactor', () => {
  const route = read('app/api/worker/activation-profile/route.ts');

  it('exports computeActivationProfile as a pure function (no auth/fetch inside)', () => {
    expect(route).toContain('export function computeActivationProfile(');
  });

  it('exports fetchWorkerParticipationRows for shared reuse', () => {
    expect(route).toContain('export async function fetchWorkerParticipationRows(');
  });

  it('GET still requires WORKER auth and calls the extracted pure function — behavior unchanged', () => {
    const getIdx = route.indexOf('export async function GET(');
    const getBody = route.slice(getIdx);
    expect(getBody).toContain('requireWorkerUser(request)');
    expect(getBody).toContain('computeActivationProfile(participationRows)');
  });

  it('the extracted function still ends every path with a returned WorkerActivationProfile (not a NextResponse)', () => {
    const fnIdx = route.indexOf('export function computeActivationProfile(');
    const fnEnd = route.indexOf('\n}\n', fnIdx);
    const fnBody = route.slice(fnIdx, fnEnd);
    expect(fnBody).not.toContain('NextResponse');
    expect(fnBody).toContain('return profile;');
  });
});

describe('B-WORKER-1 — WorkerPIBService.getPIBLive is untouched, still zero synthetic dependency', () => {
  const service = read('services/worker-pib/WorkerPIBService.ts');

  it('getPIBLive live branches are isSynthetic: false (unchanged invariant)', () => {
    const liveIdx = service.indexOf('async getPIBLive(');
    const nextMethodIdx = service.indexOf('async getCVDataLive(');
    const liveBody = service.slice(liveIdx, nextMethodIdx);
    expect(liveBody).not.toContain('myKoraPreviewService');
  });
});

describe('B-WORKER-1 — scope discipline: /my-kora and its bridges are untouched by this slice', () => {
  // PRIOR HISTORY (accurate as of B-WORKER-1, preserved verbatim): asserted
  // layout.tsx still admitted real WORKER/KORA_ADMIN into preview —
  // retirement was explicitly deferred at the time. B-WORKER final cleanup
  // (2026-09-06) retired that admission branch once every real-session
  // dependency was closed (Slices 2-5), redirecting real sessions at the
  // layout level. B-WORKER "One Product / No Demo Runtime" correction
  // (2026-09-06, later the same day) went further: the layout no longer
  // performs any admission decision at all — every child page (including
  // /my-kora/page.tsx itself) redirects unconditionally to /worker/workspace,
  // for every visitor, so the layout-level redirect check moved down a
  // level and the layout itself is now a trivial pass-through.
  it('/my-kora/layout.tsx performs no admission decision at all; /my-kora/page.tsx redirects unconditionally', () => {
    const layout = read('app/my-kora/layout.tsx');
    expect(layout).not.toContain('realUserPermitted');
    expect(layout).not.toContain('realRole');
    expect(read('app/my-kora/page.tsx')).toContain("redirect('/worker/workspace')");
  });

  // PRIOR HISTORY (accurate as of B-WORKER-1, preserved verbatim): asserted
  // ALL THREE bridge links (bookings, PIB, dynamic-cv) still pointed at
  // /my-kora — true at slice 1 time, when PIB was the only capability with a
  // canonical /worker replacement. B-WORKER-2 (2026-09-06) proved Dynamic CV
  // parity too and repointed both PIB and Dynamic CV; bookings has no
  // canonical /worker replacement yet and remains untouched, per this slice's
  // explicit scope ("Do NOT touch bookings yet").
  // PRIOR HISTORY (accurate as of B-WORKER-1, preserved verbatim): asserted
  // bookings still targeted /my-kora (no canonical replacement yet) and the
  // admin pipeline "My KORA Preview" link was unchanged. B-WORKER-3
  // (2026-09-06) built /worker/bookings and repointed the workspace bridge;
  // it also built the /admin/preview/worker hub and repointed the pipeline
  // console link away from /my-kora entirely.
  it('/worker/workspace bridge links: all three (bookings, PIB, Dynamic CV) now repointed to canonical /worker', () => {
    const workspace = read('app/worker/workspace/page.tsx');
    expect(workspace).toContain('/worker/bookings');
    expect(workspace).toContain('/worker/personal-impact-balance');
    expect(workspace).toContain('/worker/dynamic-cv');
    expect(workspace).not.toContain('/my-kora/bookings');
    expect(workspace).not.toContain('/my-kora/personal-impact-balance');
    expect(workspace).not.toContain('/my-kora/dynamic-cv');
  });

  it('the admin pipeline "My KORA Preview (Worker Space)" link now points at the canonical admin preview hub', () => {
    const pipeline = read('app/admin/pipeline/_components/PilotLifecycleClient.tsx');
    expect(pipeline).toContain("href: '/admin/preview/worker'");
    expect(pipeline).not.toContain("href: '/my-kora'");
  });
});
