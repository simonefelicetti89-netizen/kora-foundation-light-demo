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
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { updateWorkerAuthMetadata } from '@/lib/supabase/auth-admin-update-user';
import { assertSameOrigin } from '@/lib/security/origin';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  // RLS isola la riga: worker_identity_worker_own_select usa auth_user_id = auth.uid() (mig 007).
  const db = await getSupabaseServerClient();

  const { data: wiRow, error: wiErr } = await db.schema('personal').from('worker_identity')
    .select('id, worker_ref, status, tenant_id, created_at')
    .eq('id', auth.workerId)
    .maybeSingle();

  if (wiErr) {
    console.error('[worker/profile GET] worker_identity query error:', wiErr.message);
    return NextResponse.json({ error: 'Errore nel recupero del profilo.' }, { status: 500 });
  }
  if (!wiRow) return NextResponse.json({ error: 'Worker identity non trovata.' }, { status: 404 });

  // RLS worker_profile_worker_own_all (mig 007) isola via auth.uid() subquery.
  const { data: profRow } = await db.schema('personal').from('worker_profile_private')
    .select('display_name, preferred_lang, onboarding_done')
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
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  let body: { displayName?: string; onboardingDone?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // DB ops via server client (RLS-respecting):
  //   worker_profile_private: worker_profile_worker_own_all (mig 007)
  //   worker_identity UPDATE: worker_identity_worker_own_update (mig 022)
  const db = await getSupabaseServerClient();

  // Upsert worker_profile_private — difesa in profondità: worker_id nel payload
  const updates: Record<string, unknown> = {
    worker_id:  auth.workerId,
    updated_at: new Date().toISOString(),
  };
  if (typeof body.displayName === 'string') updates['display_name'] = body.displayName.trim().slice(0, 100);
  if (typeof body.onboardingDone === 'boolean') updates['onboarding_done'] = body.onboardingDone;

  const { error } = await db.schema('personal').from('worker_profile_private')
    .upsert(updates, { onConflict: 'worker_id' });

  if (error) {
    console.error('[worker/profile PATCH] worker_profile_private upsert error:', error.message);
    return NextResponse.json({ error: 'Errore nel salvataggio del profilo.' }, { status: 500 });
  }

  // If onboarding completed: update worker_identity + sync auth.admin metadata
  if (body.onboardingDone === true) {
    await db.schema('personal').from('worker_identity')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', auth.workerId);

    // auth.admin.updateUserById richiede service-role per design Supabase.
    // Isolato nell'helper — unico punto del codebase con service-client in /api/worker/*.
    const authResult = await updateWorkerAuthMetadata(auth.id, {
      kora_role:      'WORKER',
      kora_tenant_id: auth.tenantId,
      kora_worker_id: auth.workerId,
      kora_status:    'active',
    });

    if (!authResult.ok) {
      return NextResponse.json({
        ok:      true,
        warning: 'auth_metadata_sync_failed',
        detail:  authResult.error,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
