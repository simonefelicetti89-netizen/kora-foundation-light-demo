// app/api/admin/worker-initiatives/[id]/route.ts
// B109: Worker Experience MVP — KORA_ADMIN update initiative status/details.
//
// PATCH — update title, description, status, dates, mode, location, provider
//
// Callable by: KORA_ADMIN only.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { WorkerInitiativeRow } from '@/lib/supabase/types';
import { assertSameOrigin } from '@/lib/security/origin';

const STATUSES: WorkerInitiativeRow['status'][] = ['draft', 'published', 'closed'];
const PILLARS: WorkerInitiativeRow['pillar'][] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Initiative ID obbligatorio.' }, { status: 400 });

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido.' }, { status: 400 });
  }

  // Build update payload — only fields explicitly provided
  const update: Partial<WorkerInitiativeRow> = {};

  if (body.title !== undefined) {
    const t = body.title as string;
    if (!t || t.trim().length < 2) return NextResponse.json({ error: 'title deve avere almeno 2 caratteri.' }, { status: 400 });
    update.title = t.trim();
  }
  if (body.description !== undefined) update.description = (body.description as string | null);
  if (body.status !== undefined) {
    const s = body.status as WorkerInitiativeRow['status'];
    if (!STATUSES.includes(s)) return NextResponse.json({ error: `status non valido. Valori: ${STATUSES.join(', ')}` }, { status: 400 });
    update.status = s;
  }
  if (body.pillar !== undefined) {
    const p = body.pillar as WorkerInitiativeRow['pillar'];
    if (!PILLARS.includes(p)) return NextResponse.json({ error: `pillar non valido.` }, { status: 400 });
    update.pillar = p;
  }
  if (body.start_date !== undefined) update.start_date = (body.start_date as string | null);
  if (body.end_date !== undefined) update.end_date = (body.end_date as string | null);
  if (body.mode !== undefined) update.mode = (body.mode as string | null);
  if (body.location !== undefined) update.location = (body.location as string | null);
  if (body.provider !== undefined) update.provider = (body.provider as string | null);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare.' }, { status: 400 });
  }

  const db = getSupabaseServiceClient();

  const { data: updated, error } = await db
    .schema('personal')
    .from('worker_initiative')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Errore nell\'aggiornamento iniziativa.' }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: 'Iniziativa non trovata.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, initiative: updated });
}
