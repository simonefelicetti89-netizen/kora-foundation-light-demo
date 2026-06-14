// app/api/company/workers/activation-aggregate/route.ts
// B109: Worker Experience MVP — company-facing participation aggregate.
// B109-B: Hardening — replaced -1 sentinel with structured suppression object;
//         added suppression_reason and suppression_threshold; response shape standardized.
//
// PRIVACY CONTRACT (absolute, non-negotiable):
//   - Returns ONLY aggregate counts — never individual rows
//   - Participation select: initiative_id + status only — no worker_id, no auth fields, no notes
//   - Suppressed segments use { suppressed: true, suppression_reason, suppression_threshold }
//     and OMIT total_participations entirely — no -1 sentinel that leaks "some data exists"
//   - SAFE_AGGREGATION_THRESHOLD=10 applied to pillar-level and global totals
//   - Uses service-role client — company JWT has no direct policy on personal schema
//   - tenantId always from session app_metadata — never from request params
//
// Callable by: COMPANY_ADMIN (own tenant only) — B143: COMPANY_VIEWER rimosso.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { WorkerInitiativeRow, WorkerParticipationRow } from '@/lib/supabase/types';

const SAFE_AGGREGATION_THRESHOLD = 10;

// Suppressed pillar: total_participations is absent — omitting it is safer
// than returning -1 which signals "some participation exists below threshold".
type PillarAggregateClear = {
  pillar: WorkerInitiativeRow['pillar'];
  published_initiatives: number;
  suppressed: false;
  total_participations: number;
};

type PillarAggregateSuppressed = {
  pillar: WorkerInitiativeRow['pillar'];
  published_initiatives: number;
  suppressed: true;
  suppression_reason: 'privacy_threshold';
  suppression_threshold: typeof SAFE_AGGREGATION_THRESHOLD;
};

type PillarAggregate = PillarAggregateClear | PillarAggregateSuppressed;

type CountOrSuppressed =
  | { suppressed: false; value: number }
  | { suppressed: true; suppression_reason: 'privacy_threshold'; suppression_threshold: number };

function safeCount(n: number): CountOrSuppressed {
  if (n > 0 && n < SAFE_AGGREGATION_THRESHOLD) {
    return { suppressed: true, suppression_reason: 'privacy_threshold', suppression_threshold: SAFE_AGGREGATION_THRESHOLD };
  }
  return { suppressed: false, value: n };
}

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
        participation_summary: { suppressed: false, value: 0 },
        pillar_breakdown: [],
        privacy_note: 'Nessuna iniziativa pubblicata. Nessun dato individuale incluso.',
      },
    });
  }

  const initiativeIds = initiativeRows.map(i => i.id);

  // Fetch participation counts — initiative_id + status ONLY.
  // No worker_id, no private_note, no auth fields, no timestamps, no display data.
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
  const partByInit = new Map<string, WorkerParticipationRow['status'][]>();
  for (const p of participationRows) {
    const existing = partByInit.get(p.initiative_id) ?? [];
    existing.push(p.status as WorkerParticipationRow['status']);
    partByInit.set(p.initiative_id, existing);
  }

  // Aggregate by pillar
  const pillarMap = new Map<string, { initiatives: string[]; statuses: WorkerParticipationRow['status'][] }>();
  for (const init of initiativeRows) {
    const entry = pillarMap.get(init.pillar) ?? { initiatives: [], statuses: [] };
    entry.initiatives.push(init.id);
    entry.statuses.push(...(partByInit.get(init.id) ?? []));
    pillarMap.set(init.pillar, entry);
  }

  const pillarBreakdown: PillarAggregate[] = [];
  for (const [pillar, data] of pillarMap.entries()) {
    const count = data.statuses.length;
    const isSuppressed = count > 0 && count < SAFE_AGGREGATION_THRESHOLD;

    if (isSuppressed) {
      pillarBreakdown.push({
        pillar: pillar as WorkerInitiativeRow['pillar'],
        published_initiatives: data.initiatives.length,
        suppressed: true,
        suppression_reason: 'privacy_threshold',
        suppression_threshold: SAFE_AGGREGATION_THRESHOLD,
      });
    } else {
      pillarBreakdown.push({
        pillar: pillar as WorkerInitiativeRow['pillar'],
        published_initiatives: data.initiatives.length,
        suppressed: false,
        total_participations: count,
      });
    }
  }

  // Global engagement summary (interested + registered + attended combined)
  const totalEngagements = participationRows.filter(
    p => p.status === 'interested' || p.status === 'registered' || p.status === 'attended',
  ).length;

  return NextResponse.json({
    ok: true,
    aggregate: {
      total_published_initiatives: totalPublished,
      participation_summary: safeCount(totalEngagements),
      pillar_breakdown: pillarBreakdown,
      privacy_note: `Conteggi inferiori a ${SAFE_AGGREGATION_THRESHOLD} sono soppressi per privacy. Nessun dato individuale incluso.`,
    },
  });
}
