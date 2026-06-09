// app/api/worker/profile/route.ts
// B104: Worker reads or updates their own private profile.
//
// GET: returns worker_identity + worker_profile_private for the authenticated worker.
// PATCH: updates display_name and/or onboarding_done.
//
// Privacy: workerId comes from session app_metadata — never from query params.
// No employer role can reach this route (requireWorkerUser enforces WORKER role).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  const db = getSupabaseServiceClient();

  const { data: wiRow, error: wiErr } = await db.schema('personal').from('worker_identity')
    .select('id, worker_ref, status, tenant_id, created_at')
    .eq('id', auth.workerId)
    .eq('auth_user_id', auth.id)
    .maybeSingle();

  if (wiErr) return NextResponse.json({ error: wiErr.message }, { status: 500 });
  if (!wiRow) return NextResponse.json({ error: 'Worker identity non trovata.' }, { status: 404 });

  const { data: profRow } = await db.schema('personal').from('worker_profile_private')
    .select('display_name, preferred_lang, onboarding_done')
    .eq('worker_id', auth.workerId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wi = wiRow as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof = (profRow ?? {}) as any;

  return NextResponse.json({
    ok: true,
    identity: {
      workerId:  wi.id as string,
      workerRef: wi.worker_ref as string,
      status:    wi.status as string,
      tenantId:  wi.tenant_id as string,
      createdAt: wi.created_at as string,
    },
    profile: {
      displayName:    (prof.display_name as string | null) ?? null,
      preferredLang:  (prof.preferred_lang as string) ?? 'it',
      onboardingDone: (prof.onboarding_done as boolean) ?? false,
    },
    // Privacy notice — always included
    privacyNotice: 'Il tuo datore di lavoro non può vedere questi dati individuali. Solo tu puoi accedervi.',
  });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  let body: { displayName?: string; onboardingDone?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const db = getSupabaseServiceClient();

  // Upsert worker_profile_private
  const updates: Record<string, unknown> = {
    worker_id:  auth.workerId,
    updated_at: new Date().toISOString(),
  };
  if (typeof body.displayName === 'string') updates['display_name'] = body.displayName.trim().slice(0, 100);
  if (typeof body.onboardingDone === 'boolean') updates['onboarding_done'] = body.onboardingDone;

  const { error } = await db.schema('personal').from('worker_profile_private')
    .upsert(updates, { onConflict: 'worker_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If onboarding completed, update worker_identity status → active
  if (body.onboardingDone === true) {
    await db.schema('personal').from('worker_identity')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', auth.workerId);

    await db.auth.admin.updateUserById(auth.id, {
      app_metadata: {
        kora_role:      'WORKER',
        kora_tenant_id: auth.tenantId,
        kora_worker_id: auth.workerId,
        kora_status:    'active',
      },
    });
  }

  return NextResponse.json({ ok: true });
}
