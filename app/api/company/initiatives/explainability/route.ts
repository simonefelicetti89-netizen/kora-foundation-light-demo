// app/api/company/initiatives/explainability/route.ts
// GET /api/company/initiatives/explainability?period=<reporting_period>
//
// Returns per-initiative explainability for the authenticated company tenant.
// Aggregates UEF records by action_family (initiative category) and primary_pillar.
//
// Security:
//   - COMPANY_ADMIN only (requireCompanyUser).
//   - tenantId ALWAYS from session JWT — never from query param.
//   - Returns AGGREGATE counts per initiative category — no raw records, no pseudonym_id.
//   - No worker-level data exposed.
//
// Data source: analytics.uef_record — company-scoped by RLS (kora.tenant_id()).
// Factor trace: available if uef_record has factor_trace column; gracefully absent otherwise.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type InitiativeEligibilityClass = 'eligible' | 'limited' | 'blocked' | 'review_required' | 'unknown';

export interface InitiativeExplainabilityEntry {
  initiativeName:         string;
  pillar:                 string | null;
  eligibilityClass:       InitiativeEligibilityClass;
  eligibilityLabel:       string;
  reason:                 string;
  contributedToKoraIndex: boolean;
  whyNotContributed:      string | null;
  recordCount:            number;
  approvedCount:          number;
  pendingCount:           number;
  blockedCount:           number;
  factorTraceSummary:     string | null;
}

const ELIGIBILITY_LABELS: Record<string, string> = {
  eligible:       'Idonea',
  limited:        'Idonea con limitazioni (BTI)',
  blocked:        'Bloccata',
  review_required: 'In revisione',
  unknown:        'Non classificata',
};

const REASON_MAP: Record<string, string> = {
  eligible:       'L\'iniziativa è idonea e contribuisce al calcolo KORA Index.',
  limited:        'L\'iniziativa è classificata come economic relief o fringe benefit — tracciata nel BTI Engine ma non genera Impact Units diretti.',
  blocked:        'L\'iniziativa è bloccata per design: compliance obbligatoria, sicurezza di legge o spese escluse dalla metodologia KORA.',
  review_required: 'L\'iniziativa è in attesa di revisione da KORA Admin. Non ancora conteggiata.',
  unknown:        'Classificazione non disponibile.',
};

function eligibilityFromStatus(status: string): InitiativeEligibilityClass {
  if (['eligible', 'limited', 'blocked', 'review_required'].includes(status)) {
    return status as InitiativeEligibilityClass;
  }
  if (status === 'approved_for_scoring') return 'eligible';
  if (status === 'approved_for_bti_governance') return 'limited';
  if (status === 'blocked_by_design') return 'blocked';
  if (status === 'pending') return 'review_required';
  return 'unknown';
}

function contributesToKoraIndex(cls: InitiativeEligibilityClass, approvedCount: number): boolean {
  return cls === 'eligible' && approvedCount > 0;
}

function whyNotContributed(cls: InitiativeEligibilityClass, approvedCount: number): string | null {
  if (cls === 'eligible' && approvedCount > 0) return null;
  if (cls === 'eligible' && approvedCount === 0) return 'Record idoneo ma nessuna UEF approvata per questo periodo.';
  if (cls === 'limited')       return 'Le iniziative limited contribuiscono al BTI Engine, non al KORA Index direttamente.';
  if (cls === 'blocked')       return 'Compliance obbligatoria o spesa esclusa — 0 Impact Units per progettazione.';
  if (cls === 'review_required') return 'In attesa di revisione KORA Admin — non ancora conteggiata.';
  return 'Classificazione non disponibile.';
}

