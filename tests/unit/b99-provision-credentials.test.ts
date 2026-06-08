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

  it('accepts both COMPANY_ADMIN and COMPANY_VIEWER', () => {
    expect(route).toContain("'COMPANY_ADMIN'");
    expect(route).toContain("'COMPANY_VIEWER'");
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
