// app/api/worker/dynamic-cv/route.ts
// B121: Dynamic Impact CV Light — assembles a private worker CV from participation history.
//
// PRIVACY CONTRACT (absolute, non-negotiable):
//   - workerId and tenantId ALWAYS from session — never from query params or body
//   - Returns ONLY data for the authenticated worker — no other workers' data
//   - private_note NOT included in CV output (spec: "preferenza: non mostrarle nel CV")
//   - cancelled status does NOT appear as a positive experience
//   - No score, no ranking, no percentile, no comparison with other workers
//   - privacyNotice and interpretationNote are non-suppressible
//   - No employer role can reach this route (requireWorkerUser enforces WORKER role)
//
// Callable by: WORKER only.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { classifyForDynamicCV } from '@/lib/dynamic-cv/dynamic-impact-cv-policy';

// ── Types ─────────────────────────────────────────────────────────────────────

const ALL_PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
type PillarCode = typeof ALL_PILLARS[number];

type ParticipationStatus = 'interested' | 'registered' | 'attended' | 'cancelled';

export type CVExperience = {
  initiative_id:  string;
  title:          string;
  pillar:         PillarCode;
  status:         ParticipationStatus;
  statusLabel:    string;
  date:           string;
  mode:           string | null;
  provider:       string | null;
  cvEligible:     boolean;
  badgeEligible:  boolean;
  shareableByWorker: boolean;
  privateOnly:    boolean;
  cvExcludeReason?: string; // set when not shown in main CV list
};

export type CVPillarEntry = {
  pillar:           PillarCode;
  attended:         number;
  registered:       number;
  interested:       number;
  total_active:     number; // attended + registered + interested (cancelled excluded)
};

export type DynamicCVResponse = {
  ok: true;
  profile: {
    displayName:   string | null;
    roleLabel:     string;
    tenantName:    string;
    preferredLang: string;
  };
  summary: {
    totalActivities:   number; // attended + registered + interested (before policy filter)
    totalAttended:     number;
    totalRegistered:   number;
    totalInterested:   number;
    activePillars:     number;
    lastUpdatedAt:     string | null;
    cvEligibleCount:   number; // items shown in main CV list
    badgeEligibleCount: number;
    excludedCount:     number; // compliance + economic relief + sensitive excluded
    privateOnlyCount:  number;
  };
  pillars:         CVPillarEntry[];
  experiences:     CVExperience[];  // only cvEligible=true items (excluding private_only)
  badgeItems:      CVExperience[];  // badgeEligible=true subset
  privateItems:    CVExperience[];  // privateOnly=true (private section only)
  excludedCount:   number;          // count of sensitiveExcluded + not_cv_relevant
  narrative: {
    headline:       string;
    strengths:      string[];
    emergingAreas:  string[];
    missingPillars: PillarCode[];
  };
  selectivityNote:    string; // "Il Dynamic Impact CV non contiene tutte le Impact Units."
  privacyNotice:      string;
  interpretationNote: string;
};

// ── Status label map ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ParticipationStatus, string> = {
  interested: 'Interesse espresso',
  registered: 'Iscrizione',
  attended:   'Partecipazione registrata',
  cancelled:  'Cancellata',
};

// ── Narrative generation (rule-based, no LLM) ─────────────────────────────────

function buildNarrative(
  pillars: CVPillarEntry[],
  summary: DynamicCVResponse['summary'],
): DynamicCVResponse['narrative'] {
  const activePillars  = pillars.filter(p => p.total_active > 0);
  const missingPillars = pillars.filter(p => p.total_active === 0).map(p => p.pillar);
  const sorted         = [...activePillars].sort((a, b) => b.total_active - a.total_active);

  const strongestPillar = sorted[0]?.pillar ?? null;
  const emergingPillars = sorted.slice(1).filter(p => p.total_active > 0).map(p => p.pillar);

  let headline: string;
  if (summary.totalActivities === 0) {
    headline = 'Il tuo percorso KORA inizia qui. Esplora le iniziative disponibili per costruire il tuo profilo.';
  } else if (strongestPillar) {
    const verb = summary.totalAttended > 0 ? 'con partecipazioni verificate' : 'con attività registrate';
    headline = `Profilo attivo ${verb}, con focus principale su ${strongestPillar}.`;
  } else {
    headline = 'Profilo in costruzione. Completa le prime attività per vedere il tuo percorso.';
  }

  const strengths: string[] = strongestPillar
    ? [`Pillar ${strongestPillar}: area di maggiore coinvolgimento con ${sorted[0]?.total_active ?? 0} attività registrate.`]
    : [];

  const emergingAreas: string[] = emergingPillars.map(p => {
    const entry = pillars.find(x => x.pillar === p);
    return `Pillar ${p}: in esplorazione con ${entry?.total_active ?? 0} attività.`;
  });

  return { headline, strengths, emergingAreas, missingPillars };
}

