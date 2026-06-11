// lib/auth/kora-session.ts
// Server-side session and role helper for KORA_ADMIN, company, and worker access control.
//
// Authorization rules:
//   - kora_role is read ONLY from user.app_metadata (server-controlled, Admin API only)
//   - user_metadata is NEVER used for authorization
//   - Session is validated server-side via supabase.auth.getUser() — cannot be spoofed
//   - service_role is NOT used to validate the current user session
//
// Supported auth paths:
//   1. Cookie-based session: populated by middleware token refresh (browser flow)
//   2. Authorization header: Bearer <access_token> (programmatic API clients, testing)
//
// Supported roles:
//   KORA_ADMIN     — platform operator, full admin access
//   COMPANY_ADMIN  — company-scoped, read/manage own tenant workspace
//   COMPANY_VIEWER — company-scoped, strictly read-only
//   WORKER         — worker-scoped, private personal space only

import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

// ── KoraUser — authenticated KORA_ADMIN operator ──────────────────────────────

export interface KoraUser {
  id: string;
  email: string;
  koraRole: 'KORA_ADMIN';
}

// ── KoraCompanyUser — authenticated company workspace user ────────────────────
// Tenant derived from app_metadata.kora_tenant_id — never trusted from client.

export interface KoraCompanyUser {
  id: string;
  email: string;
  koraRole: 'COMPANY_ADMIN' | 'COMPANY_VIEWER';
  tenantId: string;
  userStatus: 'active' | 'suspended' | 'disabled';
}

// ── Internal: resolve Supabase user from request ──────────────────────────────

async function resolveUser(request?: NextRequest): Promise<User | null> {
  const supabase = await getSupabaseServerClient();

  // Primary: cookie-based session (populated by middleware refresh)
  const { data: { user: cookieUser } } = await supabase.auth.getUser();
  if (cookieUser) return cookieUser;

  // Secondary: Authorization: Bearer <token> (for programmatic clients and tests)
  if (request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user: headerUser } } = await supabase.auth.getUser(token);
      if (headerUser) return headerUser;
    }
  }

  return null;
}

// ── getCurrentKoraUser — returns user + role or null (no redirect/throw) ─────

export async function getCurrentKoraUser(request?: NextRequest): Promise<KoraUser | null> {
  const user = await resolveUser(request);
  if (!user) return null;

  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  const koraRole = appMeta?.kora_role as string | undefined;
  if (!koraRole) return null;

  return { id: user.id, email: user.email ?? '', koraRole: koraRole as 'KORA_ADMIN' };
}

// ── requireKoraAdmin — returns KoraUser or a 401/403 NextResponse ─────────────
//
// Usage in route handlers:
//   const auth = await requireKoraAdmin(request);
//   if (isKoraAuthError(auth)) return auth;
//   // auth.koraRole === 'KORA_ADMIN', safe to proceed

export async function requireKoraAdmin(request?: NextRequest): Promise<KoraUser | NextResponse> {
  const user = await resolveUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorization from app_metadata ONLY — never user_metadata
  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  const koraRole = appMeta?.kora_role as string | undefined;

  if (koraRole !== 'KORA_ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden — KORA_ADMIN role required', role_found: koraRole ?? 'none' },
      { status: 403 },
    );
  }

  return { id: user.id, email: user.email ?? '', koraRole: 'KORA_ADMIN' };
}

// ── requireCompanyUser — returns KoraCompanyUser or a 401/403 NextResponse ────
//
// For company workspace APIs. Validates:
//   - authenticated session exists
//   - kora_role is COMPANY_ADMIN or COMPANY_VIEWER (from app_metadata)
//   - kora_tenant_id is present (from app_metadata)
//   - kora_status is 'active' (user not suspended/disabled)
//   - tenant is_active in analytics.tenant (tenant not suspended/archived)
//
// Usage:
//   const auth = await requireCompanyUser(request);
//   if (isKoraAuthError(auth)) return auth;
//   const tenantId = auth.tenantId; // always from session, never from client

