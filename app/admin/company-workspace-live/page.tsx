// app/admin/company-workspace-live/page.tsx
// ADMIN-COMPANY-NAV-COMPLETION-01 — Company workspace read-only view (live tenants).
//
// Closes a post-provisioning 404: app/api/admin/companies/provision/route.ts
// linked to /admin/company-workspace?tenantId=..., but no live UI page ever
// existed there. That flat path is NOT reused here on purpose: it was the
// route of a *different*, synthetic/demo admin subsystem
// (CompanyWorkspacePanel from components/admin/, backed by tenantService)
// that was deliberately removed and consolidated into
// app/admin/companies/[companyId]/workspace in an earlier sprint (B171 —
// see tests/unit/b168-5-gen3-consolidation.test.ts, which locks in that
// app/admin/company-workspace/page.tsx must never exist again). This page
// is unrelated to that system — it exposes the live, Supabase-backed
// app/api/admin/company-workspace route — so it lives at a distinct,
// non-colliding path (`-live` suffix) instead. provision/route.ts was
// updated in this same sprint to link here.
//
// Reuses the existing app/api/admin/company-workspace GET route for the
// actual pilot-status aggregation — no new business logic, no new DB
// table, no write path.
//
// Note: the provisioning link carries `tenantId` (a UUID), but
// app/api/admin/company-workspace/route.ts reads `tenantCode` (its existing,
// unchanged contract — shared with other Data Intake / UEF Review callers).
// This page resolves tenantId -> tenantCode with a single-column lookup on
// analytics.tenant (the same trivial identifier lookup already performed in
// app/api/admin/company-users/route.ts) — this is not a duplication of the
// workspace aggregation logic itself, which stays entirely in the API route
// and is only ever called from the client panel below.
//
// Server-side admin guard (requireKoraAdmin), same pattern as
// app/admin/companies/page.tsx. Read-only: this page and its client panel
// never call POST/PATCH/DELETE.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CompanyWorkspacePanel } from './_components/CompanyWorkspacePanel';

export const metadata = {
  title: 'Company Workspace — KORA Admin',
};

export default async function AdminCompanyWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const sp = await searchParams;
  const tenantId = sp?.tenantId?.trim();

  let tenantCode: string | null = null;
  let companyName: string | null = null;
  let lookupError: string | null = null;

  if (tenantId) {
    const db = getSupabaseServiceClient();
    const { data: tenantRow, error: tErr } = await db
      .schema('analytics').from('tenant')
      .select('tenant_code, company_name')
      .eq('id', tenantId)
      .maybeSingle();

    if (tErr) {
      lookupError = 'Errore nella ricerca del tenant.';
    } else if (!tenantRow) {
      lookupError = 'Tenant non trovato per il tenantId indicato.';
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = tenantRow as any;
      tenantCode = t.tenant_code as string;
      companyName = t.company_name as string;
    }
  }

  return (
    <div className="max-w-[900px] mx-auto py-6 px-3 space-y-5">
      <div className="rounded-xl bg-[#06032B] px-6 py-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">
          KORA Admin · Company Workspace
        </p>
        <h1 className="text-xl font-bold text-white tracking-tight">Stato Pilot Azienda</h1>
        <p className="text-sm text-white/45 mt-0.5">
          Vista di sola lettura — stato pipeline, prossima azione consigliata.
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
      ) : lookupError ? (
        <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-4 text-sm text-[#9E3B2F]">
          ⚠ {lookupError}
        </div>
      ) : (
        <CompanyWorkspacePanel tenantCode={tenantCode as string} companyName={companyName as string} />
      )}

      <div className="flex gap-4 text-xs">
        <Link href="/admin/companies/new" className="font-semibold text-[#C76F3D] hover:underline">
          ← Crea Azienda
        </Link>
        {tenantId && (
          <Link
            href={`/admin/company-users-live?tenantId=${encodeURIComponent(tenantId)}`}
            className="font-semibold text-[#C76F3D] hover:underline"
          >
            ← Company Users
          </Link>
        )}
      </div>
    </div>
  );
}