export async function GET(request: NextRequest) {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  if (auth.koraRole !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'COMPANY_ADMIN richiesto per accedere all\'explainability delle iniziative.' }, { status: 403 });
  }

  const period = new URL(request.url).searchParams.get('period');
  const db = await getSupabaseServerClient();

  // Query analytics.uef_record — RLS filters by kora.tenant_id().
  // Belt-and-suspenders: also filter by auth.tenantId from JWT.
  // Select only aggregate-safe fields — no worker identity fields selected.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db.schema('analytics') as any)
    .from('uef_record')
    .select('action_family, primary_pillar, eligibility_status, review_status')
    .eq('tenant_id', auth.tenantId);

  if (period) {
    q = q.eq('reporting_period', period);
  }

  const { data: rows, error } = await q;

  if (error) {
    // Graceful fallback: if view/table is inaccessible (RLS or missing), return structured empty.
    return NextResponse.json({
      ok:        false,
      error:     'Dati di explainability non disponibili per questo tenant. Le iniziative saranno visibili dopo la revisione UEF.',
      fallback:  true,
      hint:      'I dettagli per iniziativa diventeranno disponibili una volta che KORA Admin avrà approvato le UEF candidate.',
    }, { status: 200 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({
      ok:           true,
      initiatives:  [],
      total:        0,
      period:       period,
      note:         'Nessuna iniziativa trovata per questo tenant nel periodo richiesto.',
      noDataReason: 'Le iniziative compariranno qui dopo che KORA Admin avrà elaborato e approvato le tue UEF candidate.',
    });
  }

  // Aggregate by action_family + primary_pillar
  const byKey = new Map<string, {
    pillar:         string | null;
    eligCounts:     Record<string, number>;
    reviewCounts:   Record<string, number>;
    total:          number;
  }>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of rows as any[]) {
    const name   = (row['action_family'] as string | null) ?? 'Iniziativa non classificata';
    const pillar = (row['primary_pillar'] as string | null) ?? null;
    const elig   = (row['eligibility_status'] as string | null) ?? 'unknown';
    const rev    = (row['review_status'] as string | null) ?? 'unknown';
    const key    = `${name}|${pillar ?? ''}`;

    const entry = byKey.get(key) ?? { pillar, eligCounts: {}, reviewCounts: {}, total: 0 };
    entry.eligCounts[elig]  = (entry.eligCounts[elig]  ?? 0) + 1;
    entry.reviewCounts[rev] = (entry.reviewCounts[rev] ?? 0) + 1;
    entry.total++;
    byKey.set(key, entry);
  }

  const initiatives: InitiativeExplainabilityEntry[] = [...byKey.entries()].map(([key, v]) => {
    const name = key.split('|')[0];

    // Dominant eligibility class (most common)
    const dominantElig = Object.entries(v.eligCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
    const cls           = eligibilityFromStatus(dominantElig);

    const approvedCount = (v.reviewCounts['approved_for_scoring'] ?? 0)
      + (v.reviewCounts['approved_for_impact_units'] ?? 0);
    const pendingCount  = v.reviewCounts['pending'] ?? 0;
    const blockedCount  = (v.eligCounts['blocked'] ?? 0) + (v.reviewCounts['blocked_by_design'] ?? 0);

    const contributed = contributesToKoraIndex(cls, approvedCount);

    return {
      initiativeName:         name,
      pillar:                 v.pillar,
      eligibilityClass:       cls,
      eligibilityLabel:       ELIGIBILITY_LABELS[cls] ?? cls,
      reason:                 REASON_MAP[cls] ?? 'Classificazione non disponibile.',
      contributedToKoraIndex: contributed,
      whyNotContributed:      whyNotContributed(cls, approvedCount),
      recordCount:            v.total,
      approvedCount,
      pendingCount,
      blockedCount,
      factorTraceSummary:     null, // factor_trace requires migration — not yet available in company-facing view
    };
  });

  // Sort: eligible first, then limited, review_required, blocked, unknown
  const ORDER: Record<InitiativeEligibilityClass, number> = {
    eligible: 0, limited: 1, review_required: 2, blocked: 3, unknown: 4,
  };
  initiatives.sort((a, b) => (ORDER[a.eligibilityClass] ?? 5) - (ORDER[b.eligibilityClass] ?? 5));

  return NextResponse.json({
    ok:          true,
    initiatives,
    total:       initiatives.length,
    period:      period,
    note:        'Aggregato per categoria iniziativa — nessun dato individuale incluso.',
    privacyNote: 'Dati aggregati per categoria. Nessuna informazione individuale sui lavoratori.',
    methodologyNote: 'Le iniziative "eligible" con UEF approvate contribuiscono al KORA Index. Le "limited" contribuiscono al BTI Engine.',
  });
}
