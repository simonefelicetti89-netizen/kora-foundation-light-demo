// app/api/company/workers/activation-aggregate/route.ts
// B109: Worker Experience MVP — company-facing participation aggregate.
//
// PRIVACY CONTRACT (absolute, non-negotiable):
//   - Returns ONLY aggregate counts — never individual rows
//   - No worker_id, no display_name, no email, no worker_ref
//   - No private_note — never accessible by company roles
//   - SAFE_AGGREGATION_THRESHOLD applied: pillar segments with N < 10 suppressed
//   - Uses service-role client — company JWT has no direct policy on personal schema
//   - tenantId always from session app_metadata — never from request params
//
// Callable by: COMPANY_ADMIN, COMPANY_VIEWER (own tenant only).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { WorkerInitiativeRow, WorkerParticipationRow } from '@/lib/supabase/types';

const SAFE_AGGREGATION_THRESHOLD = 10;

type PillarAggregate = {
  pillar: WorkerInitiativeRow['pillar'];
  published_initiatives: number;
  total_participations: number;
  suppressed: boolean;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  const { tenantId } = auth;

  const db = getSupabaseServiceClient();

  // Count published initiatives per pillar for this tenant
  const { data: initiatives, error: initErr } = await db
    .schema('personal')
    .from('worker_initiative')
    .select('id, pillar')
    .eq('tenant_id', tenantId)
    .eq('status', 'published');

  if (initErr) {
    return NextResponse.json({ error: 'Errore nel recupero dati iniziative.' }, { status: 500 });
  }

  const initiativeRows = (initiatives ?? []) as { id: string; pillar: string }[];
  const totalPublished = initiativeRows.length;

  if (totalPublished === 0) {
    return NextResponse.json({
      ok: true,
      aggregate: {
        total_published_initiatives: 0,
        total_interests: 0,
        total_registrations: 0,
        pillar_breakdown: [],
      },
    });
  }

  const initiativeIds = initiativeRows.map(i => i.id);

  // Count participation rows — no PII, no private_note, no worker_id returned
  const { data: participations, error: partErr } = await db
    .schema('personal')
    .from('worker_participation')
    .select('initiative_id, status')
    .in('initiative_id', initiativeIds);

  if (partErr) {
    return NextResponse.json({ error: 'Errore nel recupero dati partecipazione.' }, { status: 500 });
  }

  const participationRows = (participations ?? []) as { initiative_id: string; status: string }[];

  // Build participation lookup by initiative_id
  const partByInit = new Map<string, { status: string }[]>();
  for (const p of participationRows) {
    const existing = partByInit.get(p.initiative_id) ?? [];
    existing.push({ status: p.status });
    partByInit.set(p.initiative_id, existing);
  }

  // Aggregate by pillar
  const pillarMap = new Map<string, { initiatives: string[]; participations: WorkerParticipationRow['status'][] }>();
  for (const init of initiativeRows) {
    const entry = pillarMap.get(init.pillar) ?? { initiatives: [], participations: [] };
    entry.initiatives.push(init.id);
    const parts = partByInit.get(init.id) ?? [];
    entry.participations.push(...(parts.map(p => p.status as WorkerParticipationRow['status'])));
    pillarMap.set(init.pillar, entry);
  }

  const pillarBreakdown: PillarAggregate[] = [];
  for (const [pillar, data] of pillarMap.entries()) {
    const totalParticipations = data.participations.length;
    const suppressed = totalParticipations > 0 && totalParticipations < SAFE_AGGREGATION_THRESHOLD;
    pillarBreakdown.push({
      pillar: pillar as WorkerInitiativeRow['pillar'],
      published_initiatives: data.initiatives.length,
      // Privacy threshold: suppress counts < 10 to prevent re-identification
      total_participations: suppressed ? -1 : totalParticipations,
      suppressed,
    });
  }

  const totalInterests = participationRows.filter(p => p.status === 'interested' || p.status === 'registered').length;
  const totalRegistrations = participationRows.filter(p => p.status === 'registered' || p.status === 'attended').length;

  // Apply threshold to totals as well
  const totalInterestsSafe = totalInterests < SAFE_AGGREGATION_THRESHOLD && totalInterests > 0 ? -1 : totalInterests;
  const totalRegistrationsSafe = totalRegistrations < SAFE_AGGREGATION_THRESHOLD && totalRegistrations > 0 ? -1 : totalRegistrations;

  return NextResponse.json({
    ok: true,
    aggregate: {
      total_published_initiatives: totalPublished,
      total_interests: totalInterestsSafe,
      total_registrations: totalRegistrationsSafe,
      pillar_breakdown: pillarBreakdown,
      privacy_note: 'Conteggi <10 sono soppressi per privacy (SAFE_AGGREGATION_THRESHOLD). Nessun dato individuale incluso.',
    },
  });
}
