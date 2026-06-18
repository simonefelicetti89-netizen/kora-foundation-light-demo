// /admin/companies/[companyId]/preview — B168.5 Phase 2.2
// Drill-in: Company Live Preview per company specifica.
// Componente sorgente: CompanyLivePreviewPanel (Gen 1 live — dati Supabase reali).

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { CompanyLivePreviewPanel } from '@/app/admin/company-live-preview/_components/CompanyLivePreviewPanel';
import { redirect, notFound } from 'next/navigation';
import { tenantService } from '@/services/tenant/TenantService';

export default async function CompanyPreviewDrillInPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const tenant = tenantService.getTenant(companyId);
  if (!tenant) notFound();

  return <CompanyLivePreviewPanel initialTenantCode={companyId} />;
}
