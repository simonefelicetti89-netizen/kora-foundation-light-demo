// app/api/admin/trial-readiness/route.ts
// B123: Trial readiness — KORA_ADMIN only, read-only aggregate endpoint.
//
// Aggregates all trial state in one response:
//   analytics.tenant              → tenant list
//   analytics.source_batch        → last upload per tenant
//   analytics.uef_record          → UEF counts per batch
//   analytics.kora_index_result   → last scoring per tenant
//   analytics.decision_pack_version → decision pack per tenant
//   personal.worker_identity      → worker counts per tenant (status only)
//   personal.worker_profile_private → onboarding completion per tenant
//   personal.worker_initiative    → initiative counts per tenant
//   network.partner_profile       → global partner catalog counts
//
// Privacy contract:
//   - Never returns worker emails, worker_id, worker_ref, or private_note
//   - Only aggregate counts and status flags
//   - No individual UEF or participation rows

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export type TrialReadinessLevel = 'READY' | 'PARTIAL' | 'NOT_STARTED';

export interface TenantTrialStatus {
  tenantId:    string;
  tenantCode:  string;
  companyName: string;
  isActive:    boolean;

  pipeline: {
    lastBatchAt:          string | null;
    uploadedRecords:      number;
    uefCandidates:        number;
    uefApproved:          number;
    scoringReadiness:     string;
    hasKoraIndex:         boolean;
    lastKoraIndex:        number | null;
    lastConfidenceScore:  number | null;
    lastSafeguardStatus:  string | null;
    hasDecisionPack:      boolean;
    decisionPackStatus:   string | null;
    wallboardReady:       boolean;
  };

  workers: {
    total:              number;
    active:             number;
    invited:            number;
    onboardingComplete: number;
  };

  initiatives: {
    total:     number;
    published: number;
    draft:     number;
    closed:    number;
  };

  readiness:  TrialReadinessLevel;
  warnings:   string[];
}

export interface PartnerCatalogStatus {
  total:     number;
  published: number;
  draft:     number;
  archived:  number;
}

