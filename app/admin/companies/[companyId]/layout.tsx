// /admin/companies/[companyId]/layout.tsx — B169 FASE 2
// Server Component: primary auth check + company tab nav for all 8 drill-in sub-pages.
// Individual sub-pages retain requireKoraAdmin() as defense-in-depth per B168.5.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';
import { tenantService } from '@/services/tenant/TenantService';
import { CompanyTabNav } from './_components/CompanyTabNav';

export default async function CompanyDrillInLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { companyId: string };
}) {
  const { companyId } = params;

  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const tenant = tenantService.getTenant(companyId);
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
