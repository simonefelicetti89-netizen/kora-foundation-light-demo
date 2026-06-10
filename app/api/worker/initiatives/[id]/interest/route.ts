// app/api/worker/initiatives/[id]/interest/route.ts
// B109: Worker Experience MVP — express interest or update participation status.
// B109-B: Hardening — removed attended from worker self-declaration; added private_note max length.
//
// PRIVACY CONTRACT:
//   - workerId and tenantId always from session — NEVER from request body
//   - Any body fields `worker_id` or `tenant_id` are silently ignored
//   - Worker can only modify their OWN participation row (enforced by workerId from session)
//   - private_note is accepted from body — it is worker-controlled, never employer-visible
//   - Initiative must belong to the worker's tenant and be published
//   - attended status is NOT self-declarable: only admin/system can set it (B109-B)
//
// Callable by: WORKER only.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { WorkerParticipationRow } from '@/lib/supabase/types';

// attended is intentionally excluded — workers cannot self-declare attendance.
// Attendance is set only by admin/system flows to prevent gaming.
const ALLOWED_STATUSES: WorkerParticipationRow['status'][] = [
  'interested', 'registered', 'cancelled',
];

// Maximum length for worker private notes — prevents abuse, not a content filter.
const PRIVATE_NOTE_MAX_LENGTH = 500;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  const { tenantId, workerId } = auth;
  const { id: initiativeId } = await params;

  if (!initiativeId) {
    return NextResponse.json({ error: 'Initiative ID obbligatorio.' }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido.' }, { status: 400 });
  }

  // worker_id and tenant_id from body are silently rejected — session-only.
  const status = body.status as WorkerParticipationRow['status'] | undefined;
  const rawNote = body.private_note;
  const privateNote = typeof rawNote === 'string' ? rawNote.slice(0, PRIVATE_NOTE_MAX_LENGTH) : null;

  // Validate note length explicitly after truncation guard
  if (typeof rawNote === 'string' && rawNote.length > PRIVATE_NOTE_MAX_LENGTH) {
    return NextResponse.json(
      { error: `private_note supera il limite massimo di ${PRIVATE_NOTE_MAX_LENGTH} caratteri.` },
      { status: 400 },
    );
  }

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status non valido. Valori accettati: ${ALLOWED_STATUSES.join(', ')}` },
      { status: 400 },
    );
  }

  const db = getSupabaseServiceClient();

  // Verify initiative exists, belongs to worker's tenant, and is published
  const { data: initiative } = await db
    .schema('personal')
    .from('worker_initiative')
    .select('id, status')
    .eq('id', initiativeId)
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .maybeSingle();

  if (!initiative) {
    return NextResponse.json(
      { error: 'Iniziativa non trovata o non disponibile per il tuo tenant.' },
      { status: 404 },
    );
  }

  // Upsert participation — workerId and tenantId from session only
  const { error: upsertErr } = await db
    .schema('personal')
    .from('worker_participation')
    .upsert(
      {
        worker_id: workerId,
        initiative_id: initiativeId,
        tenant_id: tenantId,
        status,
        private_note: privateNote,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'worker_id,initiative_id', ignoreDuplicates: false },
    );

  if (upsertErr) {
    return NextResponse.json({ error: 'Errore nel salvataggio della partecipazione.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    initiativeId,
    status,
    message: 'Partecipazione aggiornata.',
  });
}
