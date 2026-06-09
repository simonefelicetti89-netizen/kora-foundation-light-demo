// app/api/worker/initiatives/route.ts
// B109: Worker Experience MVP — list published initiatives for the authenticated worker.
//
// PRIVACY CONTRACT:
//   - tenantId and workerId always from session app_metadata — never from body or params
//   - Returns published initiatives only + personal participation status
//   - Never exposes participation rows of OTHER workers
//   - Never exposes private_note (worker-only field handled client-side from own row)
//
// Callable by: WORKER only.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { WorkerInitiativeRow, WorkerParticipationRow } from '@/lib/supabase/types';

export type InitiativeWithStatus = {
  id: string;
  title: string;
  description: string | null;
  pillar: WorkerInitiativeRow['pillar'];
  eligibility_class: WorkerInitiativeRow['eligibility_class'];
  start_date: string | null;
  end_date: string | null;
  mode: string | null;
  location: string | null;
  provider: string | null;
  participation_status: WorkerParticipationRow['status'] | null;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  const { tenantId, workerId } = auth;

  const db = getSupabaseServiceClient();

  // Fetch published initiatives for this tenant (service-role bypasses RLS for admin use)
  const { data: initiatives, error: initErr } = await db
    .schema('personal')
    .from('worker_initiative')
    .select('id, title, description, pillar, eligibility_class, start_date, end_date, mode, location, provider')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .order('start_date', { ascending: true, nullsFirst: false });

  if (initErr) {
    return NextResponse.json({ error: 'Errore nel recupero iniziative.' }, { status: 500 });
  }

  if (!initiatives || initiatives.length === 0) {
    return NextResponse.json({ ok: true, initiatives: [] });
  }

  // Fetch this worker's own participation rows — keyed by initiative_id
  const initiativeIds = initiatives.map(i => i.id);
  const { data: participations } = await db
    .schema('personal')
    .from('worker_participation')
    .select('initiative_id, status')
    .eq('worker_id', workerId)
    .in('initiative_id', initiativeIds);

  const participationMap = new Map<string, WorkerParticipationRow['status']>(
    (participations ?? []).map(p => [p.initiative_id as string, p.status as WorkerParticipationRow['status']]),
  );

  const result: InitiativeWithStatus[] = initiatives.map(i => ({
    id: i.id as string,
    title: i.title as string,
    description: i.description as string | null,
    pillar: i.pillar as WorkerInitiativeRow['pillar'],
    eligibility_class: i.eligibility_class as WorkerInitiativeRow['eligibility_class'],
    start_date: i.start_date as string | null,
    end_date: i.end_date as string | null,
    mode: i.mode as string | null,
    location: i.location as string | null,
    provider: i.provider as string | null,
    participation_status: participationMap.get(i.id as string) ?? null,
  }));

  return NextResponse.json({ ok: true, initiatives: result });
}
