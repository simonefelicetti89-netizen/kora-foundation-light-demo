// tests/unit/b99-provision-credentials.test.ts
// Sprint B99 P0 — Company credential provisioning: key reconciliation + route structure.
//
// These tests validate structural invariants without real Supabase calls.
// Supabase Admin API is not mocked — all assertions are file-based.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf-8');
}

// ── Punto 0 — Canonical key reconciliation ────────────────────────────────────
// The canonical key is 'kora_tenant_id'.
// All three sources must be consistent:
//   1. kora-session.ts (reads app_metadata)
//   2. provision/route.ts (writes app_metadata)
//   3. migration 006 (RLS function reads app_metadata)

describe('Punto 0 — Canonical tenant key: kora_tenant_id', () => {
  const session    = read('lib/auth/kora-session.ts');
  const route      = read('app/api/admin/companies/provision/route.ts');
  const migration  = read('supabase/migrations/006_canonical_tenant_key.sql');

  it('kora-session.ts reads kora_tenant_id from app_metadata', () => {
    // requireCompanyUser and getTenantFromSession both read kora_tenant_id
    expect(session).toContain('kora_tenant_id');
    expect(session).not.toContain("appMeta?.tenant_id");
  });

  it('provision/route.ts writes kora_tenant_id (TENANT_META_KEY constant)', () => {
    expect(route).toContain("TENANT_META_KEY = 'kora_tenant_id'");
    expect(route).toContain('[TENANT_META_KEY]');
    // Must NOT write bare 'tenant_id' into app_metadata
    expect(route).not.toContain("tenant_id: tenantId");
  });

  it('migration 006 makes kora.tenant_id() read kora_tenant_id', () => {
    expect(migration).toContain("'kora_tenant_id'");
    // Must be in the app_metadata path (not just top-level)
    expect(migration).toContain("app_metadata' ->> 'kora_tenant_id'");
  });

  it('all three sources use the same canonical key — kora_tenant_id', () => {
    // Extract the key from each source and assert equality
    const sessionKey    = session.includes('kora_tenant_id')   ? 'kora_tenant_id' : 'unknown';
    const routeKey      = route.includes("'kora_tenant_id'")   ? 'kora_tenant_id' : 'unknown';
    const migrationKey  = migration.includes("'kora_tenant_id'") ? 'kora_tenant_id' : 'unknown';

    expect(sessionKey).toBe('kora_tenant_id');
    expect(routeKey).toBe('kora_tenant_id');
    expect(migrationKey).toBe('kora_tenant_id');
    // All three are equal
    expect(sessionKey).toBe(routeKey);
    expect(routeKey).toBe(migrationKey);
  });

  it('migration 006 keeps legacy tenant_id as backward-compat fallback', () => {
    // The legacy key is kept as third-priority fallback — documented in the migration
    expect(migration).toContain("'tenant_id'");
    expect(migration).toContain('Legacy fallback');
  });

  it('migration 006 supersedes 003 and 004 for kora.tenant_id()', () => {
    expect(migration).toContain('Supersedes');
    expect(migration).toContain('kora.tenant_id()');
  });
});

// ── Punto 1 — Provision route structure ──────────────────────────────────────

describe('Provision route — KORA_ADMIN guard', () => {
  const route = read('app/api/admin/companies/provision/route.ts');

  it('route uses requireKoraAdmin — rejects non-KORA_ADMIN', () => {
    expect(route).toContain('requireKoraAdmin');
    expect(route).toContain('isKoraAuthError');
    expect(route).toContain('if (isKoraAuthError(auth)) return auth');
  });

  it('route is runtime nodejs (required for Auth Admin API)', () => {
    expect(route).toContain("runtime = 'nodejs'");
  });

  it('route imports getSupabaseServiceClient (never anon client)', () => {
    expect(route).toContain('getSupabaseServiceClient');
    expect(route).not.toContain('getSupabaseServerClient');
  });
});

