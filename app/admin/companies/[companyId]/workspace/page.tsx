// /admin/companies/[companyId]/workspace — B168.5 Phase 2.2
// Drill-in: Company Workspace per company specifica.
// Componente sorgente: CompanyWorkspacePanel (Gen 1 live — dati Supabase reali).
//
// B-TRUTH Gen 3 route identity activation (2026-08-30): [companyId] here is
// analytics.tenant.tenant_code — the existence gate now queries the real
// table (same pattern as app/api/admin/company-workspace's own tenant
// lookup) instead of the synthetic TenantService/tenants.json. A synthetic
// legacy id like "meridiana-group" is NOT accepted merely because it exists
// in tenants.json — only a real, active tenant_code passes.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { CompanyWorkspacePanel } from '@/components/admin/CompanyWorkspacePanel';
import { redirect, notFound } from 'next/navigation';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export default async function CompanyWorkspaceDrillInPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const db = getSupabaseServiceClient();
  const { data: tenant, error } = await db.schema('analytics').from('tenant')
    .select('id').eq('tenant_code', companyId).eq('is_active', true).maybeSingle();
  if (error) throw new Error(`[KORA] tenant lookup failed: ${error.message}`);
  if (!tenant) notFound();

  return (
    <CompanyWorkspacePanel
      userEmail={auth.email}
      userRole={auth.koraRole}
      initialTenantCode={companyId}
    />
  );
}
