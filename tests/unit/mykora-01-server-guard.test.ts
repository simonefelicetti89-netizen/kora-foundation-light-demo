// tests/unit/mykora-01-server-guard.test.ts
// MYKORA-01 — Convert /my-kora to a server-side guard.
//
// PRIOR HISTORY (accurate as of MYKORA-01, preserved as a record, not
// verbatim given the volume): this file tested app/my-kora/layout.tsx as an
// async Server Component resolving the real session via getSessionKoraRole()
// (server-side, cookie-based), redirecting real WORKER/KORA_ADMIN sessions
// to their canonical destination, hard-blocking any other real role, and
// delegating to app/my-kora/_providers/MyKoraDemoGate.tsx (client component,
// demo-state only) exclusively when there was no real session at all.
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06):
// app/my-kora/layout.tsx no longer resolves any session or makes any
// admission decision — every /my-kora/** page redirects unconditionally,
// for every visitor, to its canonical /worker/** equivalent
// (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md).
// MyKoraDemoGate.tsx is deleted (zero real callers). The route-distinction
// checks below (middleware.ts's WORKER_ALLOWED_PREFIXES excluding
// /my-kora/, /worker/layout.tsx's real auth guard) are genuinely unrelated
// and preserved. See lib/architecture/registry.ts app-surface.my-kora and
// tests/unit/bworker-preview-runtime-retirement.test.ts for the regression
// guard proving the retirement.

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

describe('MYKORA-01/B-WORKER — layout.tsx is now a trivial pass-through, not a guard', () => {
  const layoutSrc = read('app/my-kora/layout.tsx');

  it('layout.tsx has no use client directive, no session resolution, no admission logic', () => {
    expect(layoutSrc.trimStart().startsWith("'use client'")).toBe(false);
    expect(layoutSrc).not.toContain('getSessionKoraRole');
    expect(layoutSrc).not.toContain('realRole');
    expect(layoutSrc).not.toContain('MyKoraDemoGate');
  });

  it('MyKoraDemoGate.tsx no longer exists', () => {
    expect(() => read('app/my-kora/_providers/MyKoraDemoGate.tsx')).toThrow();
  });

  it('kora-session.ts require*User() functions remain unmodified (unrelated, untouched)', () => {
    const sessionSrc = read('lib/auth/kora-session.ts');
    expect(sessionSrc).toContain('export async function requireWorkerUser');
    expect(sessionSrc).toContain("koraRole !== 'WORKER'");
    expect(sessionSrc).toContain('export async function requireCompanyUser');
    expect(sessionSrc).toContain("koraRole !== 'COMPANY_ADMIN'");
  });
});

describe('MYKORA-01 — route behavior for /my-kora vs /worker remains distinct (not merged) — unaffected by the retirement', () => {
  it('/worker/* stays confined via WORKER_ALLOWED_PREFIXES, which excludes /my-kora (unchanged)', () => {
    const middlewareSrc = read('middleware.ts');
    expect(middlewareSrc).toContain('WORKER_ALLOWED_PREFIXES');
    expect(middlewareSrc).toContain("'/worker/'");
    expect(middlewareSrc).not.toContain("'/my-kora/'");
  });

  it('worker/layout.tsx remains the live, hard-authenticated worker guard (untouched)', () => {
    const workerLayoutSrc = read('app/worker/layout.tsx');
    expect(workerLayoutSrc).toContain('getCurrentWorkerUser');
    expect(workerLayoutSrc).toContain("redirect('/login')");
  });
});
