// /admin/companies/[companyId]/preview — B168.5 Phase 2.2
// Drill-in: Company Live Preview per company specifica.
// Componente sorgente: CompanyLivePreviewPanel (Gen 1 live — dati Supabase reali).
//
// B-TRUTH Gen 3 route identity activation (2026-08-30): [companyId] here is
// analytics.tenant.tenant_code — see workspace/page.tsx for the full note.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { CompanyLivePreviewPanel } from '@/components/admin/CompanyLivePreviewPanel';
import { redirect, notFound } from 'next/navigation';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export default async function CompanyPreviewDrillInPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const db = getSupabaseServiceClient();
  const { data: tenant, error } = await db.schema('analytics').from('tenant')
    .select('id').eq('tenant_code', companyId).eq('is_active', true).maybeSingle();
  if (error) throw new Error(`[KORA] tenant lookup failed: ${error.message}`);
  if (!tenant) notFound();

  return <CompanyLivePreviewPanel initialTenantCode={companyId} />;
}
