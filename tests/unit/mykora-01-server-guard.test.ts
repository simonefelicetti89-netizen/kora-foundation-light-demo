// tests/unit/mykora-01-server-guard.test.ts
// MYKORA-01 — Convert /my-kora to a server-side guard.
//
// Context: docs/PILOT_SAAS_READINESS.md flagged app/my-kora/layout.tsx as the
// one architectural outlier still gating on client-side session detection
// (useEffect + browser supabase.auth.getSession()), the same bug class that
// caused the ROLE-SWITCHER-01/02 production incident. This sprint moves the
// real-session authorization decision server-side (lib/auth/kora-session.ts
// getSessionKoraRole()), matching the pattern already used by
// admin/company/partner/worker layouts (B137). The demo/persona preview path
// (no real session) is intentionally preserved client-side — My KORA is
// PREVIEW-only in Foundation Light (see middleware.ts comment on
// WORKER_ALLOWED_PREFIXES) and serves only synthetic persona data there, so
// gating it with demo-state is a product/demo-mode concern, not a privacy
// boundary.
//
// Static/source-level tests — consistent with this codebase's existing
// convention for auth-layout guards (see tests/unit/b137-auth-layout-guard.test.ts).

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

const layoutSrc    = read('app/my-kora/layout.tsx');
const demoGateSrc  = read('app/my-kora/_providers/MyKoraDemoGate.tsx');
const sessionSrc   = read('lib/auth/kora-session.ts');
const middlewareSrc = read('middleware.ts');

describe('MYKORA-01 — layout is a server-side guard, not client-side', () => {
  it('layout.tsx has no use client directive', () => {
    expect(layoutSrc.trimStart().startsWith("'use client'")).toBe(false);
  });

  it('layout.tsx is an async Server Component', () => {
    expect(layoutSrc).toContain('export default async function MyKoraLayout');
  });

  it('layout.tsx resolves the real session via getSessionKoraRole (server-side, cookie-based)', () => {
    expect(layoutSrc).toContain('getSessionKoraRole');
    expect(layoutSrc).toMatch(/from ['"]@\/lib\/auth\/kora-session['"]/);
  });

  it('layout.tsx does not use any client-side session-detection primitives', () => {
    expect(layoutSrc).not.toContain('useEffect(');
    expect(layoutSrc).not.toContain('useState(');
    expect(layoutSrc).not.toContain('getSupabaseBrowserClient');
    expect(layoutSrc).not.toContain('.auth.getSession()');
    expect(layoutSrc).not.toContain('onAuthStateChange');
  });
});

describe('MYKORA-01 — getSessionKoraRole exists and is a coarse, side-effect-free role read', () => {
  it('kora-session.ts exports getSessionKoraRole', () => {
    expect(sessionSrc).toContain('export async function getSessionKoraRole');
  });

  it('reads kora_role from app_metadata only (never user_metadata)', () => {
    const start = sessionSrc.indexOf('export async function getSessionKoraRole');
    const body = sessionSrc.substring(start, start + 500);
    expect(body).toContain('app_metadata');
    expect(body).not.toContain('user_metadata');
  });

  it('does not modify the existing require*User() authorization functions', () => {
    // Additive change only — these must still exist with their guards intact.
    expect(sessionSrc).toContain('export async function requireWorkerUser');
    expect(sessionSrc).toContain("koraRole !== 'WORKER'");
    expect(sessionSrc).toContain('export async function requireCompanyUser');
    expect(sessionSrc).toContain("koraRole !== 'COMPANY_ADMIN'");
  });
});

describe('MYKORA-01 — non-WORKER/non-KORA_ADMIN real sessions are denied server-side (fail closed)', () => {
  it('layout.tsx admits only WORKER and KORA_ADMIN as real sessions', () => {
    expect(layoutSrc).toContain("realRole === 'WORKER' || realRole === 'KORA_ADMIN'");
  });

  it('layout.tsx has an explicit hard-block branch for any other non-null real role', () => {
    // realRole !== null (i.e. a real session exists) but not WORKER/KORA_ADMIN → block.
    const permittedIdx = layoutSrc.indexOf('realUserPermitted');
    const blockIdx = layoutSrc.indexOf('realRole !== null');
    expect(permittedIdx).toBeGreaterThan(-1);
    expect(blockIdx).toBeGreaterThan(permittedIdx);
  });

  it('layout.tsx never name-checks COMPANY_ADMIN/PARTNER/DEMO_VIEWER/ADVISOR as admitted', () => {
    for (const role of ['COMPANY_ADMIN', 'PARTNER', 'DEMO_VIEWER', 'ADVISOR']) {
      expect(layoutSrc).not.toContain(`realRole === '${role}'`);
    }
  });

  it('the real-user-denied branch renders before any child page — children is not referenced in that branch', () => {
    const blockStart = layoutSrc.indexOf('realRole !== null');
    const blockSection = layoutSrc.substring(blockStart, blockStart + 900);
    expect(blockSection).not.toContain('{children}');
  });
});

describe('MYKORA-01 — demo-visitor path only reachable with no real session', () => {
  it('layout.tsx delegates to MyKoraDemoGate only in the final (no real session) branch', () => {
    const demoGateIdx = layoutSrc.indexOf('<MyKoraDemoGate>');
    const realBlockIdx = layoutSrc.indexOf('realRole !== null');
    expect(demoGateIdx).toBeGreaterThan(-1);
    expect(realBlockIdx).toBeGreaterThan(-1);
    expect(demoGateIdx).toBeGreaterThan(realBlockIdx);
  });

  it('MyKoraDemoGate.tsx is a client component using demo-state (useRole) only', () => {
    expect(demoGateSrc.trimStart().startsWith("'use client'")).toBe(true);
    expect(demoGateSrc).toContain('useRole');
  });

  it('MyKoraDemoGate.tsx does not itself perform any Supabase/session detection', () => {
    expect(demoGateSrc).not.toContain('supabase');
    expect(demoGateSrc).not.toContain('.auth.getSession()');
    expect(demoGateSrc).not.toContain('useEffect(');
  });
});

describe('MYKORA-01 — route behavior for /my-kora vs /worker remains distinct (not merged)', () => {
  it('/worker/* stays confined via WORKER_ALLOWED_PREFIXES, which excludes /my-kora (unchanged)', () => {
    expect(middlewareSrc).toContain('WORKER_ALLOWED_PREFIXES');
    expect(middlewareSrc).toContain("'/worker/'");
    expect(middlewareSrc).not.toContain("'/my-kora/'");
  });

  it('worker/layout.tsx remains the live, hard-authenticated worker guard (untouched)', () => {
    const workerLayoutSrc = read('app/worker/layout.tsx');
    expect(workerLayoutSrc).toContain('getCurrentWorkerUser');
    expect(workerLayoutSrc).toContain("redirect('/login')");
  });

  it('layout.tsx documents the /my-kora vs /worker distinction instead of merging routes', () => {
    expect(layoutSrc).toContain('/worker');
    expect(layoutSrc.toLowerCase()).toContain('preview');
  });
});
