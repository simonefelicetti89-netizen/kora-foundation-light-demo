// /admin/companies/[companyId]/layout.tsx — B169 FASE 2
// Server Component: primary auth check + company tab nav for all 4 drill-in sub-pages.
// Individual sub-pages retain requireKoraAdmin() as defense-in-depth per B168.5.
//
// CC-019B (2026-08-31): company_name now resolves from analytics.tenant by
// tenant_code — the same canonical source and identifier every Gen3 child
// (workspace/preview/evidence/submissions) already queries independently.
// Previously this read TenantService/tenants.json, a mixed-identity bug:
// canonical, real, tenant-scoped body content rendered under a header
// sourced from synthetic data. Not-found ownership is left with each child
// page's own notFound() call (unchanged) — this layout only needs a safe
// display fallback, so an unmatched tenant_code still just displays the raw
// companyId, same as before, never a synthetic company_name.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { CompanyTabNav } from './_components/CompanyTabNav';

export default async function CompanyDrillInLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const db = getSupabaseServiceClient();
  const { data: tenant, error } = await db.schema('analytics').from('tenant')
    .select('company_name').eq('tenant_code', companyId).eq('is_active', true).maybeSingle();
  if (error) throw new Error(`[KORA] tenant lookup failed: ${error.message}`);
  const companyName = tenant?.company_name ?? companyId;

  return (
    <div className="flex flex-col min-h-full">
      <CompanyTabNav companyId={companyId} companyName={companyName} />
      <div className="flex-1 overflow-y-auto" style={{ padding: '24px 32px' }}>
        {children}
      </div>
    </div>
  );
}
