// app/api/worker/commons/bookings/route.ts
// B166: GET (le mie prenotazioni) + POST (crea prenotazione cross_company).
//
// Auth: WORKER JWT — getSupabaseServerClient (B163 pattern, mai service-client).
// Privacy: worker vede solo le proprie booking (RLS mig 025).
// Anonimato: worker_identity_id NON è restituito in GET (solo post_id, status, date).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { createBooking, listMyBookings } from '@/services/commons/BookingService';
import { assertSameOrigin } from '@/lib/security/origin';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const db = await getSupabaseServerClient();

  // Resolve worker_identity_id from worker JWT
  const { data: identity } = await (db as any)
    .schema('personal')
    .from('worker_identity')
    .select('id')
    .eq('auth_user_id', auth.id)
    .maybeSingle();

  if (!identity) return NextResponse.json({ ok: true, bookings: [] });

  const bookings = await listMyBookings({ db, workerIdentityId: identity.id });

  // Rimuovi worker_identity_id dalla risposta (non necessario per il worker stesso)
  const safeBookings = bookings.map(({ worker_identity_id: _wid, ...rest }) => rest);

  return NextResponse.json({ ok: true, bookings: safeBookings });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo non valido.' }, { status: 400 });
  }

  const postId = typeof body.post_id === 'string' ? body.post_id.trim() : '';
  if (!postId) return NextResponse.json({ ok: false, error: 'post_id obbligatorio.' }, { status: 400 });

  const db = await getSupabaseServerClient();

  // Resolve worker_identity_id
  const { data: identity } = await (db as any)
    .schema('personal')
    .from('worker_identity')
    .select('id')
    .eq('auth_user_id', auth.id)
    .maybeSingle();

  if (!identity) return NextResponse.json({ ok: false, error: 'Identità worker non trovata.' }, { status: 403 });

  const result = await createBooking({
    db,
    workerIdentityId: identity.id,
    workerTenantId:   auth.tenantId,
    postId,
  });

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });

  const { worker_identity_id: _wid, ...safeBooking } = result.booking;
  return NextResponse.json({ ok: true, booking: safeBooking }, { status: 201 });
}
