// lib/live/account-provisioning-status-view.ts
// B-TRUTH AccountProvisioningService Pipeline Role Migration — canonical
// live view over Supabase Auth (auth.users + app_metadata), replacing
// services/account/AccountProvisioningService.ts's synthetic
// getAccountsForCompany() for its one pipeline caller
// (app/admin/pipeline/_components/PilotLifecycleClient.tsx).
//
// PIPELINE ROLE ONLY. This file does not know about My KORA, worker
// identity, or session resolution.
//
// PRIOR HISTORY (preserved verbatim): "those remain
// AccountProvisioningService.getCurrentDemoUser()'s own, untouched,
// responsibility (app/my-kora/page.tsx)." That method's caller was removed
// earlier in the B-WORKER workstream; getCurrentDemoUser() itself was
// removed in B-WORKER final cleanup (2026-09-06). See that migration's own
// dedicated regression test for the original responsibility-split proof.
//
// Field disposition (only the field actually consumed by the real caller,
// traced by direct usage, not inferred from the legacy method's return
// shape): PilotLifecycleClient.tsx read exactly ONE derived fact from
// getAccountsForCompany()'s full KoraUserAccount[] — accounts.length > 0,
// fed into the lifecycle's hasCompanyUser flag. No other field of
// KoraUserAccount (email, invitation_status, visible_sections, etc.) was
// ever consumed by this caller. Per this migration's "map only what the
// canonical model actually supports" rule, the projection below returns
// exactly that one boolean, not a full account list.
//
// Canonical authority: Supabase Auth (auth.users), filtered by
// app_metadata.kora_tenant_id / app_metadata.kora_role — the exact same
// filter app/api/admin/company-users/route.ts's own GET handler already
// uses (COMPANY_ROLES = ['COMPANY_ADMIN']), reused here, not reinvented.
// auth.users has no RLS equivalent for admin listing — reading it requires
// the Supabase Auth Admin API (service role), called server-side only, from
// app/admin/pipeline/page.tsx (already an allowlisted app/admin/** context
// per tests/unit/pilot-trust-01-service-role-guard.test.ts).
//
// Status semantics preserved exactly as the legacy behavior: the legacy
// getAccountsForCompany() returned ALL accounts regardless of
// account_status (draft/invited/active_demo/suspended/disabled/revoked),
// and the caller's own check (accounts.length > 0) did not filter by
// status either. This view does the same — it does not filter by
// app_metadata.kora_status — preserving the exact same coarse-grained
// "does at least one such account exist" semantic, not inventing a new,
// stricter status model in this migration.
//
// tenant_kind is never read here — this view is identical for a
// tenant_kind='TEST' tenant (KoraTest Srl) and any tenant_kind='LIVE'
// tenant.

const COMPANY_ROLES = ['COMPANY_ADMIN'] as const;

export interface CanonicalAccountProvisioningStatus {
  hasCompanyUser: boolean;
}

export interface AuthUserAppMetadataRow {
  app_metadata: Record<string, unknown> | null | undefined;
}

export function buildAccountProvisioningStatusView(
  tenantId: string,
  users: AuthUserAppMetadataRow[],
): CanonicalAccountProvisioningStatus {
  const hasCompanyUser = users.some((u) => {
    const meta = u.app_metadata;
    return meta?.['kora_tenant_id'] === tenantId &&
      (COMPANY_ROLES as readonly string[]).includes(meta?.['kora_role'] as string);
  });
  return { hasCompanyUser };
}
