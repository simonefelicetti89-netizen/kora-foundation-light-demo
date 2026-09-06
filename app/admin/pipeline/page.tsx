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
// lib/live/data-intake-status-view.ts.
//
// B-TRUTH ReportFactoryService Canonical Decision Pack Status Migration
// (2026-09-05): the Decision Pack step's readiness signal is now read
// directly from analytics.decision_pack_version (canonical) instead of the
// synthetic decision-pack-versions.json fixture, via the shared pure view
// builder lib/live/decision-pack-status-view.ts. ReportFactoryService.ts
// (the service that used to own this read) has been retired entirely — its
// only real caller now reads this canonical view directly.
//
// B-TRUTH AccountProvisioningService Pipeline Role Migration (2026-09-06):
// the "Crea utente" step's account-existence signal is now read directly
// from Supabase Auth (auth.users + app_metadata) instead of the synthetic
// data/synthetic/user-accounts.json fixture, via the shared pure view
// builder lib/live/account-provisioning-status-view.ts. This migrates ONLY
// AccountProvisioningService's pipeline/admin role.
//
// PRIOR HISTORY (preserved verbatim): "its separate My KORA/session role
// (getCurrentDemoUser(), used by app/my-kora/page.tsx) is untouched, out of
// scope, and the service remains alive (NARROWED, not retired) for that
// reason." That method's own caller (app/my-kora/page.tsx) was removed
// earlier in the B-WORKER workstream, leaving it zero-caller —
// getCurrentDemoUser() itself was removed in B-WORKER final cleanup
// (2026-09-06). AccountProvisioningService.ts remains alive only for its
// other, unrelated, individually-unproven-dead methods.
//
// B-WORKER WorkerProvisioning Canonicalization (2026-09-06): the "Workforce"
// step's totalWorkers/Worker Space signal is now read directly from
// personal.worker_identity (canonical, keyed by the real tenant.id) instead
// of the synthetic data/synthetic/worker-roster.json fixture, via the
// shared pure view builder lib/live/worker-provisioning-status-view.ts.
// services/worker-provisioning/WorkerProvisioningService.ts is retired
// entirely — this was the final B-WORKER I9 synthetic runtime import.
//
// Every OTHER step's data source (scoring) is UNCHANGED — that remains a
// separate, later slice, still keyed by the DEMO_COMPANY_ID constant inside
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
import { buildDecisionPackStatusView, type CanonicalDecisionPackStatus, type DecisionPackVersionStatusRow } from '@/lib/live/decision-pack-status-view';
import { buildAccountProvisioningStatusView, type CanonicalAccountProvisioningStatus, type AuthUserAppMetadataRow } from '@/lib/live/account-provisioning-status-view';
import { buildWorkerProvisioningStatusView, type CanonicalWorkerProvisioningStatus } from '@/lib/live/worker-provisioning-status-view';

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

  let decisionPack: CanonicalDecisionPackStatus = { hasDecisionPack: false, status: null };
  if (tenant) {
    const { data: versionRows, error: versionErr } = await db
      .schema('analytics').from('decision_pack_version')
      .select('status, created_at')
      .eq('tenant_id', tenant.id);
    if (versionErr) throw new Error(`[KORA] decision_pack_version lookup failed: ${versionErr.message}`);

    decisionPack = buildDecisionPackStatusView((versionRows ?? []) as DecisionPackVersionStatusRow[]);
  }

  let accountProvisioning: CanonicalAccountProvisioningStatus = { hasCompanyUser: false };
  if (tenant) {
    const { data: usersData, error: usersErr } = await db.auth.admin.listUsers({ perPage: 1000 });
    if (usersErr) throw new Error(`[KORA] auth.users lookup failed: ${usersErr.message}`);

    accountProvisioning = buildAccountProvisioningStatusView(
      tenant.id,
      (usersData?.users ?? []) as AuthUserAppMetadataRow[],
    );
  }

  let workerProvisioning: CanonicalWorkerProvisioningStatus = { total_workers: 0, my_kora_enabled_count: 0, active_worker_accounts: 0 };
  if (tenant) {
    const { data: workerRows, error: workerErr } = await db
      .schema('personal').from('worker_identity')
      .select('status')
      .eq('tenant_id', tenant.id);
    if (workerErr) throw new Error(`[KORA] worker_identity lookup failed: ${workerErr.message}`);

    workerProvisioning = buildWorkerProvisioningStatusView((workerRows ?? []) as Array<{ status: string }>);
  }

  return (
    <PilotLifecycleClient
      tenant={tenant}
      dataIntake={dataIntake}
      decisionPack={decisionPack}
      accountProvisioning={accountProvisioning}
      workerProvisioning={workerProvisioning}
    />
  );
}