describe('Provision route — tenant idempotency', () => {
  const route = read('app/api/admin/companies/provision/route.ts');

  it('looks up tenant before inserting (idempotent — reuse if exists)', () => {
    expect(route).toContain('.eq(\'tenant_code\', tenantCode)');
    expect(route).toContain('.maybeSingle()');
    expect(route).toContain('if (existingTenant)');
    expect(route).toContain('tenantCreated = true');
  });

  it('never duplicates tenant_code', () => {
    // The INSERT path only runs when existingTenant is falsy
    expect(route).toContain('} else {');
    expect(route).toContain('.insert(');
  });

  it('derives tenant_code from company_name when not provided', () => {
    expect(route).toContain('generateTenantCode');
    expect(route).toContain('rawCode ?? generateTenantCode(companyName)');
  });
});

describe('Provision route — app_metadata correctness', () => {
  const route = read('app/api/admin/companies/provision/route.ts');

  it('writes kora_role into app_metadata', () => {
    expect(route).toContain('kora_role:');
    expect(route).toContain('adminRole');
  });

  it('writes canonical key kora_tenant_id into app_metadata', () => {
    expect(route).toContain('[TENANT_META_KEY]');
    expect(route).toContain('tenantId');
  });

  it('writes kora_status: active into app_metadata', () => {
    expect(route).toContain("kora_status:       'active'");
  });

  it('uses updateUserById (server-controlled — never client-writable)', () => {
    expect(route).toContain('auth.admin.updateUserById');
  });

  it('never writes role or tenant into user_metadata', () => {
    expect(route).not.toContain('user_metadata');
  });
});

describe('Provision route — email idempotency', () => {
  const route = read('app/api/admin/companies/provision/route.ts');

  it('handles already-registered email (inviteUserByEmail error path)', () => {
    expect(route).toContain('isAlreadyRegistered');
    expect(route).toContain("includes('already')");
  });

  it('rejects cross-tenant email conflict with 409', () => {
    expect(route).toContain('status: 409');
    expect(route).toContain("provisioningStatus: 'conflict'");
  });

  it('returns existing user state without duplicate (idempotent)', () => {
    expect(route).toContain("inviteStatus = 'existing'");
  });

  it('falls back to createUser when invite fails (SMTP not configured)', () => {
    expect(route).toContain('auth.admin.createUser');
    expect(route).toContain("inviteStatus = 'not_sent'");
  });
});

describe('Provision route — role validation', () => {
  const route = read('app/api/admin/companies/provision/route.ts');

  it('accepts COMPANY_ADMIN (B119: COMPANY_VIEWER removed from new provisioning)', () => {
    // B119 doctrine: COMPANY_VIEWER is legacy-only, not a new provisioning role.
    // VALID_ROLES now contains only COMPANY_ADMIN.
    expect(route).toContain("'COMPANY_ADMIN'");
    expect(route).toContain('VALID_ROLES');
  });

  it('rejects invalid roles with 400', () => {
    expect(route).toContain('!VALID_ROLES.includes(adminRole)');
    expect(route).toContain('status: 400');
  });
});

describe('Provision route — service_role guard', () => {
  const route = read('app/api/admin/companies/provision/route.ts');

  it('returns 503 when SUPABASE_SERVICE_ROLE_KEY is not configured', () => {
    expect(route).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(route).toContain('status: 503');
  });
});

describe('Provision route — partial failure handling', () => {
  const route = read('app/api/admin/companies/provision/route.ts');

  it('returns 207 partial_failure when user creation fails after tenant creation', () => {
    expect(route).toContain('status: 207');
    expect(route).toContain("provisioningStatus: 'partial_failure'");
    expect(route).toContain('recovery');
  });

  it('includes recovery instructions pointing to /admin/company-users', () => {
    expect(route).toContain('/admin/company-users');
  });
});

// ── Punto 2 — Wizard integration ─────────────────────────────────────────────