export interface TrialReadinessResponse {
  ok:        true;
  asOf:      string;
  tenants:   TenantTrialStatus[];
  partners:  PartnerCatalogStatus;
  summary: {
    totalTenants:   number;
    readyTenants:   number;
    partialTenants: number;
  };
  globalWarnings: string[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const db = getSupabaseServiceClient();

  // ── 1. Active tenants ────────────────────────────────────────────────────────
  const { data: tenantRows, error: tErr } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, company_name, is_active')
    .order('tenant_code');

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  const tenants = (tenantRows ?? []) as Array<{
    id: string; tenant_code: string; company_name: string; is_active: boolean;
  }>;

  const tenantIds = tenants.map(t => t.id);

  // ── 2. Pipeline data — fetch in parallel ─────────────────────────────────────
  const [
    batchRes, uefRes, kiRes, dpRes,
    workerRes, profileRes, initiativeRes, partnerRes,
  ] = await Promise.all([
    // last source_batch per tenant
    tenantIds.length > 0
      ? db.schema('analytics').from('source_batch')
          .select('tenant_id, id, status, reporting_period, created_at')
          .in('tenant_id', tenantIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),

    // uef_record counts per batch
    tenantIds.length > 0
      ? db.schema('analytics').from('uef_record')
          .select('tenant_id, review_status')
          .in('tenant_id', tenantIds)
      : Promise.resolve({ data: [], error: null }),

    // last kora_index_result per tenant
    tenantIds.length > 0
      ? db.schema('analytics').from('kora_index_result')
          .select('tenant_id, kora_index_value, confidence_score, safeguard_status, created_at')
          .in('tenant_id', tenantIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),

    // last decision_pack_version per tenant
    tenantIds.length > 0
      ? db.schema('analytics').from('decision_pack_version')
          .select('tenant_id, version_id, status, created_at')
          .in('tenant_id', tenantIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),

    // worker_identity counts per tenant (status only — no emails/refs)
    tenantIds.length > 0
      ? db.schema('personal').from('worker_identity')
          .select('tenant_id, status')
          .in('tenant_id', tenantIds)
      : Promise.resolve({ data: [], error: null }),

    // worker_profile_private onboarding status per tenant
    tenantIds.length > 0
      ? db.schema('personal').from('worker_profile_private')
          .select('tenant_id, onboarding_completed_at')
          .in('tenant_id', tenantIds)
      : Promise.resolve({ data: [], error: null }),

    // worker_initiative counts per tenant
    tenantIds.length > 0
      ? db.schema('personal').from('worker_initiative')
          .select('tenant_id, status')
          .in('tenant_id', tenantIds)
      : Promise.resolve({ data: [], error: null }),

    // partner_profile — global, not per-tenant
    db.schema('network').from('partner_profile')
      .select('status'),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batches        = (batchRes.data  ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uefRows        = (uefRes.data    ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kiRows         = (kiRes.data     ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dpRows         = (dpRes.data     ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workerRows     = (workerRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileRows    = (profileRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initRows       = (initiativeRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partnerRows    = (partnerRes.data ?? []) as any[];

  // ── 3. Partner catalog summary (global) ──────────────────────────────────────
  const partners: PartnerCatalogStatus = {
    total:     partnerRows.length,
    published: partnerRows.filter((p: { status: string }) => p.status === 'published').length,
    draft:     partnerRows.filter((p: { status: string }) => p.status === 'draft').length,
    archived:  partnerRows.filter((p: { status: string }) => p.status === 'archived').length,
  };

  // ── 4. Build per-tenant status ────────────────────────────────────────────────
  const result: TenantTrialStatus[] = [];

  for (const t of tenants) {
    const tid = t.id;

    // Last batch
    const lastBatch = batches.find(b => b.tenant_id === tid) ?? null;

    // UEF counts (all time for this tenant)
    const tenantUef      = uefRows.filter((u: { tenant_id: string }) => u.tenant_id === tid);
    const uefCandidates  = tenantUef.length;
    const uefApproved    = tenantUef.filter((u: { review_status: string }) => u.review_status === 'approved').length;

    // Last scoring
    const lastKi = kiRows.find(k => k.tenant_id === tid) ?? null;

    // Last decision pack
    const lastDp = dpRows.find(d => d.tenant_id === tid) ?? null;

    // Wallboard: ready if KORA Index exists and safeguard is CLEAR or WARNING
    const wallboardReady = lastKi !== null &&
      ['CLEAR', 'WARNING'].includes(lastKi.safeguard_status ?? '');

    // Worker counts (aggregate only)
    const tenantWorkers = workerRows.filter((w: { tenant_id: string }) => w.tenant_id === tid);
    const workerTotal   = tenantWorkers.length;
    const workerActive  = tenantWorkers.filter((w: { status: string }) => w.status === 'active').length;
    const workerInvited = tenantWorkers.filter((w: { status: string }) => w.status === 'invited').length;

    // Onboarding count
    const tenantProfiles = profileRows.filter((p: { tenant_id: string }) => p.tenant_id === tid);
    const onboardingComplete = tenantProfiles.filter(
      (p: { onboarding_completed_at: string | null }) => p.onboarding_completed_at !== null
    ).length;

    // Initiative counts
    const tenantInits  = initRows.filter((i: { tenant_id: string }) => i.tenant_id === tid);
    const initTotal    = tenantInits.length;
    const initPublished = tenantInits.filter((i: { status: string }) => i.status === 'published').length;
    const initDraft    = tenantInits.filter((i: { status: string }) => i.status === 'draft').length;
    const initClosed   = tenantInits.filter((i: { status: string }) => i.status === 'closed').length;

    // Scoring readiness
    let scoringReadiness = 'NO_DATA';
    if (!lastBatch) {
      scoringReadiness = 'NO_BATCH';
    } else if (uefApproved > 0) {
      scoringReadiness = 'READY';
    } else if (uefCandidates > 0) {
      scoringReadiness = 'NEEDS_REVIEW';
    } else {
      scoringReadiness = 'NO_DATA';
    }

    // Warnings
    const warnings: string[] = [];
    if (!lastBatch) warnings.push('Nessun upload dati effettuato');
    if (uefCandidates > 0 && uefApproved === 0) warnings.push(`${uefCandidates} UEF in attesa di approvazione`);
    if (workerTotal === 0) warnings.push('Nessun worker provisionato');
    if (workerTotal > 0 && workerActive === 0) warnings.push('Nessun worker attivo (tutti invited/pending)');
    if (initPublished === 0) warnings.push('Nessuna iniziativa pubblicata');
    if (!lastKi) warnings.push('Scoring non ancora eseguito');
    if (lastKi && !lastDp) warnings.push('Decision Pack non ancora generato');

    // Readiness level
    let readiness: TrialReadinessLevel = 'NOT_STARTED';
    if (lastKi && lastDp && workerActive > 0) {
      readiness = 'READY';
    } else if (lastBatch || workerTotal > 0 || initTotal > 0) {
      readiness = 'PARTIAL';
    }

    result.push({
      tenantId:    tid,
      tenantCode:  t.tenant_code,
      companyName: t.company_name,
      isActive:    t.is_active,
      pipeline: {
        lastBatchAt:         lastBatch?.created_at ?? null,
        uploadedRecords:     0,
        uefCandidates,
        uefApproved,
        scoringReadiness,
        hasKoraIndex:        lastKi !== null,
        lastKoraIndex:       lastKi?.kora_index_value ?? null,
        lastConfidenceScore: lastKi?.confidence_score ?? null,
        lastSafeguardStatus: lastKi?.safeguard_status ?? null,
        hasDecisionPack:     lastDp !== null,
        decisionPackStatus:  lastDp?.status ?? null,
        wallboardReady,
      },
      workers: {
        total:              workerTotal,
        active:             workerActive,
        invited:            workerInvited,
        onboardingComplete,
      },
      initiatives: {
        total:     initTotal,
        published: initPublished,
        draft:     initDraft,
        closed:    initClosed,
      },
      readiness,
      warnings,
    });
  }

  // ── 5. Global warnings ────────────────────────────────────────────────────────
  const globalWarnings: string[] = [];
  if (tenants.length === 0) globalWarnings.push('Nessun tenant attivo trovato — crea un tenant via /admin/companies');
  if (partners.published === 0) globalWarnings.push('Nessun partner pubblicato — il catalogo opportunità appare vuoto ai worker');

  const readyCount   = result.filter(r => r.readiness === 'READY').length;
  const partialCount = result.filter(r => r.readiness === 'PARTIAL').length;

  const body: TrialReadinessResponse = {
    ok:      true,
    asOf:    new Date().toISOString(),
    tenants: result,
    partners,
    summary: {
      totalTenants:   tenants.length,
      readyTenants:   readyCount,
      partialTenants: partialCount,
    },
    globalWarnings,
  };

  return NextResponse.json(body);
}
