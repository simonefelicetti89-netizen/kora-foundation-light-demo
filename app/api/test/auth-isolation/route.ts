// app/api/test/auth-isolation/route.ts
// DEV/TEST ONLY — remove or isolate before production.
// Uses service_role server-side. Never expose in production.
// SERVER-SIDE TEST ROUTE — Gate 3A RLS isolation end-to-end.
//
// Signs in as each synthetic test user and verifies:
//   - COMPANY_ADMIN A sees only tenant TEST-A data
//   - COMPANY_ADMIN B sees only tenant TEST-B data
//   - COMPANY_VIEWER A sees tenant TEST-A (read-only)
//   - KORA_ADMIN sees all tenants + can access personal.uploaded_record
//   - No company role can read personal.uploaded_record
//
// REQUIRES:
//   - setup-auth-users POST run first (tenants + users must exist)
//   - migration 003 applied (kora_role reads from app_metadata)
//   - KORA_TEST_USER_PASSWORD set in .env.local
//
// Protection:
//   1. Returns 404 in NODE_ENV === 'production'.
//   2. Requires header x-kora-test-secret.
//
// Note on test approach:
//   Uses signInWithPassword() server-side — Supabase supports this.
//   Each user client is created with anonKey + no session persistence.
//   Queries go through PostgREST with the user's JWT (includes app_metadata).
//   After migration 003, kora.kora_role() reads from app_metadata → RLS enforced.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ── Assertion helper ──────────────────────────────────────────────────────────

interface Assertion {
  check:    string;
  expected: unknown;
  actual:   unknown;
  pass:     boolean;
  detail?:  string;
}

function ok(check: string, expected: unknown, actual: unknown, detail?: string): Assertion {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  return { check, expected, actual, pass, ...(detail ? { detail } : {}) };
}

interface CaseResult {
  user:       string;
  role:       string;
  pass:       boolean;
  assertions: Assertion[];
  error?:     string;
}

// ── Create authenticated user client ─────────────────────────────────────────

interface SignInResult {
  client: SupabaseClient<Database> | null;
  error: string | null;
  jwtClaims: {
    kora_role_top_level: string | null;
    kora_role_app_meta:  string | null;
    tenant_id_top_level: string | null;
    tenant_id_app_meta:  string | null;
  } | null;
}

async function signInAsUser(email: string, password: string): Promise<SignInResult> {
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signInData, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !signInData.session) return { client: null, error: error?.message ?? 'no session', jwtClaims: null };

  // Decode JWT payload (not the signature) to inspect what Supabase actually issued.
  // This is not a secret — JWT payload is always base64-decodable by anyone who holds the token.
  let jwtClaims: SignInResult['jwtClaims'] = null;
  try {
    const payloadB64 = signInData.session.access_token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as Record<string, unknown>;
    const appMeta = (payload['app_metadata'] ?? {}) as Record<string, unknown>;
    jwtClaims = {
      kora_role_top_level: (payload['kora_role'] as string) ?? null,
      kora_role_app_meta:  (appMeta['kora_role'] as string) ?? null,
      tenant_id_top_level: (payload['tenant_id'] as string) ?? null,
      tenant_id_app_meta:  (appMeta['tenant_id'] as string) ?? null,
    };
  } catch { jwtClaims = null; }

  return { client, error: null, jwtClaims };
}

// ── Query helpers — typed via updated Database type ───────────────────────────

async function queryTenantByCode(client: SupabaseClient<Database>, tenantCode: string) {
  return client.schema('analytics').from('tenant')
    .select('id,tenant_code')
    .eq('tenant_code', tenantCode)
    .eq('is_active', true);
}

async function queryUploadedRecord(client: SupabaseClient<Database>) {
  return client.schema('personal').from('uploaded_record')
    .select('id')
    .limit(5);
}

async function queryAuditLog(client: SupabaseClient<Database>) {
  return client.schema('audit').from('audit_log')
    .select('id')
    .limit(5);
}

// ── Pre-check: is migration 003 applied? ──────────────────────────────────────
// Signs in as kora-admin and checks what kora_role() returns via RLS behavior.
// If migration 003 is NOT applied, kora_role = 'anonymous' → can't read any data.

