// /admin/companies/[companyId]/submissions — B168.5 Phase 2.2
// Drill-in: Admin Submission Queue filtrata per company specifica.
// Componente sorgente: AdminSubmissionQueue (Gen 1 live — dati Supabase reali).

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { AdminSubmissionQueue } from '@/app/admin/company-submissions/_components/AdminSubmissionQueue';
import { redirect, notFound } from 'next/navigation';
import { tenantService } from '@/services/tenant/TenantService';

export default async function CompanySubmissionsDrillInPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const tenant = tenantService.getTenant(companyId);
  if (!tenant) notFound();

  return (
    <AdminSubmissionQueue
      userEmail={auth.email}
      initialTenantCode={companyId}
    />
  );
}