// ── GET /api/worker/dynamic-cv ────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  // workerId and tenantId from session ONLY — never from request params
  const { workerId, tenantId } = auth;

  // RLS (mig 007): worker_identity_worker_own_select (auth.uid()), worker_profile_worker_own_all (auth.uid()).
  // RLS (mig 022): analytics_tenant_worker_own_read (id = kora.tenant_id()).
  const db = await getSupabaseServerClient();

  // ── 1. Worker identity + profile ──────────────────────────────────────────
  const [{ data: wiRow }, { data: profRow }, { data: tenantRow }] = await Promise.all([
    db.schema('personal').from('worker_identity')
      .select('status, created_at')
      .eq('id', workerId)          // PK lookup — difesa in profondità anche con RLS
      .maybeSingle(),
    db.schema('personal').from('worker_profile_private')
      .select('display_name, preferred_lang')
      .maybeSingle(),              // RLS worker_profile_worker_own_all isola via auth.uid()
    db.schema('analytics').from('tenant')
      .select('company_name')
      .eq('id', tenantId)          // PK lookup — difesa in profondità anche con RLS
      .maybeSingle(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof   = (profRow ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = (tenantRow ?? {}) as any;

  const profile: DynamicCVResponse['profile'] = {
    displayName:   (prof.display_name as string | null) ?? null,
    roleLabel:     'Lavoratore',
    tenantName:    (tenant.company_name as string) ?? '—',
    preferredLang: (prof.preferred_lang as string) ?? 'it',
  };

  // ── 2. Participation history — exclude private_note from CV output ─────────
  // RLS worker_participation_worker_own_all (mig 008) isola via auth.uid() — nessun filtro worker_id.
  // Extend worker_initiative select to include action_family and eligibility_class for policy classification.
  // These fields may not exist on all initiative rows — safe nullish fallback applied below.
  const { data: rows, error } = await db
    .schema('personal')
    .from('worker_participation')
    .select(`
      id,
      initiative_id,
      status,
      updated_at,
      worker_initiative:initiative_id (
        title,
        pillar,
        delivery_mode,
        action_family,
        eligibility_class,
        is_mandatory
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Errore nel recupero del CV.' }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participations = (rows ?? []) as any[];

  // ── 3. Build pillar counters and classify experiences ─────────────────────
  const pillarCounters: Record<PillarCode, {
    attended: number; registered: number; interested: number; cancelled: number;
  }> = {
    LIFE:       { attended: 0, registered: 0, interested: 0, cancelled: 0 },
    GROWTH:     { attended: 0, registered: 0, interested: 0, cancelled: 0 },
    CONNECTION: { attended: 0, registered: 0, interested: 0, cancelled: 0 },
    IMPACT:     { attended: 0, registered: 0, interested: 0, cancelled: 0 },
    LEGACY:     { attended: 0, registered: 0, interested: 0, cancelled: 0 },
  };

  let lastUpdatedAt: string | null = null;
  let totalExcluded = 0;

  const cvExperiences:     CVExperience[] = []; // cvEligible=true, !privateOnly
  const badgeExperiences:  CVExperience[] = []; // badgeEligible=true
  const privateExperiences: CVExperience[] = []; // privateOnly=true

  for (const row of participations) {
    const init   = row.worker_initiative ?? {};
    const pillar = init.pillar as PillarCode | undefined;
    const status = row.status as ParticipationStatus;

    if (!pillar || !pillarCounters[pillar]) continue;

    if (!lastUpdatedAt || row.updated_at > lastUpdatedAt) {
      lastUpdatedAt = row.updated_at as string;
    }

    if (status === 'attended')    pillarCounters[pillar].attended++;
    else if (status === 'registered') pillarCounters[pillar].registered++;
    else if (status === 'interested') pillarCounters[pillar].interested++;
    else if (status === 'cancelled')  pillarCounters[pillar].cancelled++;

    if (status === 'cancelled') continue;

    // Apply Dynamic Impact CV policy classification
    const classification = classifyForDynamicCV({
      eligibility_class: (init.eligibility_class as string | null) ?? null,
      category:          (init.action_family as string | null) ?? (init.title as string) ?? '',
      pillar,
      is_mandatory:      (init.is_mandatory as boolean | undefined) ?? false,
      evidence_level:    status === 'attended' ? 'high' : status === 'registered' ? 'medium' : 'low',
    });

    const exp: CVExperience = {
      initiative_id:    row.initiative_id as string,
      title:            (init.title as string) ?? '—',
      pillar,
      status,
      statusLabel:      STATUS_LABELS[status],
      date:             (row.updated_at as string).slice(0, 10),
      mode:             (init.delivery_mode as string | null) ?? null,
      provider:         null,
      cvEligible:       classification.cvEligible,
      badgeEligible:    classification.badgeEligible,
      shareableByWorker: classification.shareableByWorker,
      privateOnly:      classification.privateOnly,
      cvExcludeReason:  (!classification.cvEligible || classification.sensitiveExcluded)
        ? classification.reason : undefined,
    };

    if (classification.sensitiveExcluded || classification.cvClass === 'not_cv_relevant') {
      totalExcluded++;
      // not added to any experience list
    } else if (classification.privateOnly) {
      privateExperiences.push(exp);
    } else if (classification.cvEligible) {
      cvExperiences.push(exp);
      if (classification.badgeEligible) badgeExperiences.push(exp);
    } else {
      totalExcluded++;
    }
  }

  // ── 4. Pillar distribution (based on total active, before policy filter) ──
  const pillars: CVPillarEntry[] = ALL_PILLARS.map(p => {
    const c = pillarCounters[p];
    return {
      pillar:       p,
      attended:     c.attended,
      registered:   c.registered,
      interested:   c.interested,
      total_active: c.attended + c.registered + c.interested,
    };
  });

  const allActiveCount = cvExperiences.length + privateExperiences.length + totalExcluded;

  // ── 5. Summary ────────────────────────────────────────────────────────────
  const summary: DynamicCVResponse['summary'] = {
    totalActivities:    allActiveCount,
    totalAttended:      pillars.reduce((s, p) => s + p.attended,   0),
    totalRegistered:    pillars.reduce((s, p) => s + p.registered, 0),
    totalInterested:    pillars.reduce((s, p) => s + p.interested, 0),
    activePillars:      pillars.filter(p => p.total_active > 0).length,
    lastUpdatedAt,
    cvEligibleCount:    cvExperiences.length,
    badgeEligibleCount: badgeExperiences.length,
    excludedCount:      totalExcluded,
    privateOnlyCount:   privateExperiences.length,
  };

  // ── 6. Narrative (rule-based, no LLM) ─────────────────────────────────────
  const narrative = buildNarrative(pillars, summary);

  const response: DynamicCVResponse = {
    ok: true,
    profile,
    summary,
    pillars,
    experiences:     cvExperiences,
    badgeItems:      badgeExperiences,
    privateItems:    privateExperiences,
    excludedCount:   totalExcluded,
    narrative,
    selectivityNote:    'Il Dynamic Impact CV non contiene tutte le Impact Units. Mostra solo esperienze selezionabili, verificabili e controllate dal lavoratore.',
    privacyNotice:      'Il Dynamic Impact CV è privato. Il tuo datore di lavoro non vede questo CV. KORA misura l\'organizzazione, non valuta il singolo lavoratore.',
    interpretationNote: 'Questo CV non è un ranking e non contiene confronti con colleghi. Le esperienze derivano dalle attività registrate in KORA.',
  };

  return NextResponse.json(response);
}