async function checkMigration003Applied(password: string): Promise<{ applied: boolean; detail: string }> {
  const { client, error: signInErr } = await signInAsUser('kora-admin@example.test', password);
  if (signInErr || !client) {
    return { applied: false, detail: `kora-admin sign-in failed: ${signInErr}. Run setup-auth-users first.` };
  }

  const { data, error } = await queryTenantByCode(client, 'TEST-A');
  await client.auth.signOut();

  if (error) {
    // If we get a schema error, analytics might not be exposed.
    if (error.message?.includes('schema')) {
      return { applied: false, detail: `Schema not exposed: ${error.message}` };
    }
    return { applied: false, detail: `Unexpected error: ${error.message}` };
  }

  // KORA_ADMIN should see TEST-A if migration 003 is applied.
  // If migration not applied → kora_role='anonymous' → 0 rows → data is empty.
  // But if TEST-A doesn't exist either, we'd also get 0 rows — we check both cases below.
  // We use this as a heuristic: a non-null data array (even empty) means the query ran.
  // The real migration check is in the isolation assertions.
  return {
    applied: data !== null,
    detail: data !== null
      ? `analytics.tenant query succeeded (${(data as unknown[]).length} rows)`
      : 'Query returned null — schema might not be exposed or migration not applied',
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const clientSecret = request.headers.get('x-kora-test-secret');
  if (!clientSecret || clientSecret !== process.env.KORA_TEST_SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const testPassword = process.env.KORA_TEST_USER_PASSWORD;
  if (!testPassword) {
    return NextResponse.json({ error: 'KORA_TEST_USER_PASSWORD not set' }, { status: 400 });
  }

  // ── Pre-check ────────────────────────────────────────────────────────────────

  const migCheck = await checkMigration003Applied(testPassword);
  const preChecks = {
    migration_003_signal: migCheck.detail,
    env_url_set:    !!SUPABASE_URL,
    env_anon_set:   !!SUPABASE_ANON,
    env_svc_set:    !!SERVICE_KEY,
  };

  // ── Fetch tenant IDs using service role ───────────────────────────────────────
  const svcDb = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: tenantA } = await svcDb.schema('analytics').from('tenant').select('id').eq('tenant_code', 'TEST-A').maybeSingle();
  const { data: tenantB } = await svcDb.schema('analytics').from('tenant').select('id').eq('tenant_code', 'TEST-B').maybeSingle();

  if (!tenantA || !tenantB) {
    return NextResponse.json({
      ok: false,
      verdict: 'SETUP_REQUIRED',
      message: 'TEST-A or TEST-B tenant not found. Run POST /api/test/setup-auth-users first.',
      preChecks,
    }, { status: 400 });
  }

  const tenantAId = tenantA.id as string;
  const tenantBId = tenantB.id as string;

  const cases: CaseResult[] = [];

  // ══════════════════════════════════════════════════════════════════════════════
  // Case A: COMPANY_ADMIN A
  // Expects: sees TEST-A, cannot see TEST-B, cannot read personal.uploaded_record
  // ══════════════════════════════════════════════════════════════════════════════

  {
    const email = 'company-admin-a@example.test';
    const { client, error: signInErr, jwtClaims: claimsA } = await signInAsUser(email, testPassword);

    if (signInErr || !client) {
      cases.push({ user: email, role: 'COMPANY_ADMIN', pass: false, assertions: [], error: signInErr ?? 'sign-in failed' });
    } else {
      const [rA, rB, rUpload, rAudit] = await Promise.all([
        queryTenantByCode(client, 'TEST-A'),
        queryTenantByCode(client, 'TEST-B'),
        queryUploadedRecord(client),
        queryAuditLog(client),
      ]);
      await client.auth.signOut();

      const rowsA  = (rA.data  ?? []) as unknown[];
      const rowsB  = (rB.data  ?? []) as unknown[];
      const rowsUp = (rUpload.data ?? []) as unknown[];

      const assertions: Assertion[] = [
        ok('jwt.app_metadata.kora_role = COMPANY_ADMIN', 'COMPANY_ADMIN', claimsA?.kora_role_app_meta),
        ok('jwt.app_metadata.tenant_id = TEST-A', tenantAId, claimsA?.tenant_id_app_meta),
        ok('can read analytics.tenant TEST-A',  1, rowsA.length,
           rA.error ? `error: ${rA.error.message}` : `tenant_id=${tenantAId}`),
        ok('cannot read analytics.tenant TEST-B', 0, rowsB.length,
           rB.error ? `error: ${rB.error.message}` : 'RLS correctly filters other tenant'),
        ok('cannot read personal.uploaded_record', 0, rowsUp.length,
           rUpload.error ? `error: ${rUpload.error.message}` : 'no SELECT policy for COMPANY_ADMIN'),
        ok('cannot read audit.audit_log', 0, ((rAudit.data ?? []) as unknown[]).length,
           rAudit.error ? `error: ${rAudit.error.message}` : 'no SELECT policy for COMPANY_ADMIN'),
      ];

      cases.push({ user: email, role: 'COMPANY_ADMIN', pass: assertions.every(a => a.pass), assertions });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Case B: COMPANY_ADMIN B
  // Expects: sees TEST-B, cannot see TEST-A, cannot read personal.uploaded_record
  // ══════════════════════════════════════════════════════════════════════════════

  {
    const email = 'company-admin-b@example.test';
    const { client, error: signInErr, jwtClaims: claimsB } = await signInAsUser(email, testPassword);

    if (signInErr || !client) {
      cases.push({ user: email, role: 'COMPANY_ADMIN', pass: false, assertions: [], error: signInErr ?? 'sign-in failed' });
    } else {
      const [rA, rB, rUpload] = await Promise.all([
        queryTenantByCode(client, 'TEST-A'),
        queryTenantByCode(client, 'TEST-B'),
        queryUploadedRecord(client),
      ]);
      await client.auth.signOut();

      const rowsA  = (rA.data  ?? []) as unknown[];
      const rowsB  = (rB.data  ?? []) as unknown[];
      const rowsUp = (rUpload.data ?? []) as unknown[];

      const assertions: Assertion[] = [
        ok('jwt.app_metadata.kora_role = COMPANY_ADMIN', 'COMPANY_ADMIN', claimsB?.kora_role_app_meta),
        ok('jwt.app_metadata.tenant_id = TEST-B', tenantBId, claimsB?.tenant_id_app_meta),
        ok('cannot read analytics.tenant TEST-A', 0, rowsA.length,
           rA.error ? `error: ${rA.error.message}` : 'RLS correctly filters other tenant'),
        ok('can read analytics.tenant TEST-B',    1, rowsB.length,
           rB.error ? `error: ${rB.error.message}` : `tenant_id=${tenantBId}`),
        ok('cannot read personal.uploaded_record', 0, rowsUp.length,
           rUpload.error ? `error: ${rUpload.error.message}` : 'no SELECT policy for COMPANY_ADMIN'),
      ];

      cases.push({ user: email, role: 'COMPANY_ADMIN', pass: assertions.every(a => a.pass), assertions });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Case C: COMPANY_VIEWER A
  // Expects: sees TEST-A, cannot see TEST-B, cannot read personal.uploaded_record
  // ══════════════════════════════════════════════════════════════════════════════

  {
    const email = 'company-viewer-a@example.test';
    const { client, error: signInErr, jwtClaims: claimsV } = await signInAsUser(email, testPassword);

    if (signInErr || !client) {
      cases.push({ user: email, role: 'COMPANY_VIEWER', pass: false, assertions: [], error: signInErr ?? 'sign-in failed' });
    } else {
      const [rA, rB, rUpload] = await Promise.all([
        queryTenantByCode(client, 'TEST-A'),
        queryTenantByCode(client, 'TEST-B'),
        queryUploadedRecord(client),
      ]);
      await client.auth.signOut();

      const rowsA  = (rA.data  ?? []) as unknown[];
      const rowsB  = (rB.data  ?? []) as unknown[];
      const rowsUp = (rUpload.data ?? []) as unknown[];

      const assertions: Assertion[] = [
        ok('jwt.app_metadata.kora_role = COMPANY_VIEWER', 'COMPANY_VIEWER', claimsV?.kora_role_app_meta),
        ok('jwt.app_metadata.tenant_id = TEST-A', tenantAId, claimsV?.tenant_id_app_meta),
        ok('can read analytics.tenant TEST-A',    1, rowsA.length,
           rA.error ? `error: ${rA.error.message}` : 'COMPANY_VIEWER has SELECT on own tenant'),
        ok('cannot read analytics.tenant TEST-B', 0, rowsB.length,
           rB.error ? `error: ${rB.error.message}` : 'RLS correctly filters other tenant'),
        ok('cannot read personal.uploaded_record', 0, rowsUp.length,
           rUpload.error ? `error: ${rUpload.error.message}` : 'no SELECT policy for COMPANY_VIEWER'),
      ];

      cases.push({ user: email, role: 'COMPANY_VIEWER', pass: assertions.every(a => a.pass), assertions });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Case D: KORA_ADMIN
  // Expects: sees all tenants, can access personal.uploaded_record
  // ══════════════════════════════════════════════════════════════════════════════

  {
    const email = 'kora-admin@example.test';
    const { client, error: signInErr, jwtClaims: claimsK } = await signInAsUser(email, testPassword);

    if (signInErr || !client) {
      cases.push({ user: email, role: 'KORA_ADMIN', pass: false, assertions: [], error: signInErr ?? 'sign-in failed' });
    } else {
      const [rA, rB, rUpload, rAudit] = await Promise.all([
        queryTenantByCode(client, 'TEST-A'),
        queryTenantByCode(client, 'TEST-B'),
        queryUploadedRecord(client),
        queryAuditLog(client),
      ]);
      await client.auth.signOut();

      const rowsA  = (rA.data  ?? []) as unknown[];
      const rowsB  = (rB.data  ?? []) as unknown[];
      const rowsUp = (rUpload.data ?? []) as unknown[];
      const rowsAudit = (rAudit.data ?? []) as unknown[];

      const assertions: Assertion[] = [
        ok('jwt.app_metadata.kora_role = KORA_ADMIN', 'KORA_ADMIN', claimsK?.kora_role_app_meta),
        ok('can read analytics.tenant TEST-A', 1, rowsA.length,
           rA.error ? `error: ${rA.error.message}` : 'KORA_ADMIN cross-tenant policy'),
        ok('can read analytics.tenant TEST-B', 1, rowsB.length,
           rB.error ? `error: ${rB.error.message}` : 'KORA_ADMIN cross-tenant policy'),
        ok('personal.uploaded_record query succeeds', true, rUpload.data !== null,
           rUpload.error ? `error: ${rUpload.error.message}` : `${rowsUp.length} rows visible to KORA_ADMIN`),
        ok('audit.audit_log query succeeds', true, rAudit.data !== null,
           rAudit.error ? `error: ${rAudit.error.message}` : `${rowsAudit.length} rows visible to KORA_ADMIN`),
      ];

      cases.push({ user: email, role: 'KORA_ADMIN', pass: assertions.every(a => a.pass), assertions });
    }
  }

  // ── Cross-tenant isolation summary ────────────────────────────────────────────

  const allPass    = cases.every(c => c.pass);
  const anySignIn  = cases.some(c => !c.error);

  // If all sign-ins failed → likely users not created or migration not applied.
  const verdict = !anySignIn
    ? 'SETUP_REQUIRED'
    : allPass
      ? 'PASS'
      : 'FAIL';

  const migrationNote = !anySignIn
    ? 'All sign-ins failed. Ensure setup-auth-users ran and migration 003 is applied.'
    : cases.some(c => c.assertions.some(a => !a.pass && String(a.actual) === '0' && a.check.includes('can read')))
      ? 'MIGRATION_003_POSSIBLY_NOT_APPLIED: company roles cannot read own tenant — kora_role may be returning anonymous.'
      : null;

  return NextResponse.json({
    ok:       allPass,
    verdict,
    pre_checks:    preChecks,
    tenant_ids:    { 'TEST-A': tenantAId, 'TEST-B': tenantBId },
    cases,
    summary: {
      total:  cases.length,
      pass:   cases.filter(c => c.pass).length,
      fail:   cases.filter(c => !c.pass).length,
      errors: cases.filter(c => !!c.error).length,
    },
    ...(migrationNote ? { migration_warning: migrationNote } : {}),
    synthetic_test: true,
  }, { status: allPass ? 200 : 422 });
}
