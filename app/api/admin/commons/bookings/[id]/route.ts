// app/api/admin/commons/bookings/[id]/route.ts
// B166: PATCH /api/admin/commons/bookings/[id] — moderazione (approve/reject/markAttended).
//
// Auth: KORA_ADMIN JWT.
// action='approve' | 'reject' | 'attended'
// markAttended usa serviceDb per il hook di attribuzione (pattern B164).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import { moderate, markAttended } from '@/services/commons/BookingService';
import { assertSameOrigin } from '@/lib/security/origin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { id: bookingId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo non valido.' }, { status: 400 });
  }

  const action = body.action as string | undefined;
  const notes  = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) || null : null;
  const reportingPeriod = typeof body.reporting_period === 'string' ? body.reporting_period : undefined;

  if (!action || !['approve', 'reject', 'attended'].includes(action)) {
    return NextResponse.json({ ok: false, error: "action obbligatoria: 'approve' | 'reject' | 'attended'." }, { status: 400 });
  }

  const db = await getSupabaseServerClient();

  if (action === 'approve' || action === 'reject') {
    const decision = action === 'approve' ? 'approved' : 'rejected';
    const result   = await moderate({ db, bookingId, decision, notes, adminId: auth.id });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, booking: result.booking });
  }

  // action === 'attended': usa service-role per il hook attribuzione
  const serviceDb = getSupabaseServiceClient();
  const result = await markAttended({
    db, serviceDb, bookingId, adminId: auth.id, reportingPeriod,
  });

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, attribution: result.attribution });
}
