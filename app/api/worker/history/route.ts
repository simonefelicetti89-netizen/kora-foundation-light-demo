// app/api/worker/history/route.ts
// B109: Worker Experience MVP — personal participation history for the authenticated worker.
//
// PRIVACY CONTRACT:
//   - workerId always from session — never from params or body
//   - Returns only this worker's own participation rows joined with initiative details
//   - Never exposes participation rows of other workers
//   - private_note IS returned (worker is the owner of their own note)
//
// Callable by: WORKER only.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { WorkerInitiativeRow, WorkerParticipationRow } from '@/lib/supabase/types';

export type ParticipationHistoryItem = {
  participation_id: string;
  initiative_id: string;
  initiative_title: string;
  pillar: WorkerInitiativeRow['pillar'];
  initiative_status: WorkerInitiativeRow['status'];
  participation_status: WorkerParticipationRow['status'];
  private_note: string | null;
  participated_at: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  const { workerId } = auth;

  const db = getSupabaseServiceClient();

  // Fetch participation rows for this worker, joined with initiative title/pillar
  const { data: rows, error } = await db
    .schema('personal')
    .from('worker_participation')
    .select(`
      id,
      initiative_id,
      status,
      private_note,
      created_at,
      worker_initiative:initiative_id (
        title,
        pillar,
        status
      )
    `)
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Errore nel recupero dello storico.' }, { status: 500 });
  }

  const history: ParticipationHistoryItem[] = (rows ?? []).map(r => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const init = (r.worker_initiative as any) ?? {};
    return {
      participation_id:     r.id as string,
      initiative_id:        r.initiative_id as string,
      initiative_title:     (init.title as string) ?? '—',
      pillar:               (init.pillar as WorkerInitiativeRow['pillar']) ?? 'GROWTH',
      initiative_status:    (init.status as WorkerInitiativeRow['status']) ?? 'published',
      participation_status: r.status as WorkerParticipationRow['status'],
      private_note:         r.private_note as string | null,
      participated_at:      r.created_at as string,
    };
  });

  return NextResponse.json({ ok: true, history });
}