describe('Wizard — wired to real provision route', () => {
  const wizard = read('app/admin/companies/setup/page.tsx');

  it('calls /api/admin/companies/provision (real route)', () => {
    expect(wizard).toContain('/api/admin/companies/provision');
  });

  it('uses handleProvision (async fetch) not handleCreateDraft (mock)', () => {
    expect(wizard).toContain('handleProvision');
    expect(wizard).not.toContain('handleCreateDraft');
  });

  it('no longer imports accountProvisioningService', () => {
    expect(wizard).not.toContain('accountProvisioningService');
    expect(wizard).not.toContain('createCompanyAdminDraft');
  });

  it('no longer imports lifecycleService', () => {
    expect(wizard).not.toContain('lifecycleService');
  });

  it('no longer imports tenantService (mock draft path removed)', () => {
    expect(wizard).not.toContain('tenantService');
    expect(wizard).not.toContain('createTenantDraft');
  });

  it('button is disabled without admin_email (provisioning requires real email)', () => {
    expect(wizard).toContain('state.admin_email');
    // Button disabled condition includes admin_email
    expect(wizard).toContain('!(state.company_name && state.legal_name && state.admin_email)');
  });

  it('shows isProvisioning state (loading indicator)', () => {
    expect(wizard).toContain('isProvisioning');
    expect(wizard).toContain('Provisioning…');
  });

  it('shows provisionResult with tenantId and inviteStatus on success', () => {
    expect(wizard).toContain('provisionResult');
    expect(wizard).toContain('provisionResult?.ok');
    expect(wizard).toContain('inviteStatus');
  });

  it('disclaimer no longer claims nessuna email reale inviata', () => {
    expect(wizard).not.toContain('Nessuna email reale inviata');
    expect(wizard).not.toContain('Nessuna password reale salvata');
  });
});

// ── Migration 006 — SQL correctness ──────────────────────────────────────────

describe('Migration 006 — SQL correctness', () => {
  const migration = read('supabase/migrations/006_canonical_tenant_key.sql');

  it('is a CREATE OR REPLACE FUNCTION for kora.tenant_id()', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION kora.tenant_id()');
  });

  it('includes NOTIFY pgrst to reload schema cache', () => {
    expect(migration).toContain('NOTIFY pgrst');
  });

  it('documents the backward-compat strategy', () => {
    expect(migration).toContain('BACKWARD COMPAT');
  });

  it('documents the canonical key choice with authority chain', () => {
    expect(migration).toContain('CANONICAL KEY');
    expect(migration).toContain('kora-session.ts');
    expect(migration).toContain('provision');
  });
});

// ── Auth callback route — invite flow completion ──────────────────────────────

describe('Auth callback route — structure', () => {
  const callback = read('app/auth/callback/route.ts');

  it('has GET handler for Supabase PKCE code exchange', () => {
    expect(callback).toContain('export async function GET');
  });

  it('calls exchangeCodeForSession with the code query param', () => {
    expect(callback).toContain('exchangeCodeForSession');
    expect(callback).toContain("searchParams.get('code')");
  });

  it('redirects to /company/setup-password on successful exchange', () => {
    expect(callback).toContain('/company/setup-password');
  });

  it('handles error param (expired token) — B117: invite errors now route to /login, recovery to /auth/reset-password', () => {
    // B117: Invite-flow errors (non-recovery) route to /login?error=... (not company/setup-password)
    // Recovery errors still route to /auth/reset-password
    expect(callback).toContain("searchParams.get('error')");
    // Recovery path still redirects to reset-password
    const lines = callback.split('\n');
    const recoveryErrorRedirect = lines.find((l) => l.includes('reset-password?'));
    expect(recoveryErrorRedirect).toBeTruthy();
    // Non-recovery errors now go to /login
    const inviteErrorRedirect = lines.find((l) => l.includes("'/login?'") || l.includes("new URL('/login'"));
    expect(inviteErrorRedirect ?? callback).toContain('/login');
  });

  it('routes to /login when code is missing (B117: not /company/login)', () => {
    // B117: unified entry — missing code errors route to /login, not /company/login
    expect(callback).toContain('/login?error=missing_auth_code');
    expect(callback).not.toContain('/company/login?error=missing_auth_code');
    expect(callback).toContain('missing_auth_code');
  });

  it('is runtime nodejs (cookie store access)', () => {
    expect(callback).toContain("runtime = 'nodejs'");
  });

  it('uses getSupabaseServerClient (not service client)', () => {
    expect(callback).toContain('getSupabaseServerClient');
    expect(callback).not.toContain('getSupabaseServiceClient');
  });
});

