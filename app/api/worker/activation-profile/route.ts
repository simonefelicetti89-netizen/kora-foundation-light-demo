// app/api/worker/activation-profile/route.ts
// B111: Worker Private Activation Profile — PIB Light.
//
// Computes a private activation profile for the authenticated worker,
// based solely on their own participation records and pillar coverage.
//
// PRIVACY CONTRACT (absolute, non-negotiable):
//   - workerId and tenantId ALWAYS from session — never from query params or body
//   - Returns ONLY data for this worker — never exposes other workers' data
//   - No employer-visible fields — this route requires WORKER role
//   - cancelled status does NOT contribute to active engagement counts
//   - attended only counted when set by admin/system (not self-declared)
//   - No score, no ranking, no percentile, no comparison with other workers
//   - privacyNotice and interpretationNote are non-suppressible in the response
//
// Callable by: WORKER only.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

const ALL_PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
type PillarCode = typeof ALL_PILLARS[number];

export type PillarDistributionEntry = {
  pillar: PillarCode;
  interested: number;
  registered: number;
  attended: number;
  cancelled: number;
  total_active: number; // interested + registered + attended (cancelled excluded)
};

export type WorkerActivationProfile = {
  profileStatus: 'empty' | 'active';
  pillarDistribution: PillarDistributionEntry[];
  activitySummary: {
    total_interested: number;
    total_registered: number;
    total_attended: number;
    total_cancelled: number;
    last_activity_at: string | null;
  };
  strongestPillar: PillarCode | null;
  emergingPillar: PillarCode | null;
  missingPillars: PillarCode[];
  lastActivityAt: string | null;
  privacyNotice: string;
  interpretationNote: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  // workerId and tenantId from session only — never from query params or body
  const { workerId } = auth;

  const db = getSupabaseServiceClient();

  // Fetch all participation rows for this worker, joined with initiative pillar
  const { data: rows, error } = await db
    .schema('personal')
    .from('worker_participation')
    .select(`
      status,
      updated_at,
      worker_initiative:initiative_id (
        pillar
      )
    `)
    .eq('worker_id', workerId);

  if (error) {
    return NextResponse.json(
      { error: 'Errore nel recupero del profilo di attivazione.' },
      { status: 500 },
    );
  }

  const participationRows = (rows ?? []) as Array<{
    status: string;
    updated_at: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worker_initiative: any;
  }>;

  // Build pillar counters for all 5 pillars (initialise to zero)
  const pillarCounters: Record<PillarCode, {
    interested: number; registered: number; attended: number; cancelled: number;
  }> = {
    LIFE:       { interested: 0, registered: 0, attended: 0, cancelled: 0 },
    GROWTH:     { interested: 0, registered: 0, attended: 0, cancelled: 0 },
    CONNECTION: { interested: 0, registered: 0, attended: 0, cancelled: 0 },
    IMPACT:     { interested: 0, registered: 0, attended: 0, cancelled: 0 },
    LEGACY:     { interested: 0, registered: 0, attended: 0, cancelled: 0 },
  };

  let lastActivityAt: string | null = null;

  for (const row of participationRows) {
    const pillar = (row.worker_initiative?.pillar as PillarCode | undefined);
    if (!pillar || !pillarCounters[pillar]) continue;

    const status = row.status as string;
    if (status === 'interested')  pillarCounters[pillar].interested++;
    else if (status === 'registered') pillarCounters[pillar].registered++;
    else if (status === 'attended')   pillarCounters[pillar].attended++;
    else if (status === 'cancelled')  pillarCounters[pillar].cancelled++;

    // Track last activity — any status including cancelled updates last_activity_at
    if (!lastActivityAt || row.updated_at > lastActivityAt) {
      lastActivityAt = row.updated_at;
    }
  }

  // Build pillar distribution array (all 5 pillars, including zeroes)
  const pillarDistribution: PillarDistributionEntry[] = ALL_PILLARS.map(pillar => {
    const c = pillarCounters[pillar];
    return {
      pillar,
      interested:   c.interested,
      registered:   c.registered,
      attended:     c.attended,
      cancelled:    c.cancelled,
      // cancelled does NOT count as active engagement
      total_active: c.interested + c.registered + c.attended,
    };
  });

  // Activity summary across all pillars
  const activitySummary = {
    total_interested: pillarDistribution.reduce((sum, p) => sum + p.interested, 0),
    total_registered: pillarDistribution.reduce((sum, p) => sum + p.registered, 0),
    total_attended:   pillarDistribution.reduce((sum, p) => sum + p.attended, 0),
    total_cancelled:  pillarDistribution.reduce((sum, p) => sum + p.cancelled, 0),
    last_activity_at: lastActivityAt,
  };

  const profileStatus: 'empty' | 'active' =
    activitySummary.total_interested +
    activitySummary.total_registered +
    activitySummary.total_attended === 0
      ? 'empty'
      : 'active';

  // Strongest pillar: max total_active (null if all zero)
  const activePillars = pillarDistribution.filter(p => p.total_active > 0);
  let strongestPillar: PillarCode | null = null;
  if (activePillars.length > 0) {
    strongestPillar = activePillars.reduce((best, p) =>
      p.total_active > best.total_active ? p : best,
    ).pillar;
  }

  // Emerging pillar: active but NOT the strongest; lowest total_active > 0
  let emergingPillar: PillarCode | null = null;
  const nonStrongest = activePillars.filter(p => p.pillar !== strongestPillar);
  if (nonStrongest.length > 0) {
    emergingPillar = nonStrongest.reduce((candidate, p) =>
      p.total_active < candidate.total_active ? p : candidate,
    ).pillar;
  }

  // Missing pillars: no active engagement (cancelled-only or truly absent)
  const missingPillars: PillarCode[] = pillarDistribution
    .filter(p => p.total_active === 0)
    .map(p => p.pillar);

  const profile: WorkerActivationProfile = {
    profileStatus,
    pillarDistribution,
    activitySummary,
    strongestPillar,
    emergingPillar,
    missingPillars,
    lastActivityAt,
    // Non-suppressible privacy and interpretation notes
    privacyNotice:       'Il tuo datore di lavoro non può vedere questo profilo individuale. Solo tu puoi accedere a questi dati.',
    interpretationNote:  'Questo profilo è basato sulle attività registrate in KORA. Non è una valutazione individuale, non genera ranking e non viene condiviso con la tua azienda.',
  };

  return NextResponse.json({ ok: true, profile });
}
