// /admin/companies/[companyId]/evidence — B168.5 Phase 2.2
// Drill-in: Company Evidence Archive per company specifica.
// Componente sorgente: CompanyEvidenceArchivePanel (Gen 1 live — dati Supabase reali).

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { CompanyEvidenceArchivePanel } from '@/app/admin/company-evidence-archive/_components/CompanyEvidenceArchivePanel';
import { redirect, notFound } from 'next/navigation';
import { tenantService } from '@/services/tenant/TenantService';

export default async function CompanyEvidenceDrillInPage({ params }: { params: { companyId: string } }) {
  const { companyId } = params;

  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const tenant = tenantService.getTenant(companyId);
  if (!tenant) notFound();

  return <CompanyEvidenceArchivePanel initialTenantCode={companyId} />;
}
