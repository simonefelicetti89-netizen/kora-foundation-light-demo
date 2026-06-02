// app/api/company/workspace/route.ts
// B36 PART 2 — Company workspace summary — COMPANY_ADMIN / COMPANY_VIEWER only.
//
// GET /api/company/workspace
//
// Tenant is ALWAYS derived from authenticated session (app_metadata.kora_tenant_id).
// NEVER accepts tenantId from query params or request body for company users.
//
// Returns read-only workspace summary:
//   - company name, period, methodology version
//   - KORA Index (if available): value, confidence, safeguard
//   - Reporting readiness: batch count, evidence availability
//   - Decision pack status
//
// NEVER returns:
//   - Individual worker data / pseudonym_id / PIB records
//   - Raw uploaded payload
//   - Storage paths / signed URLs
//   - Admin pipeline controls or links to admin routes
//   - Scoring mutation endpoints

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Tenant from session — never from request
  const authResult = await requireCompanyUser(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { tenantId, koraRole } = authResult;

  const db = getSupabaseServiceClient();

  // ── 1. Tenant info ─────────────────────────────────────────────────────────
  const { data: tenantRow, error: tErr } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, company_name, methodology_version_id, onboarding_status, data_readiness_status, decision_pack_status, is_active, created_at')
    .eq('id', tenantId)
    .maybeSingle();

  if (tErr) return NextResponse.json({ error: 'Errore caricamento workspace.' }, { status: 500 });
  if (!tenantRow) return NextResponse.json({ error: 'Workspace non trovato.' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenantRow as any;

  // ── 2. Workforce baseline ──────────────────────────────────────────────────
  const { data: baselineRow } = await db
    .schema('personal').from('workforce_baseline')
    .select('id, total_workers, reporting_period, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wb = baselineRow as any | null;

  // ── 3. Evidence batch count (safe aggregate — no row content) ──────────────
  const { count: batchCount } = await db
    .schema('analytics').from('source_batch')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .neq('batch_status', 'rejected');

  // ── 4. Scoring result (if available) ──────────────────────────────────────
  const { data: scoringRow } = await db
    .schema('analytics').from('scoring_result')
    .select('id, kora_index_value, confidence_score, safeguard_status, activation_rate, reporting_period, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sr = scoringRow as any | null;

  // ── 5. Decision pack (if available) ───────────────────────────────────────
  const { data: dpRow } = await db
    .schema('analytics').from('decision_pack')
    .select('id, version_id, status, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dp = dpRow as any | null;

  // ── 6. Derive reporting readiness ──────────────────────────────────────────
  const reportingReadiness = {
    hasWorkforceBaseline: !!wb,
    hasEvidenceBatches:   (batchCount ?? 0) > 0,
    batchCount:           batchCount ?? 0,
    hasScoring:           !!sr,
    hasDecisionPack:      !!dp,
    decisionPackStatus:   dp?.status ?? 'not_ready',
    readinessLevel:       sr ? (dp ? 'decision_pack_ready' : 'scored') : (batchCount ?? 0) > 0 ? 'evidence_collected' : 'not_started',
    caveat:               'La readiness rappresenta lo stato operativo del pilot KORA. Non certifica conformità normativa, non è un giudizio ESG, non è audit-grade.',
  } as const;

  // ── 7. Safe KORA Index summary ─────────────────────────────────────────────
  const koraIndexSummary = sr ? {
    koraIndexValue:    sr.kora_index_value as number,
    confidenceScore:   sr.confidence_score as number,
    safeguardStatus:   sr.safeguard_status as string,
    activationRate:    typeof sr.activation_rate === 'number' ? sr.activation_rate : null,
    reportingPeriod:   sr.reporting_period as string,
    methodologyVersion: t.methodology_version_id as string,
    calibrationStatus:  'pre_empirical_calibration' as const,
    // Non-suppressible labels required by doc 21b
    displayLabels: {
      methodology:   t.methodology_version_id as string,
      calibration:   'pre_empirical_calibration',
      disclaimer:    'KORA Foundation Light v0.1 · Dati pilota · Calibrazione pre-empirica. Non audit-grade, non certificazione ESG, non compliance normativa.',
    },
  } : null;

  return NextResponse.json({
    ok:              true,
    role:            koraRole,
    tenant: {
      id:                  tenantId,
      companyName:         t.company_name as string,
      methodologyVersion:  t.methodology_version_id as string,
      calibrationStatus:   'pre_empirical_calibration',
      isActive:            t.is_active as boolean,
    },
    workforceBaseline: wb ? {
      totalWorkers:    wb.total_workers as number,
      reportingPeriod: wb.reporting_period as string,
    } : null,
    koraIndex:         koraIndexSummary,
    reportingReadiness,
    decisionPack: dp ? {
      status:     dp.status as string,
      createdAt:  dp.created_at as string,
      // No direct links to admin routes — company workspace links only
      viewLink:   '/company/workspace',
    } : null,
    // Non-suppressible labels — always present
    methodologyDisclaimer: {
      kora_measures:      'KORA misura le organizzazioni, non gli individui.',
      privacy_guarantee:  'Nessun dato individuale del lavoratore è visibile al datore di lavoro. Soglia privacy N≥10 applicata.',
      no_compliance:      'KORA non certifica conformità normativa e non sostituisce consulenza ESG, legale o fiscale.',
      data_status:        'pre_empirical_calibration — Foundation Light v0.1',
    },
  });
}
