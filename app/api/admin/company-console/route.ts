// app/api/admin/company-console/route.ts
// B37 — KORA Admin Company Console — live tenant registry.
// KORA_ADMIN only. Read-only. No raw payload. No worker data. No PII beyond admin email.
//
// GET /api/admin/company-console
//
// Returns all tenants (active + suspended) enriched with:
//   - company user counts + primary admin email
//   - workforce baseline
//   - latest batch + UEF counts
//   - latest KORA Index (value, confidence, safeguard)
//   - latest decision pack
//   - derived lifecycle status
//   - quick action URLs

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

// ── Lifecycle status derived from available KORA Admin data ───────────────────
// Label: "Lifecycle status is pilot-derived from available KORA Admin data."

export type TenantLifecycleStatus =
  | 'suspended'
  | 'no_users'
  | 'workspace_ready'
  | 'data_pending'
  | 'review_in_progress'
  | 'enrichment_needed'
  | 'scoring_available'
  | 'scored'
  | 'decision_pack_available';

function deriveLifecycleStatus(
  isActive: boolean,
  usersCount: number,
  hasBatch: boolean,
  uef: { total: number; pendingReview: number; approved: number; needsEnrichment: number } | null,
  hasScoring: boolean,
  dpStatus: string | null,
): TenantLifecycleStatus {
  if (!isActive)                                                      return 'suspended';
  if (usersCount === 0)                                               return 'no_users';
  if (!hasBatch)                                                      return 'workspace_ready';
  if (!uef || uef.total === 0)                                        return 'data_pending';
  if (uef.pendingReview > 0)                                          return 'review_in_progress';
  if (uef.needsEnrichment > 0 && uef.pendingReview === 0)             return 'enrichment_needed';
  if (uef.approved > 0 && !hasScoring)                                return 'scoring_available';
  if (hasScoring && (dpStatus === 'ready' || dpStatus === 'exported')) return 'decision_pack_available';
  if (hasScoring)                                                      return 'scored';
  return 'review_in_progress';
}

function deriveEvidenceReadiness(
  hasBatch: boolean,
  uef: { total: number; pendingReview: number; approved: number } | null,
  hasScoring: boolean,
  dpStatus: string | null,
): string {
  if (!hasBatch)                               return 'not_started';
  if (!uef || uef.total === 0)                 return 'incomplete';
  if (uef.pendingReview > 0)                   return 'in_review';
  if (uef.approved > 0 && !hasScoring)         return 'ready_for_scoring';
  if (hasScoring && dpStatus === 'ready')      return 'decision_pack_ready';
  if (hasScoring)                              return 'scored';
  return 'in_review';
}

