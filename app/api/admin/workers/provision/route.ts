// app/api/admin/workers/provision/route.ts
// B104: Provision a live worker for a KORA tenant.
//
// Responsibilities:
//   1. Invite the worker via Supabase Admin API (inviteUserByEmail)
//   2. Insert personal.worker_identity row (auth_user_id from invite response)
//   3. Update auth user app_metadata to add kora_worker_id
//
// Privacy invariants:
//   - Only KORA_ADMIN can call this route
//   - worker_ref is an opaque label — never real name or email
//   - Company roles cannot see individual worker_identity rows (RLS enforced at DB)

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { insertWorkerIdentity } from '@/lib/supabase/worker-provisioning-service-key';

const ProvisionWorkerSchema = z.object({
  tenantCode: z.string().min(1, 'tenantCode is required').max(32),
  email:      z.string().email('email non valido'),
  workerRef:  z.string().max(100).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = ProvisionWorkerSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Payload non valido.' },
      { status: 400 },
    );
  }

  const tenantCode = parsed.data.tenantCode.trim();
  const email      = parsed.data.email.trim().toLowerCase();
  const workerRef  = (parsed.data.workerRef ?? '').trim() || `WRK-${Date.now()}`;

  const db = getSupabaseServiceClient();

  // ── 1. Lookup tenant ────────────────────────────────────────────────────────
  const { data: tenantRow, error: tErr } = await db.schema('analytics').from('tenant')
    .select('id, tenant_code, company_name')
    .eq('tenant_code', tenantCode)
    .eq('is_active', true)
    .maybeSingle();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!tenantRow) return NextResponse.json({ error: `Tenant not found: ${tenantCode}` }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenantRow as any;
  const tenantId = t.id as string;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  // ── 2. Invite via Supabase Admin API ────────────────────────────────────────
  const { data: inviteData, error: inviteErr } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`,
    data: {
      kora_role:      'WORKER',
      kora_tenant_id: tenantId,
      kora_status:    'invited',
    },
  });

  if (inviteErr) {
    // If already invited, try to get existing user
    if (inviteErr.message.toLowerCase().includes('already') || inviteErr.message.toLowerCase().includes('exist')) {
      return NextResponse.json(
        { error: 'Un worker con questa email è già stato invitato o esiste già.', hint: 'Verifica in /admin/workers/list' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: inviteErr.message }, { status: 500 });
  }

  const authUserId = inviteData.user.id;

  // ── 3. Insert personal.worker_identity (scoped service-role, field whitelist) ─
  const { data: wiRow, error: wiErr } = await insertWorkerIdentity({
    tenant_id:    tenantId,
    auth_user_id: authUserId,
    worker_ref:   workerRef,
    status:       'invited',
  });

  if (wiErr || !wiRow) {
    return NextResponse.json({ error: `worker_identity insert: ${wiErr ?? 'no data returned'}` }, { status: 500 });
  }

  const workerId = wiRow.id;

  // ── 4. Update app_metadata with kora_worker_id ───────────────────────────────
  const { error: metaErr } = await db.auth.admin.updateUserById(authUserId, {
    app_metadata: {
      kora_role:      'WORKER',
      kora_tenant_id: tenantId,
      kora_worker_id: workerId,
      kora_status:    'invited',
    },
  });

  if (metaErr) {
    // Non-fatal: worker_identity exists, app_metadata update failed
    return NextResponse.json({
      ok:       true,
      workerId,
      authUserId,
      warning:  `app_metadata update failed: ${metaErr.message}. Run manually via Supabase dashboard.`,
    }, { status: 207 });
  }

  return NextResponse.json({
    ok:        true,
    workerId,
    authUserId,
    tenantCode,
    workerRef,
    status:    'invited',
    message:   `Worker invitato. Email di invito inviata a ${email}.`,
  });
}
