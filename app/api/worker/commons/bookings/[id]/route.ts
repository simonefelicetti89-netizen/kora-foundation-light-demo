// app/api/worker/commons/bookings/[id]/route.ts
// B166: DELETE /api/worker/commons/bookings/[id] — cancella la propria prenotazione.
//
// Auth: WORKER JWT. La RLS mig 025 garantisce che un worker veda solo le proprie booking.
// Ammessa solo se status ∈ {pending, approved}.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cancelBooking } from '@/services/commons/BookingService';
import { assertSameOrigin } from '@/lib/security/origin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { id: bookingId } = await params;
  const db = await getSupabaseServerClient();

  const result = await cancelBooking({ db, bookingId });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true });
}
