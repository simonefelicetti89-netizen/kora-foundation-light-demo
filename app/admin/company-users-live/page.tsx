// app/admin/company-users-live/page.tsx
// ADMIN-COMPANY-NAV-COMPLETION-01 — Company users read-only view (live tenants).
//
// Closes a post-provisioning 404: app/api/admin/companies/provision/route.ts
// linked to /admin/company-users?tenantId=..., but no live UI page ever
// existed there. That flat path is NOT reused here on purpose: it was the
// route of a *different*, synthetic/demo admin subsystem
// (tenantService/accountProvisioningService) that was deliberately removed
// and consolidated into app/admin/companies/[companyId]/users in an earlier
// sprint (B171 — see tests/unit/b168-5-gen3-consolidation.test.ts, which
// locks in that app/admin/company-users/page.tsx must never exist again).
// This page is unrelated to that system — it exposes the live, Supabase-
// backed app/api/admin/company-users route — so it lives at a distinct,
// non-colliding path (`-live` suffix) instead. provision/route.ts was
// updated in this same sprint to link here.
//
// Server-side admin guard (requireKoraAdmin), same pattern as
// app/admin/companies/page.tsx. Read-only: this page and its client panel
// never call POST/PATCH/DELETE.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CompanyUsersPanel } from './_components/CompanyUsersPanel';

export const metadata = {
  title: 'Company Users — KORA Admin',
};

export default async function CompanyUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const sp = await searchParams;
  const tenantId = sp?.tenantId?.trim();

  return (
    <div className="max-w-[900px] mx-auto py-6 px-3 space-y-5">
      <div className="rounded-xl bg-[#06032B] px-6 py-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">
          KORA Admin · Company Users
        </p>
        <h1 className="text-xl font-bold text-white tracking-tight">Utenti Azienda</h1>
        <p className="text-sm text-white/45 mt-0.5">
          Vista di sola lettura — referenti e utenti company associati al tenant.
        </p>
      </div>

      {!tenantId ? (
        <div className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-4 py-4 text-sm text-[#8A5A00]">
          Nessun <code>tenantId</code> specificato nell&apos;URL. Apri questa pagina da{' '}
          <Link href="/admin/companies/new" className="font-semibold underline">
            Crea Azienda
          </Link>{' '}
          dopo aver creato o selezionato un&apos;azienda, oppure aggiungi{' '}
          <code>?tenantId=&lt;uuid&gt;</code> manualmente.
        </div>
      ) : (
        <CompanyUsersPanel tenantId={tenantId} />
      )}

      <div className="flex gap-4 text-xs">
        <Link href="/admin/companies/new" className="font-semibold text-[#C76F3D] hover:underline">
          ← Crea Azienda
        </Link>
        {tenantId && (
          <Link
            href={`/admin/company-workspace-live?tenantId=${encodeURIComponent(tenantId)}`}
            className="font-semibold text-[#C76F3D] hover:underline"
          >
            Vai a Company Workspace →
          </Link>
        )}
      </div>
    </div>
  );
}
