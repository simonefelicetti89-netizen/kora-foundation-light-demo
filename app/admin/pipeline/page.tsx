// /admin/pipeline — B95-B Lifecycle Orchestrator
// KORA Admin can understand the full pilot lifecycle in <60s.
//
// B-TRUTH TenantService Canonical Migration (2026-09-04): the tenant
// identity/status this page shows is now read directly from
// analytics.tenant (canonical) instead of the synthetic
// data/synthetic/tenants.json fixture. Every OTHER step's data source
// (worker provisioning, account provisioning, scoring, data intake) is
// UNCHANGED — those remain separate, later migration slices, still keyed
// by the DEMO_COMPANY_ID constant inside PilotLifecycleClient.tsx.
//
// PILOT_LIFECYCLE_TENANT_CODE is a temporary single-tenant default for this
// still-single-company B95-B UI (see PR #140's KoraTest canonical
// foundation) — an ordinary tenant_code lookup, no special-case branching
// on this or any other tenant_code anywhere in this file or its canonical
// read path.

export const runtime = 'nodejs';

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { PilotLifecycleClient, type CanonicalPilotTenant } from './_components/PilotLifecycleClient';

const PILOT_LIFECYCLE_TENANT_CODE = 'KORATEST-01';

export default async function PilotLifecyclePage() {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, company_name, onboarding_status, decision_pack_status, is_active')
    .eq('tenant_code', PILOT_LIFECYCLE_TENANT_CODE)
    .maybeSingle();

  if (error) throw new Error(`[KORA] tenant lookup failed: ${error.message}`);

  const tenant = (data as CanonicalPilotTenant | null) ?? null;

  return <PilotLifecycleClient tenant={tenant} />;
}
