// /admin/pipeline — B95-B Lifecycle Orchestrator
// KORA Admin can understand the full pilot lifecycle in <60s.
//
// B-TRUTH TenantService Canonical Migration (2026-09-04): the tenant
// identity/status this page shows is read directly from analytics.tenant
// (canonical) instead of the synthetic data/synthetic/tenants.json fixture.
//
// B-TRUTH CompanyDataIntakeService Canonical Migration (2026-09-05): the
// Data Intake step's readiness signal is now read from
// analytics.source_batch + analytics.uef_record (canonical) instead of the
// synthetic company-raw-data-batches.json/company-raw-data-rows.json
// fixtures, via the shared pure view builder
// lib/live/data-intake-status-view.ts (also reused by
// ReportFactoryService.getDecisionPackFactoryStatus, avoiding a duplicate
// query for the same data).
//
// Every OTHER step's data source (worker provisioning, account
// provisioning, scoring) is UNCHANGED — those remain separate, later
// migration slices, still keyed by the DEMO_COMPANY_ID constant inside
// PilotLifecycleClient.tsx.
//
// PILOT_LIFECYCLE_TENANT_CODE is a temporary single-tenant default for this
// still-single-company B95-B UI (see PR #140's KoraTest canonical
// foundation) — an ordinary tenant_code lookup, no special-case branching
// on this or any other tenant_code anywhere in this file or its canonical
// read path.

export const runtime = 'nodejs';

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { PilotLifecycleClient, type CanonicalPilotTenant } from './_components/PilotLifecycleClient';
import { buildDataIntakeStatusView, type CanonicalDataIntakeStatus, type SourceBatchStatusRow } from '@/lib/live/data-intake-status-view';

const PILOT_LIFECYCLE_TENANT_CODE = 'KORATEST-01';

export default async function PilotLifecyclePage() {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, company_name, onboarding_status, decision_pack_status, is_active')
    .eq('tenant_code', PILOT_LIFECYCLE_TENANT_CODE)
    .maybeSingle();

  if (error) throw new Error(`[KORA] tenant lookup failed: ${error.message}`);

  const tenant = (data as CanonicalPilotTenant | null) ?? null;

  let dataIntake: CanonicalDataIntakeStatus = { batchCount: 0, intakeStatus: 'not_started', pendingReviewCount: 0 };
  if (tenant) {
    const { data: batchRows, error: batchErr } = await db
      .schema('analytics').from('source_batch')
      .select('batch_status, created_at')
      .eq('tenant_id', tenant.id);
    if (batchErr) throw new Error(`[KORA] source_batch lookup failed: ${batchErr.message}`);

    const { count: pendingCount, error: pendingErr } = await db
      .schema('analytics').from('uef_record')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('review_status', 'pending_review');
    if (pendingErr) throw new Error(`[KORA] uef_record pending lookup failed: ${pendingErr.message}`);

    dataIntake = buildDataIntakeStatusView((batchRows ?? []) as SourceBatchStatusRow[], pendingCount ?? 0);
  }

  return <PilotLifecycleClient tenant={tenant} dataIntake={dataIntake} />;
}