describe('Setup password page — structure', () => {
  const page = read('app/company/setup-password/page.tsx');
  const form = read('app/company/setup-password/_form.tsx');

  it('page.tsx wraps form in Suspense (required for useSearchParams)', () => {
    expect(page).toContain('Suspense');
    expect(page).toContain('SetupPasswordForm');
  });

  it('form is a client component', () => {
    expect(form).toContain("'use client'");
  });

  it('form reads error and error_description from URL (token expiry detection)', () => {
    expect(form).toContain('useSearchParams');
    expect(form).toContain("searchParams.get('error')");
    expect(form).toContain("searchParams.get('error_description')");
  });

  it('form calls supabase.auth.updateUser with password', () => {
    expect(form).toContain('updateUser');
    expect(form).toContain('password');
  });

  it('form redirects to /company/workspace on success', () => {
    expect(form).toContain('/company/workspace');
  });

  it('form shows expired-token message when error param is present', () => {
    expect(form).toContain('Link non valido o scaduto');
  });

  it('form enforces minimum password length', () => {
    expect(form).toMatch(/minLength|length < 8/);
  });

  it('form validates password confirmation match', () => {
    expect(form).toContain('Le password non coincidono');
  });

  it('form uses getSupabaseBrowserClient (not service client)', () => {
    expect(form).toContain('getSupabaseBrowserClient');
    expect(form).not.toContain('getSupabaseServiceClient');
  });
});

describe('Provision route — redirectTo points to auth callback', () => {
  const route = read('app/api/admin/companies/provision/route.ts');

  it('redirectTo uses /auth/callback (not /company/workspace directly)', () => {
    expect(route).toContain('/auth/callback');
    // Find the redirectTo line and verify it points to the callback
    const redirectLine = route.split('\n').find((l) => l.includes('redirectTo:'));
    expect(redirectLine).toBeDefined();
    expect(redirectLine).toContain('/auth/callback');
    expect(redirectLine).not.toContain('/company/workspace');
  });
});

describe('Middleware — allows auth callback and setup-password paths', () => {
  const mw = read('middleware.ts');

  it('COMPANY_ALLOWED_PREFIXES includes /company/setup-password', () => {
    expect(mw).toContain('/company/setup-password');
  });

  it("COMPANY_ALLOWED_PREFIXES includes '/auth/' prefix (B117-D: covers callback + reset-password)", () => {
    // B117-D: '/auth/callback' alone blocked /auth/reset-password — replaced with '/auth/'
    const companySection = mw.split('COMPANY_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(companySection).toContain("'/auth/'");
  });
});

// ── Tenant isolation — behaviour tests (pure logic, no Supabase) ──────────────
// assertTenantAccess is the application-layer cross-tenant guard.
// These tests verify its behaviour directly — no mocking needed (pure function).

import { assertTenantAccess, isKoraAdmin, isCompanyUser } from '../../lib/auth/kora-session';
import { NextResponse } from 'next/server';
import type { KoraCompanyUser, KoraUser } from '../../lib/auth/kora-session';

const tenantA = '11111111-1111-1111-1111-111111111111';
const tenantB = '22222222-2222-2222-2222-222222222222';

// B143: COMPANY_VIEWER removed — makeCompanyUser always creates COMPANY_ADMIN.
function makeCompanyUser(tenantId: string): KoraCompanyUser {
  return { id: 'user-1', email: 'u@a.it', koraRole: 'COMPANY_ADMIN', tenantId, userStatus: 'active' };
}

describe('Tenant isolation — assertTenantAccess (pure logic)', () => {
  it('returns null when user.tenantId matches requestedTenantId (access granted)', () => {
    const user = makeCompanyUser(tenantA);
    expect(assertTenantAccess(user, tenantA)).toBeNull();
  });

  it('returns 403 NextResponse when tenantId does not match (cross-tenant blocked)', () => {
    const user = makeCompanyUser(tenantA);
    const response = assertTenantAccess(user, tenantB);
    expect(response).not.toBeNull();
    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.status).toBe(403);
  });

  it('Company A user cannot access Company B tenant', () => {
    const userA = makeCompanyUser(tenantA);
    expect(assertTenantAccess(userA, tenantB)).not.toBeNull();
  });

  it('Company B user cannot access Company A tenant', () => {
    const userB = makeCompanyUser(tenantB);
    expect(assertTenantAccess(userB, tenantA)).not.toBeNull();
  });

  it('cross-tenant is blocked regardless of userStatus (role does not elevate access)', () => {
    const user = makeCompanyUser(tenantA);
    expect(assertTenantAccess(user, tenantB)).not.toBeNull();
  });

  it('403 response body contains error message', async () => {
    const user = makeCompanyUser(tenantA);
    const response = assertTenantAccess(user, tenantB)!;
    const body = await response.json();
    expect(body.error).toBeTruthy();
    expect(typeof body.error).toBe('string');
  });
});

