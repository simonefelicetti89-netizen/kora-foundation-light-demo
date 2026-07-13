// app/admin/workers/bulk/page.tsx
// WORKER-BULK-PROVISIONING-01 — bulk worker provisioning for a pilot cohort.
//
// Nested under /admin/workers rather than replacing it: that route already
// has an established one-by-one meaning (WorkersAdminClient), locked in by
// tests/unit/b104-worker-provisioning.test.ts. This page is additive, not a
// rewrite — app/admin/workers/page.tsx gets one extra link, unchanged
// otherwise.
//
// Server-side admin guard, same pattern as the parent /admin/workers page.
// tenantId comes from the query string (matching the /admin/company-users-live
// and /admin/company-workspace-live nav flow) — a small server-side lookup
// resolves it to tenantCode/companyName for display only; the client submits
// tenantId directly to the bulk-provision API.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentKoraUser } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { BulkWorkerProvisioningClient } from './_components/BulkWorkerProvisioningClient';

export const metadata = {
  title: 'Bulk Worker Provisioning — KORA Admin',
};

export default async function AdminWorkersBulkPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const user = await getCurrentKoraUser();
  if (!user || user.koraRole !== 'KORA_ADMIN') {
    redirect('/admin/login');
  }

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
          KORA Admin · Worker Provisioning
        </p>
        <h1 className="text-xl font-bold text-white tracking-tight">Provisioning Worker in Blocco</h1>
        <p className="text-sm text-white/45 mt-0.5">
          Invita più worker in un unico batch — pensato per un pilota con più di poche persone.
        </p>
      </div>

      {!tenantId ? (
        <div className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-4 py-4 text-sm text-[#8A5A00]">
          Nessun <code>tenantId</code> specificato nell&apos;URL. Apri questa pagina da{' '}
          <Link href="/admin/companies/new" className="font-semibold underline">
            Crea Azienda
          </Link>{' '}
          o da{' '}
          <Link href="/admin/company-workspace-live" className="font-semibold underline">
            Company Workspace
          </Link>
          , oppure aggiungi <code>?tenantId=&lt;uuid&gt;</code> manualmente.
        </div>
      ) : lookupError ? (
        <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-4 text-sm text-[#9E3B2F]">
          ⚠ {lookupError}
        </div>
      ) : (
        <BulkWorkerProvisioningClient
          tenantId={tenantId}
          tenantCode={tenantCode as string}
          companyName={companyName as string}
        />
      )}

      <div className="flex gap-4 text-xs flex-wrap">
        <Link href="/admin/workers" className="font-semibold text-[#C76F3D] hover:underline">
          ← Provisioning singolo
        </Link>
        <Link href="/admin/companies/new" className="font-semibold text-[#C76F3D] hover:underline">
          ← Crea Azienda
        </Link>
        {tenantId && (
          <>
            <Link
              href={`/admin/company-users-live?tenantId=${encodeURIComponent(tenantId)}`}
              className="font-semibold text-[#C76F3D] hover:underline"
            >
              Company Users →
            </Link>
            <Link
              href={`/admin/company-workspace-live?tenantId=${encodeURIComponent(tenantId)}`}
              className="font-semibold text-[#C76F3D] hover:underline"
            >
              Company Workspace →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
