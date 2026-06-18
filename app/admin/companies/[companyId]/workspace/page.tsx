// /admin/companies/[companyId]/workspace — B168.5 Phase 2.2
// Drill-in: Company Workspace per company specifica.
// Componente sorgente: CompanyWorkspacePanel (Gen 1 live — dati Supabase reali).

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { CompanyWorkspacePanel } from '@/components/admin/CompanyWorkspacePanel';
import { redirect, notFound } from 'next/navigation';
import { tenantService } from '@/services/tenant/TenantService';

export default async function CompanyWorkspaceDrillInPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const tenant = tenantService.getTenant(companyId);
  if (!tenant) notFound();

  return (
    <CompanyWorkspacePanel
      userEmail={auth.email}
      userRole={auth.koraRole}
      initialTenantCode={companyId}
    />
  );
}
