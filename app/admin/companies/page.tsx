// A-01: Company Console — lista di tutte le aziende nel portafoglio KORA.
// Scopo: fornire a KORA Admin la vista operativa di ogni azienda con stato
//        pipeline, readiness dati, safeguard e next action operativa.
// app/admin/companies/page.tsx
// B37 — KORA Admin Company Console — live tenant registry.
// Replaces B9/A-15 demo page with real server-auth protected page.
// KORA_ADMIN only. No demo fallback.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { CompanyConsolePanel } from './_components/CompanyConsolePanel';
import { WorkforceQuickAccessPanel } from '@/components/admin/WorkforceQuickAccessPanel';
import { redirect } from 'next/navigation';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { buildWorkerProvisioningStatusMap, type WorkerIdentityStatusRow } from '@/lib/live/worker-provisioning-status-view';

const FROM_LABELS: Record<string, string> = {
  workspace:   'Spazio Azienda',
  preview:     'Company Live Preview',
  evidence:    'Evidence Archive',
  submissions: 'Company Submissions',
  users:       'Gestione Utenti',
};

export const metadata = {
  title: 'Company Console — KORA Admin',
};

export default async function CompanyConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const sp = await searchParams;
  const fromSection = sp?.from && FROM_LABELS[sp.from]
    ? FROM_LABELS[sp.from]
    : null;

  // B-TRUTH TenantService Canonical Migration (2026-09-04): canonical tenant
  // list for WorkforceQuickAccessPanel — every tenant_kind included (no
  // hidden test tenants; tenant_kind is not a filter here, matching the
  // frozen "no visible LIVE/DEMO product bifurcation" invariant).
  const db = getSupabaseServiceClient();
  const { data: tenantRows, error: tenantsErr } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, company_name')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (tenantsErr) throw new Error(`[KORA] tenant list fetch failed: ${tenantsErr.message}`);
  const tenants = (tenantRows ?? []) as Array<{ id: string; tenant_code: string; company_name: string }>;

  // B-WORKER WorkerProvisioning Canonicalization (2026-09-06): per-tenant
  // worker counts for WorkforceQuickAccessPanel are now read from
  // personal.worker_identity (canonical, keyed by real tenant.id) instead
  // of the synthetic data/synthetic/worker-roster.json fixture, via the
  // shared pure view builder lib/live/worker-provisioning-status-view.ts.
  // One query for all tenants on this page (not one per tenant) — grouped
  // client-side by tenant_id.
  const tenantIds = tenants.map((t) => t.id);
  let workerProvisioningByTenant: Record<string, { total_workers: number; my_kora_enabled_count: number; active_worker_accounts: number }> = {};
  if (tenantIds.length > 0) {
    const { data: workerRows, error: workerErr } = await db
      .schema('personal').from('worker_identity')
      .select('tenant_id, status')
      .in('tenant_id', tenantIds);
    if (workerErr) throw new Error(`[KORA] worker_identity lookup failed: ${workerErr.message}`);
    workerProvisioningByTenant = buildWorkerProvisioningStatusMap((workerRows ?? []) as WorkerIdentityStatusRow[]);
  }

  return (
    <>
      {fromSection && (
        <div className="mb-4 rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.06)] px-4 py-3 text-xs text-[rgba(6,3,43,0.78)] leading-relaxed">
          <span className="font-semibold text-[#C76F3D]">{fromSection}</span>
          {' '}è ora accessibile dal drill-in dell&apos;azienda specifica.
          Seleziona un&apos;azienda per aprire la sezione.
        </div>
      )}
      <WorkforceQuickAccessPanel tenants={tenants} workerProvisioningByTenant={workerProvisioningByTenant} />
      <CompanyConsolePanel userEmail={auth.email} />
    </>
  );
}
