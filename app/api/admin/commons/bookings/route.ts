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
import { listPendingForModeration } from '@/services/commons/BookingService';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const db = await getSupabaseServerClient();
  const pending = await listPendingForModeration({ db });

  // worker_identity_id non è nel SELECT di listPendingForModeration (non necessario per moderazione)
  return NextResponse.json({ ok: true, bookings: pending, count: pending.length });
}
