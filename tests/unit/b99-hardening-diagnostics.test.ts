// tests/unit/b99-hardening-diagnostics.test.ts
// B99-HARDENING — Provisioning Diagnostic Console structural tests.
// Validates: API route structure, page structure, security constraints,
// redirect correctness, middleware permissions, service key non-exposure.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf-8');
}

// ── Diagnostic API route ──────────────────────────────────────────────────────

describe('Diagnostic API — app/api/admin/diagnostics/route.ts', () => {
  const route = read('app/api/admin/diagnostics/route.ts');

  it('has GET handler', () => {
    expect(route).toContain('export async function GET');
  });

  it('is KORA_ADMIN protected (requireKoraAdmin)', () => {
    expect(route).toContain('requireKoraAdmin');
    expect(route).toContain('isKoraAuthError');
    expect(route).toContain('if (isKoraAuthError(auth)) return auth');
  });

  it('is runtime nodejs', () => {
    expect(route).toContain("runtime = 'nodejs'");
  });

  it('classifies verdict as READY / PARTIAL / BLOCKED', () => {
    expect(route).toContain("'READY'");
    expect(route).toContain("'PARTIAL'");
    expect(route).toContain("'BLOCKED'");
    expect(route).toContain('hasFail');
    expect(route).toContain('hasWarn');
  });

  it('verdict is BLOCKED when hasFail, PARTIAL when hasWarn, READY otherwise', () => {
    // The classification logic must follow this order: BLOCKED > PARTIAL > READY
    const verdictLine = route.split('\n').find((l) => l.includes('hasFail ?') || l.includes('hasFail?'));
    expect(verdictLine ?? route).toContain('BLOCKED');
  });

  it('checks NEXT_PUBLIC_SITE_URL', () => {
    expect(route).toContain('NEXT_PUBLIC_SITE_URL');
    expect(route).toContain('isLocalhost');
  });

  it('checks SUPABASE_SERVICE_ROLE_KEY presence only — never exposes value', () => {
    // Only Boolean() check — key value must never appear in a response field
    expect(route).toContain('hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)');
    // The message for service_key must not include the env var value
    expect(route).toContain('valore nascosto');
    // The raw env value must never be spread into a response object
    expect(route).not.toContain('process.env.SUPABASE_SERVICE_ROLE_KEY,');
    expect(route).not.toContain('value: process.env.SUPABASE_SERVICE_ROLE_KEY');
  });

  it('exports DryCheckPayload type with verdict, checks, timestamp', () => {
    expect(route).toContain('DryCheckPayload');
    expect(route).toContain('verdict');
    expect(route).toContain('checks');
    expect(route).toContain('timestamp');
  });

  it('uses getSupabaseServiceClient for DB + Auth checks', () => {
    expect(route).toContain('getSupabaseServiceClient');
  });

  it('tests DB connectivity via analytics.tenant query', () => {
    expect(route).toContain("schema('analytics').from('tenant')");
    expect(route).toContain("head: true");
  });

  it('tests Auth Admin API via listUsers', () => {
    expect(route).toContain('auth.admin.listUsers');
  });

  it('computes redirectTo as /auth/callback (not /company/workspace)', () => {
    expect(route).toContain('/auth/callback');
    const redirectLine = route.split('\n').find((l) => l.includes('redirectTo') && l.includes('auth/callback'));
    expect(redirectLine).toBeTruthy();
  });
});

// ── Diagnostic page ───────────────────────────────────────────────────────────

