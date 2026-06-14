// app/api/admin/company-users/route.ts
// B36 — Company user provisioning — KORA_ADMIN only.
//
// GET  /api/admin/company-users?tenantId=<uuid>   → list company users for tenant
// POST /api/admin/company-users                   → assign/invite company user
// PATCH /api/admin/company-users                  → update user status
//
// Authorization model:
//   - KORA_ADMIN only — company users cannot call this API
//   - Company user role + tenant assignment stored in Supabase app_metadata (server-controlled)
//   - app_metadata is NEVER writable by the user — only by Admin API with service role
//
// Pilot behavior:
//   - POST invites user via Supabase Auth admin.inviteUserByEmail()
//   - On creation, sets app_metadata: { kora_role, kora_tenant_id, kora_status: 'active' }
//   - If invite email fails (no SMTP in dev), user is still created and app_metadata is set
//   - Audit event logged to audit.audit_log for every provisioning action

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

const COMPANY_ROLES = ['COMPANY_ADMIN'] as const;
type CompanyRole = (typeof COMPANY_ROLES)[number];

const VALID_STATUSES = ['active', 'suspended', 'disabled'] as const;
type UserStatus = (typeof VALID_STATUSES)[number];

// ── GET: list company users for a tenant ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const tenantId = (searchParams.get('tenantId') ?? '').trim();

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required.' }, { status: 400 });
  }

  const db = getSupabaseServiceClient();

  // Verify tenant exists
  const { data: tenantRow } = await db
    .schema('analytics').from('tenant')
    .select('id, company_name')
    .eq('id', tenantId)
    .maybeSingle();

  if (!tenantRow) {
    return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenantRow as any;

  // List Supabase Auth users — filter by kora_tenant_id in app_metadata
  // This uses the Admin API (service role) to inspect app_metadata
  const { data: usersData, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 });

  if (listErr) {
    return NextResponse.json({ error: `Auth list failed: ${listErr.message}` }, { status: 500 });
  }

  const companyUsers = (usersData?.users ?? [])
    .filter((u) => {
      const meta = u.app_metadata as Record<string, unknown> | undefined;
      return meta?.kora_tenant_id === tenantId &&
        COMPANY_ROLES.includes(meta?.kora_role as CompanyRole);
    })
    .map((u) => {
      const meta = u.app_metadata as Record<string, unknown>;
      return {
        userId:      u.id,
        email:       u.email ?? '',
        koraRole:    meta.kora_role as string,
        tenantId:    meta.kora_tenant_id as string,
        userStatus:  (meta.kora_status as string) ?? 'active',
        lastSignIn:  u.last_sign_in_at ?? null,
        createdAt:   u.created_at,
        invitedAt:   u.invited_at ?? null,
        emailConfirmed: !!u.email_confirmed_at,
      };
    });

  return NextResponse.json({
    ok: true,
    tenantId,
    companyName: t.company_name as string,
    users: companyUsers,
    total: companyUsers.length,
  });
}

