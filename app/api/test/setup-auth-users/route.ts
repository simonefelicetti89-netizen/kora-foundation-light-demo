// app/api/test/setup-auth-users/route.ts
// DEV/TEST ONLY — remove or isolate before production.
// Uses service_role server-side. Never expose in production.
// SERVER-SIDE TEST ROUTE — Gate 3A Auth setup.
//
// Creates synthetic test tenants (TEST-A, TEST-B) and fake auth users
// with kora_role + tenant_id set in app_metadata (server-controlled, user-non-editable).
//
// Users created:
//   company-admin-a@example.test  → COMPANY_ADMIN, tenant TEST-A
//   company-admin-b@example.test  → COMPANY_ADMIN, tenant TEST-B
//   company-viewer-a@example.test → COMPANY_VIEWER, tenant TEST-A
//   kora-admin@example.test       → KORA_ADMIN,    no tenant_id
//
// Idempotent: if a user already exists, app_metadata is updated.
// No real people data. No PII. example.test domain is reserved for testing.
//
// REQUIRES:
//   - migration 003 applied in Supabase SQL editor (kora_role app_metadata fallback)
//   - KORA_TEST_USER_PASSWORD set in .env.local
//
// Protection:
//   1. Returns 404 in NODE_ENV === 'production'.
//   2. Requires header x-kora-test-secret.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

const TEST_TENANT_A_CODE = 'TEST-A';
const TEST_TENANT_B_CODE = 'TEST-B';

// Synthetic test users — example.test domain is an RFC-reserved test domain.
const TEST_USERS = [
  { email: 'company-admin-a@example.test',  kora_role: 'COMPANY_ADMIN',  tenant_code: TEST_TENANT_A_CODE },
  { email: 'company-admin-b@example.test',  kora_role: 'COMPANY_ADMIN',  tenant_code: TEST_TENANT_B_CODE },
  { email: 'company-viewer-a@example.test', kora_role: 'COMPANY_VIEWER', tenant_code: TEST_TENANT_A_CODE },
  { email: 'kora-admin@example.test',       kora_role: 'KORA_ADMIN',     tenant_code: null },
] as const;

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const clientSecret = request.headers.get('x-kora-test-secret');
  if (!clientSecret || clientSecret !== process.env.KORA_TEST_SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const testPassword = process.env.KORA_TEST_USER_PASSWORD;
  if (!testPassword) {
    return NextResponse.json({
      error: 'KORA_TEST_USER_PASSWORD not set in .env.local. Required for Gate 3A test user creation.',
    }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseServiceClient() as any;

  // Service-role admin client for auth operations.
  const adminAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  ).auth.admin;

  const log: string[] = [];

  // ── Step 1: Upsert TEST-A and TEST-B in analytics.tenant ─────────────────────

  const tenantIds: Record<string, string> = {};

  for (const code of [TEST_TENANT_A_CODE, TEST_TENANT_B_CODE]) {
    const { data: existing } = await db
      .schema('analytics')
      .from('tenant')
      .select('id')
      .eq('tenant_code', code)
      .maybeSingle();

    if (existing) {
      tenantIds[code] = existing.id as string;
      log.push(`tenant ${code}: reused (${existing.id})`);
    } else {
      const { data: created, error } = await db
        .schema('analytics')
        .from('tenant')
        .insert({
          tenant_code:            code,
          company_name:           `[SYNTHETIC TEST] Tenant ${code}`,
          industry_code:          'TEST',
          country_code:           'IT',
          onboarding_status:      'active',
          data_readiness_status:  'complete',
          decision_pack_status:   'not_ready',
          methodology_version_id: 'KORA Methodology v0.1',
          is_active:              true,
        })
        .select('id')
        .single();

      if (error || !created) {
        return NextResponse.json({ error: `Failed to create tenant ${code}: ${error?.message}` }, { status: 500 });
      }
      tenantIds[code] = created.id as string;
      log.push(`tenant ${code}: created (${created.id})`);
    }
  }

  // ── Step 2: Create or update auth users ──────────────────────────────────────

  // List existing users to detect which already exist.
  const { data: { users: existingUsers }, error: listErr } = await adminAuth.listUsers({ perPage: 200 });
  if (listErr) {
    return NextResponse.json({ error: `listUsers failed: ${listErr.message}` }, { status: 500 });
  }
  const existingByEmail = Object.fromEntries(existingUsers.map(u => [u.email, u]));

  const userResults: Array<{ email: string; id: string; kora_role: string; tenant_id: string | null; action: string }> = [];

  for (const spec of TEST_USERS) {
    const tenantId = spec.tenant_code ? tenantIds[spec.tenant_code] ?? null : null;
    const appMeta: Record<string, string | null> = { kora_role: spec.kora_role };
    if (tenantId) appMeta['tenant_id'] = tenantId;

    const existing = existingByEmail[spec.email];

    if (existing) {
      // Update app_metadata for existing user.
      const { error: updErr } = await adminAuth.updateUserById(existing.id, { app_metadata: appMeta });
      if (updErr) {
        return NextResponse.json({ error: `updateUser ${spec.email}: ${updErr.message}` }, { status: 500 });
      }
      userResults.push({ email: spec.email, id: existing.id, kora_role: spec.kora_role, tenant_id: tenantId, action: 'updated' });
      log.push(`user ${spec.email}: updated app_metadata`);
    } else {
      // Create new user — email_confirm: true skips confirmation email.
      const { data: created, error: createErr } = await adminAuth.createUser({
        email:         spec.email,
        password:      testPassword,
        email_confirm: true,
        app_metadata:  appMeta,
      });
      if (createErr || !created.user) {
        return NextResponse.json({ error: `createUser ${spec.email}: ${createErr?.message}` }, { status: 500 });
      }
      userResults.push({ email: spec.email, id: created.user.id, kora_role: spec.kora_role, tenant_id: tenantId, action: 'created' });
      log.push(`user ${spec.email}: created`);
    }
  }

  return NextResponse.json({
    ok: true,
    tenants: { [TEST_TENANT_A_CODE]: tenantIds[TEST_TENANT_A_CODE], [TEST_TENANT_B_CODE]: tenantIds[TEST_TENANT_B_CODE] },
    users:   userResults,
    log,
    notes: [
      'Migration 003 must be applied manually in Supabase SQL editor before running auth-isolation tests.',
      'Run GET /api/test/auth-isolation to validate RLS enforcement.',
    ],
    synthetic_test: true,
  });
}
