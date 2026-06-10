// app/api/admin/partners/[id]/status/route.ts
// B116: Partner status update — KORA_ADMIN only.
//
// PATCH — update partner status (draft → published → archived)
//
// Callable by: KORA_ADMIN only.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['draft', 'published', 'archived'] as const;
type Status = typeof VALID_STATUSES[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const { id: partnerId } = await params;
  if (!partnerId) {
    return NextResponse.json({ error: 'id partner obbligatorio.' }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido.' }, { status: 400 });
  }

  const newStatus = body.status as string | undefined;
  if (!newStatus || !VALID_STATUSES.includes(newStatus as Status)) {
    return NextResponse.json(
      { error: `status deve essere uno di: ${VALID_STATUSES.join(', ')}` },
      { status: 400 },
    );
  }

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('network')
    .from('partner_profile')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', partnerId)
    .select('id, name, status')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Errore nell\'aggiornamento dello status.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, partner: data });
}