// ── POST: invite/assign company user ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const email    = typeof body['email']    === 'string' ? body['email'].trim().toLowerCase()    : '';
  const role     = typeof body['role']     === 'string' ? body['role'].trim().toUpperCase()     : '';
  const tenantId = typeof body['tenantId'] === 'string' ? body['tenantId'].trim()               : '';

  if (!email)    return NextResponse.json({ error: 'email is required.' },    { status: 400 });
  if (!role)     return NextResponse.json({ error: 'role is required.' },     { status: 400 });
  if (!tenantId) return NextResponse.json({ error: 'tenantId is required.' }, { status: 400 });

  if (!COMPANY_ROLES.includes(role as CompanyRole)) {
    return NextResponse.json({ error: `Invalid role. Allowed: ${COMPANY_ROLES.join(', ')}.` }, { status: 400 });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
  }

  const db = getSupabaseServiceClient();

  // Verify tenant exists and is active
  const { data: tenantRow } = await db
    .schema('analytics').from('tenant')
    .select('id, company_name, is_active')
    .eq('id', tenantId)
    .maybeSingle();

  if (!tenantRow) {
    return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenantRow as any;
  if (!t.is_active) {
    return NextResponse.json({ error: 'Cannot provision users for an inactive tenant.' }, { status: 422 });
  }

  // Check if user already exists with this email
  const { data: existingUsers } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = (existingUsers?.users ?? []).find((u) => u.email === email);

  let userId: string;
  let invited: boolean = false;
  let alreadyExisted: boolean = false;

  if (existingUser) {
    // User already exists — update their app_metadata
    alreadyExisted = true;
    userId = existingUser.id;

    const existingMeta = existingUser.app_metadata as Record<string, unknown> | undefined;
    if (existingMeta?.kora_tenant_id && existingMeta.kora_tenant_id !== tenantId) {
      return NextResponse.json({
        error: 'User already assigned to a different tenant.',
        conflict: true,
      }, { status: 409 });
    }
  } else {
    // Invite new user via Supabase Auth Admin API
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const { data: inviteData, error: inviteErr } = await db.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/company/workspace`,
    });

    if (inviteErr || !inviteData?.user) {
      // Invite failed — log warning but don't block (SMTP may not be configured in dev)
      console.warn('[company-users POST] Invite email failed (SMTP may not be configured):', inviteErr?.message);
      // Try to create user without invite
      const { data: createData, error: createErr } = await db.auth.admin.createUser({
        email,
        email_confirm: true,
        password: undefined,
      });
      if (createErr || !createData?.user) {
        return NextResponse.json({
          error: `User creation failed: ${createErr?.message ?? inviteErr?.message ?? 'unknown error'}`,
        }, { status: 500 });
      }
      userId = createData.user.id;
    } else {
      userId = inviteData.user.id;
      invited = true;
    }
  }

  // Set app_metadata — ALWAYS via Admin API (server-controlled, user cannot write this)
  const { error: updateErr } = await db.auth.admin.updateUserById(userId, {
    app_metadata: {
      kora_role:      role,
      kora_tenant_id: tenantId,
      kora_status:    'active',
    },
  });

  if (updateErr) {
    return NextResponse.json({ error: `Metadata update failed: ${updateErr.message}` }, { status: 500 });
  }

  // Audit log
  const auditRow = {
    tenant_id:     tenantId,
    actor_role:    'KORA_ADMIN',
    actor_id:      authResult.id,
    action:        alreadyExisted ? 'company_user_assigned' : 'company_user_invited',
    resource_type: 'auth.user',
    resource_id:   userId,
    payload: {
      email,
      role,
      tenant_id:    tenantId,
      company_name: t.company_name,
      operator:     authResult.email,
      invited:      invited && !alreadyExisted,
      already_existed: alreadyExisted,
    },
    ip_address: null,
  };
  const { error: auditErr } = await db.schema('audit').from('audit_log').insert(auditRow);
  if (auditErr) console.error('[company-users POST] audit:', auditErr.message);

  return NextResponse.json({
    ok:            true,
    userId,
    email,
    role,
    tenantId,
    companyName:   t.company_name,
    userStatus:    'active',
    invited:       invited && !alreadyExisted,
    alreadyExisted,
    note:          alreadyExisted
      ? 'Utente esistente aggiornato al nuovo tenant e ruolo.'
      : invited
      ? 'Invito inviato. L\'utente riceverà un link per impostare la password.'
      : 'Utente creato (invito email non inviato — SMTP non configurato). Configura manualmente l\'accesso.',
    links: {
      companyWorkspace: `/company/workspace`,
    },
  });
}

// ── PATCH: update user status ─────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const userId    = typeof body['userId']    === 'string' ? body['userId'].trim()    : '';
  const newStatus = typeof body['status']    === 'string' ? body['status'].trim()    : '';
  const tenantId  = typeof body['tenantId']  === 'string' ? body['tenantId'].trim()  : '';

  if (!userId)    return NextResponse.json({ error: 'userId is required.' },   { status: 400 });
  if (!newStatus) return NextResponse.json({ error: 'status is required.' },   { status: 400 });

  if (!VALID_STATUSES.includes(newStatus as UserStatus)) {
    return NextResponse.json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}.` }, { status: 400 });
  }

  const db = getSupabaseServiceClient();

  // Verify user exists and is a company user
  const { data: userData, error: getUserErr } = await db.auth.admin.getUserById(userId);
  if (getUserErr || !userData?.user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const meta = userData.user.app_metadata as Record<string, unknown> | undefined;
  if (!COMPANY_ROLES.includes(meta?.kora_role as CompanyRole)) {
    return NextResponse.json({ error: 'User is not a company user.' }, { status: 422 });
  }

  // If tenantId provided, verify it matches (prevents cross-tenant status updates)
  if (tenantId && meta?.kora_tenant_id !== tenantId) {
    return NextResponse.json({ error: 'User does not belong to specified tenant.' }, { status: 403 });
  }

  // Update kora_status in app_metadata
  const { error: updateErr } = await db.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...meta,
      kora_status: newStatus,
    },
  });

  if (updateErr) {
    return NextResponse.json({ error: `Status update failed: ${updateErr.message}` }, { status: 500 });
  }

  // Audit log
  const auditRow = {
    tenant_id:     (meta?.kora_tenant_id as string) ?? tenantId,
    actor_role:    'KORA_ADMIN',
    actor_id:      authResult.id,
    action:        `company_user_status_${newStatus}`,
    resource_type: 'auth.user',
    resource_id:   userId,
    payload: {
      email:          userData.user.email,
      previous_status: (meta?.kora_status as string) ?? 'active',
      new_status:     newStatus,
      operator:       authResult.email,
    },
    ip_address: null,
  };
  const { error: auditErr } = await db.schema('audit').from('audit_log').insert(auditRow);
  if (auditErr) console.error('[company-users PATCH] audit:', auditErr.message);

  return NextResponse.json({
    ok:        true,
    userId,
    newStatus,
    email:     userData.user.email,
    note:      `Stato utente aggiornato a '${newStatus}'.`,
  });
}
