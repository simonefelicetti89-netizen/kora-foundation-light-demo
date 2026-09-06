// lib/live/worker-provisioning-status-view.ts
// B-WORKER WorkerProvisioning Canonicalization — canonical live view over
// personal.worker_identity, replacing services/worker-provisioning/WorkerProvisioningService.ts's
// synthetic getWorkersForCompany()/getWorkerProvisioningSummary() for their
// real callers.
//
// Field disposition (only fields actually consumed by real callers, traced
// by direct usage — not inferred from the legacy synthetic shape):
//
//   total_workers          — WorkforceQuickAccessPanel, WorkerAdoptionPanel,
//                             PilotLifecycleClient. Direct count of
//                             personal.worker_identity rows for the tenant.
//   my_kora_enabled_count  — WorkforceQuickAccessPanel, WorkerAdoptionPanel,
//                             WorkerSpaceCapabilityService (all 3 real call
//                             sites). DERIVED, not a stored flag: the
//                             synthetic model had a separate boolean, but
//                             lib/auth/kora-session.ts's requireWorkerUser()
//                             — the real, sole gate on My KORA access — only
//                             checks status !== 'disabled'. There is no
//                             canonical "provisioned but My KORA not yet
//                             enabled" state, so a separate stored flag
//                             would be a redundant access truth. This field
//                             is therefore count of non-disabled workers.
//   active_worker_accounts — WorkerAdoptionPanel. Count of status='active'
//                             rows (workers who completed invite
//                             acceptance) — this is exactly what "active"
//                             already canonically means, no derivation
//                             judgment call involved.
//
// Fields NOT carried forward (present on the legacy synthetic shape, zero
// real consumption anywhere, confirmed by direct caller audit):
// invited_workers, pib_private_enabled_count, suppressed_clusters_count,
// privacy_notes, next_action. pib_private_enabled specifically is retired,
// not merely dropped from this view: PIB privacy is an absolute,
// unconditional, RLS-enforced guarantee (personal.worker_pib has no
// company-role policy at all — "Company = NO POLICY" per migration
// 018_worker_pib.sql's own header) — it was never a real per-worker toggle,
// so there is nothing to derive or preserve.
//
// department/site are NOT part of this view at all: no real caller of
// getWorkersForCompany()/getWorkerProvisioningSummary() ever read them (the
// legacy synthetic type carried them, but WorkforceQuickAccessPanel,
// WorkerAdoptionPanel, and WorkerSpaceCapabilityService only ever touched
// my_kora_enabled and roster length). The real department/site concept
// already exists, canonically, in the ingestion/scoring domain
// (lib/kora-engine/pillar-mapping.ts, care-economy-mapping.ts,
// reach-quality.ts, fed by uploaded-record source metadata) — an unrelated,
// already-canonical, untouched data path.

export interface WorkerIdentityStatusRow {
  tenant_id: string;
  status: string;
}

export interface CanonicalWorkerProvisioningStatus {
  total_workers: number;
  my_kora_enabled_count: number;
  active_worker_accounts: number;
}

export function buildWorkerProvisioningStatusView(
  rows: Array<{ status: string }>,
): CanonicalWorkerProvisioningStatus {
  return {
    total_workers: rows.length,
    my_kora_enabled_count: rows.filter((r) => r.status !== 'disabled').length,
    active_worker_accounts: rows.filter((r) => r.status === 'active').length,
  };
}

// Multi-tenant variant for admin surfaces that list many companies at once
// (WorkforceQuickAccessPanel) — one query instead of one per tenant.
export function buildWorkerProvisioningStatusMap(
  rows: WorkerIdentityStatusRow[],
): Record<string, CanonicalWorkerProvisioningStatus> {
  const byTenant = new Map<string, Array<{ status: string }>>();
  for (const row of rows) {
    const arr = byTenant.get(row.tenant_id) ?? [];
    arr.push({ status: row.status });
    byTenant.set(row.tenant_id, arr);
  }
  const result: Record<string, CanonicalWorkerProvisioningStatus> = {};
  for (const [tenantId, tenantRows] of byTenant) {
    result[tenantId] = buildWorkerProvisioningStatusView(tenantRows);
  }
  return result;
}

export const EMPTY_WORKER_PROVISIONING_STATUS: CanonicalWorkerProvisioningStatus = {
  total_workers: 0,
  my_kora_enabled_count: 0,
  active_worker_accounts: 0,
};
