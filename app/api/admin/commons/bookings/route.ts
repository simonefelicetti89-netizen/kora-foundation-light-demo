// app/api/admin/commons/bookings/route.ts
// B166: GET /api/admin/commons/bookings — lista pending per KORA_ADMIN.
//
// Auth: KORA_ADMIN JWT (requireKoraAdmin).
// Ritorna tutte le booking pending (da moderare), con post_tenant_id e worker_tenant_id
// ma MAI worker_identity_id (non serve per moderazione aggregata).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { listPendingForModeration, listBookingsForModeration } from '@/services/commons/BookingService';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const scope  = request.nextUrl.searchParams.get('scope');   // 'all' → tutte le prenotazioni
  const status = request.nextUrl.searchParams.get('status');  // filtro per singolo status

  const db = await getSupabaseServerClient();

  // scope=all oppure status=<value> → usa listBookingsForModeration con filtro opzionale
  if (scope === 'all' || (status && status !== 'pending')) {
    const bookings = await listBookingsForModeration({
      db,
      status: scope === 'all' ? null : status,
    });
    return NextResponse.json({ ok: true, bookings, count: bookings.length });
  }

  // Default: pending only (backward-compatible — non rompe AdminBookingModerationSection v1)
  const pending = await listPendingForModeration({ db });
  return NextResponse.json({ ok: true, bookings: pending, count: pending.length });
}
