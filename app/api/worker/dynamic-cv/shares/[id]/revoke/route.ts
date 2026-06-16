// app/api/worker/dynamic-cv/shares/[id]/revoke/route.ts
// B126: PATCH — revoke a specific share link.
//
// Privacy contract:
//   - workerId from session ONLY — [id] is the share record id (uuid), not worker_id
//   - Worker can only revoke their own shares (enforced by worker_id = workerId filter)
//   - No employer, no company, no KORA_ADMIN can reach this route
//   - Sets status = 'revoked' and revoked_at = now()

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  const { workerId } = auth;
  const { id: shareId } = await params;

  if (!shareId || typeof shareId !== 'string') {
    return NextResponse.json({ ok: false, error: 'ID non valido.' }, { status: 400 });
  }

  const db = await getSupabaseServerClient();

  // Difesa in profondità: .eq('worker_id', workerId) mantenuto anche con RLS worker_cv_share_worker_own_all (scrittura).
  // Update only rows where worker_id matches session — no other worker's links can be revoked
  const { error, count } = await db
    .schema('personal')
    .from('worker_cv_share')
    .update({
      status:     'revoked',
      revoked_at: new Date().toISOString(),
    })
    .eq('id', shareId)
    .eq('worker_id', workerId)
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ ok: false, error: 'Impossibile revocare il link.' }, { status: 500 });
  }

  if ((count ?? 0) === 0) {
    return NextResponse.json({ ok: false, error: 'Link non trovato o gia\' revocato.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, revokedAt: new Date().toISOString() });
}
