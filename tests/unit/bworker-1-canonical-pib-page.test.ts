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
  it('/my-kora/layout.tsx is unchanged (still admits real WORKER/KORA_ADMIN into preview — retirement is a later slice)', () => {
    const layout = read('app/my-kora/layout.tsx');
    expect(layout).toContain('realUserPermitted');
    expect(layout).toContain('WorkerSessionProvider');
  });

  // PRIOR HISTORY (accurate as of B-WORKER-1, preserved verbatim): asserted
  // ALL THREE bridge links (bookings, PIB, dynamic-cv) still pointed at
  // /my-kora — true at slice 1 time, when PIB was the only capability with a
  // canonical /worker replacement. B-WORKER-2 (2026-09-06) proved Dynamic CV
  // parity too and repointed both PIB and Dynamic CV; bookings has no
  // canonical /worker replacement yet and remains untouched, per this slice's
  // explicit scope ("Do NOT touch bookings yet").
  it('/worker/workspace bridge links: bookings still legacy (no canonical replacement yet), PIB and Dynamic CV repointed to canonical /worker', () => {
    const workspace = read('app/worker/workspace/page.tsx');
    expect(workspace).toContain('/my-kora/bookings');
    expect(workspace).toContain('/worker/personal-impact-balance');
    expect(workspace).toContain('/worker/dynamic-cv');
    expect(workspace).not.toContain('/my-kora/personal-impact-balance');
    expect(workspace).not.toContain('/my-kora/dynamic-cv');
  });

  it('the admin pipeline "My KORA Preview (Worker Space)" link is unchanged', () => {
    const pipeline = read('app/admin/pipeline/_components/PilotLifecycleClient.tsx');
    expect(pipeline).toContain("href: '/my-kora'");
  });
});