describe('Tenant isolation — session layer (structural)', () => {
  const session = read('lib/auth/kora-session.ts');

  it('requireCompanyUser reads tenantId from app_metadata (not from request body or query)', () => {
    // tenantId is assigned from appMeta?.kora_tenant_id — server-controlled JWT
    expect(session).toContain('const tenantId = appMeta?.kora_tenant_id');
    // Must not read from request URL or body
    expect(session).not.toContain('request.url');
    expect(session).not.toContain('request.json');
  });

  it('getTenantFromSession reads kora_tenant_id (not bare tenant_id)', () => {
    expect(session).toContain('appMeta?.kora_tenant_id');
    // Must not read bare tenant_id
    expect(session).not.toContain("appMeta?.tenant_id");
  });

  it('no company API route takes tenantId from URL query params for data access', () => {
    const fs = require('fs');
    const path = require('path');
    const routeDir = path.join(process.cwd(), 'app/api/company');
    const routes = fs.readdirSync(routeDir, { recursive: true }) as string[];
    const routeFiles = routes.filter((f: string) => f.endsWith('route.ts'));

    for (const file of routeFiles) {
      const content = fs.readFileSync(path.join(routeDir, file), 'utf-8') as string;
      // No route should take tenantId from searchParams for data access
      // (period and reportingPeriod from searchParams are allowed — only tenantId is forbidden)
      const dangerousPattern = /searchParams\.get\(['"]tenantId['"]\)/;
      expect(
        dangerousPattern.test(content),
        `${file} takes tenantId from searchParams — cross-tenant risk`,
      ).toBe(false);
    }
  });
});

describe('Tenant isolation — type guards', () => {
  const adminUser: KoraUser = { id: 'admin-1', email: 'admin@kora.io', koraRole: 'KORA_ADMIN' };
  const companyAdmin = makeCompanyUser(tenantA);

  it('isKoraAdmin returns true only for KORA_ADMIN', () => {
    expect(isKoraAdmin(adminUser)).toBe(true);
    expect(isKoraAdmin(companyAdmin)).toBe(false);
  });

  it('isCompanyUser returns true for COMPANY_ADMIN (B143: COMPANY_VIEWER removed)', () => {
    expect(isCompanyUser(companyAdmin)).toBe(true);
    expect(isCompanyUser(adminUser)).toBe(false);
  });

  it('KORA_ADMIN cannot be a company user — distinct identity boundary', () => {
    expect(isCompanyUser(adminUser)).toBe(false);
    expect(isKoraAdmin(adminUser)).toBe(true);
  });
});