export async function requireCompanyUser(request?: NextRequest): Promise<KoraCompanyUser | NextResponse> {
  const user = await resolveUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  const koraRole = appMeta?.kora_role as string | undefined;

  if (koraRole !== 'COMPANY_ADMIN' && koraRole !== 'COMPANY_VIEWER') {
    return NextResponse.json(
      { error: 'Forbidden — company user role required', role_found: koraRole ?? 'none' },
      { status: 403 },
    );
  }

  const tenantId = appMeta?.kora_tenant_id as string | undefined;
  if (!tenantId) {
    return NextResponse.json(
      { error: 'Forbidden — no tenant assigned to this user' },
      { status: 403 },
    );
  }

  const userStatus = (appMeta?.kora_status as string | undefined) ?? 'active';
  if (userStatus === 'suspended' || userStatus === 'disabled') {
    return NextResponse.json(
      { error: 'Account disabilitato. Contatta il tuo KORA Admin.' },
      { status: 403 },
    );
  }

  // Verify tenant is active — query analytics.tenant with service client
  try {
    const db = getSupabaseServiceClient();
    const { data: tenantRow } = await db
      .schema('analytics').from('tenant')
      .select('id, is_active')
      .eq('id', tenantId)
      .maybeSingle();

    if (!tenantRow) {
      return NextResponse.json({ error: 'Workspace non trovato.' }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(tenantRow as any).is_active) {
      return NextResponse.json(
        { error: 'Workspace aziendale sospeso. Contatta il tuo KORA Admin.' },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json({ error: 'Errore verifica accesso.' }, { status: 500 });
  }

  return {
    id: user.id,
    email: user.email ?? '',
    koraRole: koraRole as 'COMPANY_ADMIN' | 'COMPANY_VIEWER',
    tenantId,
    userStatus: userStatus as 'active' | 'suspended' | 'disabled',
  };
}

// ── getTenantFromSession — extract tenant_id from authenticated session ────────
// Returns null if not authenticated or not a company user.
// Never reads tenantId from query params or request body.

export async function getTenantFromSession(request?: NextRequest): Promise<string | null> {
  const user = await resolveUser(request);
  if (!user) return null;

  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  const koraRole = appMeta?.kora_role as string | undefined;

  if (koraRole !== 'COMPANY_ADMIN' && koraRole !== 'COMPANY_VIEWER') return null;

  return (appMeta?.kora_tenant_id as string | undefined) ?? null;
}

// ── assertTenantAccess — verify company user can access a specific tenant ──────
// Cross-tenant access attempt returns 403.
// KORA_ADMIN bypass is handled in admin routes, not here.

export function assertTenantAccess(
  user: KoraCompanyUser,
  requestedTenantId: string,
): NextResponse | null {
  if (user.tenantId !== requestedTenantId) {
    return NextResponse.json(
      { error: 'Accesso negato — tenant non autorizzato.' },
      { status: 403 },
    );
  }
  return null; // access granted
}

// ── KoraPartnerUser — authenticated partner in their workspace ───────────────
// partnerId links to network.partner_profile.id — always from app_metadata.
// PARTNER users are provisioned by KORA_ADMIN only — no self-signup.
// Partner cannot access worker data, company KORA Index, or admin routes.

export interface KoraPartnerUser {
  id: string;
  email: string;
  koraRole: 'PARTNER';
  partnerId: string;
  partnerStatus: 'invited' | 'active' | 'disabled';
}

// ── requirePartnerUser — returns KoraPartnerUser or a 401/403 NextResponse ────

export async function requirePartnerUser(request?: NextRequest): Promise<KoraPartnerUser | NextResponse> {
  const user = await resolveUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  const koraRole = appMeta?.kora_role as string | undefined;

  if (koraRole !== 'PARTNER') {
    return NextResponse.json(
      { error: 'Forbidden — PARTNER role required', role_found: koraRole ?? 'none' },
      { status: 403 },
    );
  }

  const partnerId = appMeta?.kora_partner_id as string | undefined;
  if (!partnerId) {
    return NextResponse.json(
      { error: 'Forbidden — no partner identity assigned. Contact KORA Admin.' },
      { status: 403 },
    );
  }

  const partnerStatus = (appMeta?.kora_status as string | undefined) ?? 'active';
  if (partnerStatus === 'disabled') {
    return NextResponse.json(
      { error: 'Account partner disabilitato. Contatta il tuo KORA Admin.' },
      { status: 403 },
    );
  }

  return {
    id: user.id,
    email: user.email ?? '',
    koraRole: 'PARTNER',
    partnerId,
    partnerStatus: partnerStatus as KoraPartnerUser['partnerStatus'],
  };
}

// ── getCurrentPartnerUser — returns KoraPartnerUser or null (no throw) ────────

export async function getCurrentPartnerUser(request?: NextRequest): Promise<KoraPartnerUser | null> {
  const result = await requirePartnerUser(request);
  return result instanceof NextResponse ? null : result;
}

// ── KoraWorkerUser — authenticated worker in their private space ──────────────
// workerId links to personal.worker_identity.id — always from app_metadata.
// tenantId scopes which company this worker belongs to.
// Company roles NEVER see this user's individual data — only aggregate counts.

export interface KoraWorkerUser {
  id: string;
  email: string;
  koraRole: 'WORKER';
  tenantId: string;
  workerId: string;
  workerStatus: 'invited' | 'active' | 'pending' | 'disabled';
}

// ── requireWorkerUser — returns KoraWorkerUser or a 401/403 NextResponse ──────

export async function requireWorkerUser(request?: NextRequest): Promise<KoraWorkerUser | NextResponse> {
  const user = await resolveUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  const koraRole = appMeta?.kora_role as string | undefined;

  if (koraRole !== 'WORKER') {
    return NextResponse.json(
      { error: 'Forbidden — WORKER role required', role_found: koraRole ?? 'none' },
      { status: 403 },
    );
  }

  const tenantId = appMeta?.kora_tenant_id as string | undefined;
  if (!tenantId) {
    return NextResponse.json({ error: 'Forbidden — no tenant assigned to this worker' }, { status: 403 });
  }

  const workerId = appMeta?.kora_worker_id as string | undefined;
  if (!workerId) {
    return NextResponse.json({ error: 'Forbidden — no worker identity assigned' }, { status: 403 });
  }

  const workerStatus = (appMeta?.kora_status as string | undefined) ?? 'invited';
  if (workerStatus === 'disabled') {
    return NextResponse.json({ error: 'Account disabilitato. Contatta il tuo amministratore.' }, { status: 403 });
  }

  return {
    id: user.id,
    email: user.email ?? '',
    koraRole: 'WORKER',
    tenantId,
    workerId,
    workerStatus: workerStatus as KoraWorkerUser['workerStatus'],
  };
}

// ── getCurrentWorkerUser — returns KoraWorkerUser or null (no throw) ──────────

export async function getCurrentWorkerUser(request?: NextRequest): Promise<KoraWorkerUser | null> {
  const result = await requireWorkerUser(request);
  return result instanceof NextResponse ? null : result;
}

// ── Type guards — distinguish error response from authorized user ──────────────

export function isKoraAuthError(
  value: KoraUser | KoraCompanyUser | KoraWorkerUser | KoraPartnerUser | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}

export function isKoraAdmin(value: KoraUser | KoraCompanyUser | KoraWorkerUser | KoraPartnerUser): value is KoraUser {
  return value.koraRole === 'KORA_ADMIN';
}

export function isCompanyUser(value: KoraUser | KoraCompanyUser | KoraWorkerUser | KoraPartnerUser): value is KoraCompanyUser {
  return value.koraRole === 'COMPANY_ADMIN' || value.koraRole === 'COMPANY_VIEWER';
}

export function isWorkerUser(value: KoraUser | KoraCompanyUser | KoraWorkerUser | KoraPartnerUser): value is KoraWorkerUser {
  return value.koraRole === 'WORKER';
}

export function isPartnerUser(value: KoraUser | KoraCompanyUser | KoraWorkerUser | KoraPartnerUser): value is KoraPartnerUser {
  return value.koraRole === 'PARTNER';
}
