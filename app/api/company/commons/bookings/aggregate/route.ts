// app/api/company/commons/bookings/aggregate/route.ts
// B166: GET /api/company/commons/bookings/aggregate?post_id=... — count aggregato per promotrice.
//
// Auth: COMPANY_ADMIN JWT.
// La funzione SECURITY DEFINER booking_aggregate_for_promoter() valida che il
// tenant COMPANY_ADMIN corrisponda al tenant della post. MAI righe individuali.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getAggregateForPromoter } from '@/services/commons/BookingService';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  if (auth.koraRole !== 'COMPANY_ADMIN') {
    return NextResponse.json({ ok: false, error: 'Solo COMPANY_ADMIN può vedere i partecipanti alle proprie iniziative.' }, { status: 403 });
  }

  const postId = request.nextUrl.searchParams.get('post_id') ?? '';
  if (!postId) return NextResponse.json({ ok: false, error: 'post_id obbligatorio.' }, { status: 400 });

  const db = await getSupabaseServerClient();
  const aggregate = await getAggregateForPromoter({ db, postId });

  return NextResponse.json({ ok: true, aggregate });
}