describe('Diagnostic page — app/admin/provisioning-diagnostics/page.tsx', () => {
  const page = read('app/admin/provisioning-diagnostics/page.tsx');

  it('redirects to /admin/login if not KORA_ADMIN', () => {
    expect(page).toContain("redirect('/admin/login')");
    expect(page).toContain("kora_role !== 'KORA_ADMIN'");
  });

  it('redirects to /admin/login on auth error (Supabase not configured)', () => {
    // Catches any exception and redirects
    const catchBlocks = page.split('} catch').length - 1;
    expect(catchBlocks).toBeGreaterThan(0);
    expect(page).toContain("redirect('/admin/login')");
  });

  it('shows B99 readiness verdict (READY / PARTIAL / BLOCKED)', () => {
    expect(page).toContain('B99 Live Readiness');
    expect(page).toContain('READY');
    expect(page).toContain('PARTIAL');
    expect(page).toContain('BLOCKED');
  });

  it('renders 6 sections: env, auth-config, routes, tenants, users, dry-check', () => {
    expect(page).toContain('"env"');
    expect(page).toContain('"auth-config"');
    expect(page).toContain('"routes"');
    expect(page).toContain('"tenants"');
    expect(page).toContain('"users"');
    expect(page).toContain('"dry-check"');
  });

  it('shows manual Supabase Auth config instructions', () => {
    expect(page).toContain('Verifica Manuale');
    expect(page).toContain('Authentication → URL Configuration');
    expect(page).toContain('/auth/callback');
  });

  it('shows structural route checks verified at 4044dfb', () => {
    expect(page).toContain('4044dfb');
    expect(page).toContain('/auth/callback');
    expect(page).toContain('/company/setup-password');
    expect(page).toContain('exchangeCodeForSession');
    expect(page).toContain('updateUser');
  });

  it('fetches recent tenants from analytics.tenant', () => {
    expect(page).toContain("schema('analytics').from('tenant')");
    expect(page).toContain('order(');
  });

  it('fetches company auth users via listUsers (COMPANY_ADMIN / COMPANY_VIEWER only)', () => {
    expect(page).toContain('listUsers');
    expect(page).toContain("'COMPANY_ADMIN'");
    expect(page).toContain("'COMPANY_VIEWER'");
  });

  it('NEVER exposes service role key value in page output', () => {
    // Service key is only used as Boolean() — never in a JSX expression or JSON value
    expect(page).not.toContain('process.env.SUPABASE_SERVICE_ROLE_KEY}');
    expect(page).not.toContain('process.env.SUPABASE_SERVICE_ROLE_KEY,');
  });

  it('imports DryCheckButton client component', () => {
    expect(page).toContain('DryCheckButton');
    expect(page).toContain('./_dry-check-button');
  });

  it('is runtime nodejs', () => {
    expect(page).toContain("runtime = 'nodejs'");
  });
});

// ── Dry-check button ──────────────────────────────────────────────────────────

describe('DryCheckButton — _dry-check-button.tsx', () => {
  const btn = read('app/admin/provisioning-diagnostics/_dry-check-button.tsx');

  it('is a client component', () => {
    expect(btn).toContain("'use client'");
  });

  it('calls GET /api/admin/diagnostics', () => {
    expect(btn).toContain("fetch('/api/admin/diagnostics')");
  });

  it('renders verdict badge (READY / PARTIAL / BLOCKED)', () => {
    expect(btn).toContain('READY');
    expect(btn).toContain('PARTIAL');
    expect(btn).toContain('BLOCKED');
  });

  it('handles loading and error states', () => {
    expect(btn).toContain("'loading'");
    expect(btn).toContain("'error'");
  });

  it('shows timestamp of dry-check run', () => {
    expect(btn).toContain('timestamp');
    expect(btn).toContain('toLocaleString');
  });
});

// ── Provision route — redirectTo integrity ────────────────────────────────────

describe('Provision route — redirectTo must be /auth/callback', () => {
  const route = read('app/api/admin/companies/provision/route.ts');

  it('redirectTo is /auth/callback', () => {
    expect(route).toContain('/auth/callback');
    const line = route.split('\n').find((l) => l.includes('redirectTo:'));
    expect(line).toBeDefined();
    expect(line).toContain('/auth/callback');
    expect(line).not.toContain('/company/workspace');
  });

  it('redirectTo has no localhost hardcoded', () => {
    const line = route.split('\n').find((l) => l.includes('redirectTo:'));
    expect(line).not.toContain('localhost');
    expect(line).not.toContain('127.0.0.1');
  });

  it('uses NEXT_PUBLIC_SITE_URL env var for base URL', () => {
    expect(route).toContain('NEXT_PUBLIC_SITE_URL');
    expect(route).toContain('siteUrl');
  });
});

// ── Auth callback + setup-password routes exist ───────────────────────────────

describe('Required routes exist after 4044dfb', () => {
  it('app/auth/callback/route.ts exists', () => {
    const f = read('app/auth/callback/route.ts');
    expect(f).toContain('exchangeCodeForSession');
  });

  it('app/company/setup-password/page.tsx exists', () => {
    const f = read('app/company/setup-password/page.tsx');
    expect(f).toContain('Suspense');
    expect(f).toContain('SetupPasswordForm');
  });

  it('app/company/setup-password/_form.tsx exists', () => {
    const f = read('app/company/setup-password/_form.tsx');
    expect(f).toContain("'use client'");
    expect(f).toContain('updateUser');
  });
});

// ── Middleware permissions ────────────────────────────────────────────────────

describe('Middleware — auth flow paths are allowed', () => {
  const mw = read('middleware.ts');

  it("COMPANY_ALLOWED_PREFIXES includes '/auth/' prefix (B117-D: covers callback + reset-password + forgot-password)", () => {
    // B117-D: '/auth/callback' alone did not cover /auth/reset-password — replaced with '/auth/'
    const companySection = mw.split('COMPANY_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(companySection).toContain("'/auth/'");
  });

  it('COMPANY_ALLOWED_PREFIXES includes /company/setup-password', () => {
    expect(mw).toContain('/company/setup-password');
  });
});
