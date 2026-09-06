'use client';
// components/admin/WorkforceQuickAccessPanel.tsx
// B95-C Task 2 — Workforce Management CTA panel on /admin/companies.
// Shows companies with worker count, My KORA enabled count, Gestisci workforce CTA.
// No individual PIB. No employer-visible worker data. Aggregate only.
//
// B-TRUTH TenantService Canonical Migration (2026-09-04): the company list
// is now fetched canonically (analytics.tenant, all tenant_kind values, no
// hidden test tenants) by the parent Server Component
// (app/admin/companies/page.tsx) and passed in as a prop — this component no
// longer reads the synthetic tenant fixture itself.
//
// B-WORKER WorkerProvisioning Canonicalization (2026-09-06): worker-count/
// My-KORA sub-values are now read from a canonical workerProvisioningByTenant
// prop (personal.worker_identity, fetched server-side by page.tsx) instead
// of workerProvisioningService — retired entirely. For a tenant with no
// worker_identity rows yet, the map has no entry and this component
// honestly reads 0/not-enabled rather than fabricating a count — same
// behavior as before, now from a real source instead of a synthetic one
// that could never match a real tenant.id anyway.

import Link from 'next/link';
import { workerSpaceCapabilityService } from '@/services/worker-space/WorkerSpaceCapabilityService';
import { EMPTY_WORKER_PROVISIONING_STATUS, type CanonicalWorkerProvisioningStatus } from '@/lib/live/worker-provisioning-status-view';

export interface WorkforcePanelTenant {
  id: string;
  tenant_code: string;
  company_name: string;
}

export function WorkforceQuickAccessPanel({
  tenants,
  workerProvisioningByTenant,
}: {
  tenants: WorkforcePanelTenant[];
  workerProvisioningByTenant: Record<string, CanonicalWorkerProvisioningStatus>;
}) {
  return (
    <div
      data-testid="workforce-quick-access-panel"
      className="max-w-[1100px] mx-auto px-3 pt-5 pb-0"
    >
      <div className="rounded-xl border border-[rgba(6,3,43,0.10)] bg-[#F8F6F1] p-5">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[rgba(6,3,43,0.38)] mb-0.5">
              Foundation Light
            </p>
            <h2 className="text-[13px] font-bold text-[rgba(6,3,43,0.90)]">
              Workforce Management
            </h2>
            <p className="text-[10.5px] text-[rgba(6,3,43,0.52)] mt-0.5">
              Gestisci il roster dei lavoratori per ogni azienda. Elenco aziende e conteggio lavoratori reali.
            </p>
          </div>
        </div>

        {/* Company cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tenants.map((tenant) => {
            const summary = workerProvisioningByTenant[tenant.id] ?? EMPTY_WORKER_PROVISIONING_STATUS;
            const capability = workerSpaceCapabilityService.getCapabilityFromCounts(
              summary.my_kora_enabled_count,
              summary.total_workers,
            );
            const myKoraEnabled = summary.my_kora_enabled_count;

            return (
              <div
                key={tenant.id}
                data-testid={`workforce-card-${tenant.tenant_code}`}
                className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-white p-4 flex flex-col gap-3"
              >
                {/* Company name */}
                <div>
                  <p className="text-[11px] font-bold text-[rgba(6,3,43,0.88)] leading-tight">
                    {tenant.company_name}
                  </p>
                  <p className="text-[9px] font-mono text-[rgba(6,3,43,0.35)] mt-0.5">
                    {tenant.tenant_code}
                  </p>
                </div>

                {/* Counts */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded border border-[rgba(6,3,43,0.07)] bg-[rgba(6,3,43,0.02)] px-2.5 py-2 text-center">
                    <p className="text-[8.5px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
                      Lavoratori
                    </p>
                    <p className="text-lg font-bold text-[rgba(6,3,43,0.90)] mt-0.5">
                      {summary.total_workers}
                    </p>
                  </div>
                  <div className={`rounded border px-2.5 py-2 text-center ${myKoraEnabled > 0 ? 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.05)]' : 'border-[rgba(6,3,43,0.07)] bg-[rgba(6,3,43,0.02)]'}`}>
                    <p className="text-[8.5px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
                      My KORA attivi
                    </p>
                    <p className={`text-lg font-bold mt-0.5 ${myKoraEnabled > 0 ? 'text-[#2F7D55]' : 'text-[rgba(6,3,43,0.45)]'}`}>
                      {myKoraEnabled}
                    </p>
                  </div>
                </div>

                {/* Worker Space status */}
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${capability.enabled ? 'border-[rgba(47,125,85,0.28)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]' : 'border-[rgba(6,3,43,0.10)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.45)]'}`}>
                    Worker Space: {capability.enabled ? 'Abilitato' : 'Non abilitato'}
                  </span>
                </div>

                {/* CTA — B-TRUTH Gen 0/1 Retirement Wave 1: the per-tenant demo
                    workforce page was retired; points to the real, global
                    (not tenant-scoped) worker provisioning admin surface. */}
                <Link
                  href="/admin/workers"
                  data-testid={`gestisci-workforce-${tenant.tenant_code}`}
                  className="mt-auto block rounded-md bg-[#06032B] px-3 py-2 text-center text-[11px] font-semibold text-white hover:bg-[rgba(6,3,43,0.82)] transition-colors"
                >
                  Worker Provisioning (live) →
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-[9px] font-mono text-[rgba(6,3,43,0.25)] mt-4">
          B95-C · Workforce Quick Access · no_individual_pib · no_employer_worker_data
        </p>
      </div>
    </div>
  );
}
