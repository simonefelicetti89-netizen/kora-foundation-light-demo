// /admin/companies/[companyId]/evidence — B168.5 Phase 2.2
// Drill-in: Company Evidence Archive per company specifica.
// Componente sorgente: CompanyEvidenceArchivePanel (Gen 1 live — dati Supabase reali).
//
// B-TRUTH Gen 3 route identity activation (2026-08-30): [companyId] here is
// analytics.tenant.tenant_code — see workspace/page.tsx for the full note.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { CompanyEvidenceArchivePanel } from '@/components/admin/CompanyEvidenceArchivePanel';
import { redirect, notFound } from 'next/navigation';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export default async function CompanyEvidenceDrillInPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const db = getSupabaseServiceClient();
  const { data: tenant, error } = await db.schema('analytics').from('tenant')
    .select('id').eq('tenant_code', companyId).eq('is_active', true).maybeSingle();
  if (error) throw new Error(`[KORA] tenant lookup failed: ${error.message}`);
  if (!tenant) notFound();

  return <CompanyEvidenceArchivePanel initialTenantCode={companyId} />;
}