function warningFlags(
  usersCount: number,
  totalWorkers: number | null,
  uef: { total: number; pendingReview: number; approved: number; needsEnrichment: number } | null,
  hasScoring: boolean,
  isActive: boolean,
): string[] {
  const flags: string[] = [];
  if (!isActive)                                flags.push('tenant_suspended');
  if (usersCount === 0)                         flags.push('no_company_users');
  if (totalWorkers !== null && totalWorkers < 10) flags.push('below_privacy_threshold');
  if (uef && uef.pendingReview > 5)             flags.push('review_backlog');
  if (uef && uef.needsEnrichment > 0)           flags.push('enrichment_required');
  if (!hasScoring && uef && uef.approved > 0)   flags.push('scoring_pending');
  return flags;
}

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const db = getSupabaseServiceClient();

  // ── 1. LIVE tenants only (active + suspended — excludes DEMO/TEST/SANDBOX) ──
  // B131: tenant_kind = 'LIVE' is the canonical filter for the live registry.
  // Suspended LIVE tenants are still shown so admins can manage them.
  const { data: tenantRows, error: tenantErr } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, company_name, is_active, methodology_version_id, created_at, onboarding_status, data_readiness_status, decision_pack_status')
    .eq('tenant_kind', 'LIVE')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenants = (tenantRows ?? []) as any[];

  if (tenants.length === 0) {
    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      summary: { total: 0, active: 0, suspended: 0, scored: 0, decisionPackReady: 0, needsAction: 0 },
      tenants: [],
      caveat: 'Lifecycle status is pilot-derived from available KORA Admin data.',
    });
  }

  const tenantIds = tenants.map((t) => t.id as string);

  // ── 2. Company users — count + primary admin email per tenant ──────────────
  const usersByTenant: Record<string, { count: number; adminEmail: string | null }> = {};
  try {
    const { data: usersData } = await db.auth.admin.listUsers({ perPage: 1000 });
    for (const user of usersData?.users ?? []) {
      const meta = user.app_metadata as Record<string, unknown> | undefined;
      const tenantId = meta?.kora_tenant_id as string | undefined;
      const role     = meta?.kora_role as string | undefined;
      if (tenantId && role === 'COMPANY_ADMIN') {
        if (!usersByTenant[tenantId]) usersByTenant[tenantId] = { count: 0, adminEmail: null };
        usersByTenant[tenantId].count++;
        if (role === 'COMPANY_ADMIN' && !usersByTenant[tenantId].adminEmail) {
          usersByTenant[tenantId].adminEmail = user.email ?? null;
        }
      }
    }
  } catch {
    // Non-fatal — users count unavailable; defaults to 0
  }

  // ── 3. Parallel batch queries ──────────────────────────────────────────────
  const [
    { data: wbData },
    { data: batchData },
    { data: kiData },
    { data: dpData },
    { data: submissionData },
  ] = await Promise.all([
    // Workforce baselines — latest per tenant
    db.schema('personal').from('workforce_baseline')
      .select('id, tenant_id, total_workers, created_at')
      .in('tenant_id', tenantIds)
      .order('created_at', { ascending: false }),

    // Source batches — all per tenant, exclude company submissions + rejected
    db.schema('analytics').from('source_batch')
      .select('id, tenant_id, reporting_period, batch_status, row_count, created_at')
      .in('tenant_id', tenantIds)
      .neq('batch_status', 'rejected')
      .neq('source_type', 'company_submission')   // B39: exclude company submissions from pipeline view
      .order('created_at', { ascending: false }),

    // KORA Index results — latest per tenant
    db.schema('analytics').from('kora_index_result')
      .select('id, tenant_id, reporting_period, kora_index_value, confidence_score, safeguard_status, activation_rate, methodology_version_id, calibration_status, created_at')
      .in('tenant_id', tenantIds)
      .order('created_at', { ascending: false }),

    // Decision packs — latest per tenant
    db.schema('analytics').from('decision_pack_version')
      .select('id, tenant_id, reporting_period, version_id, status, created_at')
      .in('tenant_id', tenantIds)
      .order('created_at', { ascending: false }),

    // B39: Company submissions — counts per tenant
    db.schema('analytics').from('source_batch')
      .select('id, tenant_id, batch_status')
      .in('tenant_id', tenantIds)
      .eq('source_type', 'company_submission')
      .order('created_at', { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allBatches  = (batchData ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allKi       = (kiData ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allDp       = (dpData ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allWb       = (wbData ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allSubmissions = (submissionData ?? []) as any[];

  // B39: submission counts by tenant
  const submissionsByTenant: Record<string, { total: number; pending: number; needsClarification: number; accepted: number }> = {};
  for (const s of allSubmissions) {
    const tid = s.tenant_id as string;
    if (!submissionsByTenant[tid]) submissionsByTenant[tid] = { total: 0, pending: 0, needsClarification: 0, accepted: 0 };
    submissionsByTenant[tid].total++;
    if (s.batch_status === 'submission_pending') submissionsByTenant[tid].pending++;
    if (s.batch_status === 'submission_needs_clarification') submissionsByTenant[tid].needsClarification++;
    if (s.batch_status === 'submission_accepted') submissionsByTenant[tid].accepted++;
  }

  // Latest per tenant (already ordered desc, so first occurrence wins)
  const latestBatchByTenant  = new Map<string, typeof allBatches[0]>();
  const latestKiByTenant     = new Map<string, typeof allKi[0]>();
  const latestDpByTenant     = new Map<string, typeof allDp[0]>();
  const latestWbByTenant     = new Map<string, typeof allWb[0]>();

  for (const b of allBatches) {
    if (!latestBatchByTenant.has(b.tenant_id)) latestBatchByTenant.set(b.tenant_id, b);
  }
  for (const ki of allKi) {
    if (!latestKiByTenant.has(ki.tenant_id)) latestKiByTenant.set(ki.tenant_id, ki);
  }
  for (const dp of allDp) {
    if (!latestDpByTenant.has(dp.tenant_id)) latestDpByTenant.set(dp.tenant_id, dp);
  }
  for (const wb of allWb) {
    if (!latestWbByTenant.has(wb.tenant_id)) latestWbByTenant.set(wb.tenant_id, wb);
  }

  // ── 4. UEF counts for latest batch per tenant ──────────────────────────────
  const batchIdsForUef = [...latestBatchByTenant.values()].map((b) => b.id as string);

  const uefByBatch: Record<string, { total: number; pendingReview: number; approved: number; rejected: number; needsInfo: number; needsEnrichment: number }> = {};

  if (batchIdsForUef.length > 0) {
    const { data: uefData } = await db.schema('analytics').from('uef_record')
      .select('id, batch_id, review_status, approved_for_scoring, payload')
      .in('batch_id', batchIdsForUef);

    for (const row of (uefData ?? []) as any[]) {
      const bid = row.batch_id as string;
      if (!uefByBatch[bid]) {
        uefByBatch[bid] = { total: 0, pendingReview: 0, approved: 0, rejected: 0, needsInfo: 0, needsEnrichment: 0 };
      }
      uefByBatch[bid].total++;
      const status = row.review_status as string;
      if (status === 'pending_review') {
        uefByBatch[bid].pendingReview++;
      } else if (status === 'approved') {
        uefByBatch[bid].approved++;
        const pl = (row.payload ?? {}) as Record<string, unknown>;
        if (pl['needs_enrichment'] === true) uefByBatch[bid].needsEnrichment++;
      } else if (status === 'rejected') {
        uefByBatch[bid].rejected++;
      } else if (status === 'needs_info') {
        uefByBatch[bid].needsInfo++;
      }
    }
  }

  // ── 5. Build console summary per tenant ────────────────────────────────────
  let scoredCount = 0;
  let dpReadyCount = 0;
  let needsActionCount = 0;
  let activeCount = 0;
  let suspendedCount = 0;

  const consoleTenants = tenants.map((t) => {
    const tenantId    = t.id as string;
    const tenantCode  = t.tenant_code as string;
    const isActive    = t.is_active as boolean;

    const users       = usersByTenant[tenantId] ?? { count: 0, adminEmail: null };
    const wb          = latestWbByTenant.get(tenantId) ?? null;
    const batch       = latestBatchByTenant.get(tenantId) ?? null;
    const uef         = batch ? (uefByBatch[batch.id] ?? null) : null;
    const ki          = latestKiByTenant.get(tenantId) ?? null;
    const dp          = latestDpByTenant.get(tenantId) ?? null;

    const lifecycleStatus = deriveLifecycleStatus(
      isActive, users.count, !!batch, uef, !!ki, dp?.status ?? null,
    );
    const evidenceReadiness = deriveEvidenceReadiness(!!batch, uef, !!ki, dp?.status ?? null);
    const flags = warningFlags(users.count, wb?.total_workers ?? null, uef, !!ki, isActive);

    // Quick action URLs
    const tcEnc = encodeURIComponent(tenantCode);
    const rpEnc = encodeURIComponent(batch?.reporting_period ?? ki?.reporting_period ?? '2026-Q1');

    const subs = submissionsByTenant[tenantId] ?? { total: 0, pending: 0, needsClarification: 0, accepted: 0 };

    // B-TRUTH Gen 3 route identity activation (2026-08-30): viewWorkspace,
    // evidenceArchive, livePreview, and submissions previously pointed at
    // five flat routes removed by B171 (app/admin/company-workspace,
    // company-evidence-archive, company-live-preview, company-submissions,
    // company-users) — a confirmed, long-standing broken-link regression.
    // Their B171 consolidation target is app/admin/companies/[companyId]/*
    // (Gen 3, now DB-backed by tenant_code — see workspace/page.tsx). Fixed
    // here since the canonical destination is unambiguous. manageUsers,
    // dataIntake, and uefReview are left untouched: manageUsers' canonical
    // destination is still architecturally unresolved (see the B-TRUTH Admin
    // Route Convergence audit), and dataIntake/uefReview point at real pages
    // that do not yet support tenant-code scoping at all.
    const tcPath = encodeURIComponent(tenantCode);
    const quickActions = {
      viewWorkspace:   `/admin/companies/${tcPath}/workspace`,
      manageUsers:     `/admin/company-users?tenantId=${encodeURIComponent(tenantId)}`,
      evidenceArchive: `/admin/companies/${tcPath}/evidence`,
      livePreview:     `/admin/companies/${tcPath}/preview`,
      dataIntake:      !ki ? `/admin/data-intake?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}` : null,
      uefReview:       (uef && uef.pendingReview > 0) ? `/admin/uef-review` : null,
      submissions:     subs.total > 0 ? `/admin/companies/${tcPath}/submissions` : null,
    };

    // Summary counters
    if (isActive) activeCount++; else suspendedCount++;
    if (ki) scoredCount++;
    if (dp?.status === 'ready' || dp?.status === 'exported') dpReadyCount++;
    if (flags.length > 0 && isActive) needsActionCount++;

    return {
      tenantId,
      tenantCode,
      companyName:          t.company_name as string,
      tenantStatus:         isActive ? 'active' : 'suspended',
      methodologyVersion:   (t.methodology_version_id as string | null) ?? 'KORA Index v1.0',
      createdAt:            t.created_at as string,
      onboardingStatus:     t.onboarding_status as string | null,

      // Users
      companyUsersCount:    users.count,
      primaryAdminEmail:    users.adminEmail,

      // Workforce
      totalWorkers:         (wb?.total_workers as number | null) ?? null,

      // Evidence / Pipeline
      latestBatch: batch ? {
        batchId:       batch.id as string,
        status:        batch.batch_status as string,
        rowCount:      batch.row_count as number,
        reportingPeriod: batch.reporting_period as string,
        createdAt:     batch.created_at as string,
      } : null,
      uefCounts: uef,
      evidenceReadiness,

      // Scoring
      latestKoraIndex: ki ? {
        value:              Math.round((ki.kora_index_value as number) * 100) / 100,
        confidenceScore:    Math.round((ki.confidence_score as number) * 1000) / 1000,
        safeguardStatus:    ki.safeguard_status as string,
        activationRate:     ki.activation_rate !== null ? Math.round((ki.activation_rate as number) * 1000) / 1000 : null,
        reportingPeriod:    ki.reporting_period as string,
        methodologyVersion: (ki.methodology_version_id as string) ?? 'KORA Index v1.0',
        calibrationStatus:  (ki.calibration_status as string) ?? 'pre_empirical_calibration',
        scoredAt:           ki.created_at as string,
      } : null,

      // B39: Company submissions summary
      submissions: {
        total:             subs.total,
        pending:           subs.pending,
        needsClarification: subs.needsClarification,
        accepted:          subs.accepted,
      },

      // Decision Pack
      decisionPack: dp ? {
        versionId:       dp.version_id as string,
        status:          dp.status as string,
        reportingPeriod: dp.reporting_period as string,
        createdAt:       dp.created_at as string,
      } : null,

      // Derived
      lifecycleStatus,
      warningFlags: flags,
      quickActions,
    };
  });

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    summary: {
      total:          tenants.length,
      active:         activeCount,
      suspended:      suspendedCount,
      scored:         scoredCount,
      decisionPackReady: dpReadyCount,
      needsAction:    needsActionCount,
    },
    tenants:  consoleTenants,
    caveat: 'Lifecycle status is pilot-derived from available KORA Admin data.',
  });
}
