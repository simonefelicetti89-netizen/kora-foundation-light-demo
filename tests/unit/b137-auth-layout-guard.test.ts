import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── B137 — Auth Flicker Fix: server-side layout guards ───────────────────────
//
// Verifies that company and partner layouts are server-side guarded,
// matching the pattern already in place for admin and worker layouts.
// These tests protect against the 'use client' + useEffect session-detection
// pattern that caused auth flicker and blank-flash for company/partner users.

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

// ── Company layout: server-side guard ────────────────────────────────────────

describe('B137 — Company layout is a server-side guard', () => {
  const src = read('app/company/layout.tsx');

  it('does not have use client directive', () => {
    // Server Component — 'use client' at the top would break the SSR guard
    expect(src.trimStart().startsWith("'use client'")).toBe(false);
  });

  it('imports requireCompanyUser from kora-session', () => {
    expect(src).toContain('requireCompanyUser');
    expect(src).toContain('kora-session');
  });

  it('imports getCurrentKoraUser for KORA_ADMIN redirect', () => {
    expect(src).toContain('getCurrentKoraUser');
  });

  it('does not use useEffect (no async client-side detection)', () => {
    expect(src).not.toContain('useEffect');
  });

  it('does not use getSession (session detection moved to server)', () => {
    expect(src).not.toContain('getSession');
  });

  it('does not contain demo-state role logic', () => {
    expect(src).not.toContain('useRole');
    expect(src).not.toContain('DEMO_DRIVEN_ROUTES');
    expect(src).not.toContain('isEmployerRole');
  });

  it('redirects KORA_ADMIN to /admin when they stray into /company/*', () => {
    expect(src).toContain("redirect('/admin')");
  });

  it('redirects unauthenticated or wrong-role to /login?role_hint=company', () => {
    expect(src).toContain("redirect('/login?role_hint=company')");
  });

  it('passes validated session data to CompanySessionProvider', () => {
    expect(src).toContain('CompanySessionProvider');
    expect(src).toContain('tenantId');
    expect(src).toContain('koraRole');
    expect(src).toContain('companyName');
  });
});

// ── Partner layout: server-side guard ────────────────────────────────────────

describe('B137 — Partner layout is a server-side guard', () => {
  const src = read('app/partner/layout.tsx');

  it('does not have use client directive', () => {
    expect(src.trimStart().startsWith("'use client'")).toBe(false);
  });

  it('imports requirePartnerUser from kora-session', () => {
    expect(src).toContain('requirePartnerUser');
    expect(src).toContain('kora-session');
  });

  it('imports getCurrentKoraUser for KORA_ADMIN redirect', () => {
    expect(src).toContain('getCurrentKoraUser');
  });

  it('does not use useEffect', () => {
    expect(src).not.toContain('useEffect');
  });

  it('does not use getSession client-side', () => {
    expect(src).not.toContain('getSession');
  });

  it('does not return null for any state (no blank-flash)', () => {
    expect(src).not.toContain('return null');
  });

  it('redirects KORA_ADMIN to /admin when they stray into /partner/*', () => {
    expect(src).toContain("redirect('/admin')");
  });

  it('redirects unauthenticated or wrong-role to /login?role_hint=partner', () => {
    expect(src).toContain("redirect('/login?role_hint=partner')");
  });
});

// ── CompanySessionProvider: pure data distributor ────────────────────────────

describe('B137 — CompanySessionProvider no longer detects session', () => {
  const src = read('app/company/_providers/CompanySessionProvider.tsx');

  it('does not call getSession', () => {
    expect(src).not.toContain('getSession');
  });

  it('does not contain detectSession', () => {
    expect(src).not.toContain('detectSession');
  });

  it('does not use useEffect for session detection', () => {
    expect(src).not.toContain('useEffect');
  });

  it('sessionLoading is always false', () => {
    expect(src).toContain('sessionLoading: false');
  });

  it('isLive is always true in the provided value', () => {
    expect(src).toContain('isLive: true');
  });

  it('accepts tenantId, koraRole, companyName as props', () => {
    expect(src).toContain('tenantId');
    expect(src).toContain('koraRole');
    expect(src).toContain('companyName');
  });

  it('still exports useCompanySession hook for consumers', () => {
    expect(src).toContain('useCompanySession');
  });
});

// ── Company pages: no sessionLoading return null ──────────────────────────────

describe('B137 — Company pages have no sessionLoading return null', () => {
  const pages = [
    'app/company/page.tsx',
    'app/company/opportunities/page.tsx',
    // B147: /company/shared rimossa (vetrina sintetica smantellata)
    'app/company/profile/page.tsx',
    'app/company/contribution/page.tsx',
    'app/company/onboarding/page.tsx',
  ];

  for (const filePath of pages) {
    it(`${filePath} — no sessionLoading return null`, () => {
      const content = read(filePath);
      expect(content).not.toContain('if (sessionLoading) return null');
    });
  }
});

// ── Invariants: login and setup-password not broken ──────────────────────────

describe('B137 invariants — login and setup-password flows intact', () => {
  it('company/login still redirects to /login?role_hint=company', () => {
    const src = read('app/company/login/page.tsx');
    expect(src).toContain("redirect('/login?role_hint=company')");
  });

  it('setup-password form does not depend on CompanySessionProvider', () => {
    const src = read('app/company/setup-password/_form.tsx');
    expect(src).not.toContain('useCompanySession');
    expect(src).not.toContain('CompanySessionProvider');
  });

  it('middleware COMPANY_ALLOWED_PREFIXES still includes setup-password and login', () => {
    const src = read('middleware.ts');
    expect(src).toContain('/company/setup-password');
    expect(src).toContain('/company/login');
  });

  it('middleware is unchanged — no prefix arrays modified', () => {
    const src = read('middleware.ts');
    // Core worker prefix still absent (intentional PREVIEW exclusion documented in B135-B)
    expect(src).toContain('WORKER_ALLOWED_PREFIXES');
    expect(src).toContain('COMPANY_ALLOWED_PREFIXES');
    expect(src).toContain('PARTNER_ALLOWED_PREFIXES');
    expect(src).toContain('DEMO_VIEWER_ALLOWED_PREFIXES');
  });
});

// ── Reference: admin and worker layouts remain server-side (regression guard) ─

describe('B137 regression — admin and worker layouts still server-side', () => {
  it('admin layout has no use client', () => {
    const src = read('app/admin/layout.tsx');
    expect(src.trimStart().startsWith("'use client'")).toBe(false);
  });

  it('admin layout uses requireKoraAdmin', () => {
    expect(read('app/admin/layout.tsx')).toContain('requireKoraAdmin');
  });

  it('worker layout has no use client', () => {
    const src = read('app/worker/layout.tsx');
    expect(src.trimStart().startsWith("'use client'")).toBe(false);
  });

  it('worker layout uses getCurrentWorkerUser', () => {
    expect(read('app/worker/layout.tsx')).toContain('getCurrentWorkerUser');
  });
});
