// app/api/admin/worker-diagnostics/route.ts
// B104: Per-tenant worker provisioning status — KORA_ADMIN only.
//
// Returns aggregate worker counts per tenant.
// NEVER returns individual worker rows, worker_refs, or auth_user_ids.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

interface TenantWorkerState {
  tenantId:    string;
  tenantCode:  string;
  companyName: string;
  workers: {
    total:    number;
    invited:  number;
    active:   number;
    pending:  number;
    disabled: number;
    coveragePct: number;
  };
  provisioningStatus: 'none' | 'partial' | 'active' | 'fully_disabled';
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const db = getSupabaseServiceClient();

  // All active tenants
  const { data: tenants, error: tErr } = await db.schema('analytics').from('tenant')
    .select('id, tenant_code, company_name')
    .eq('is_active', true)
    .order('tenant_code');

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  const results: TenantWorkerState[] = [];

  for (const rawTenant of (tenants ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = rawTenant as any;
    const tenantId   = t.id as string;
    const tenantCode = t.tenant_code as string;

    // Aggregate worker counts — status only, never individual rows
    const { data: rows } = await db.schema('personal').from('worker_identity')
      .select('status')
      .eq('tenant_id', tenantId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = (rows ?? []) as any[];
    const total    = all.length;
    const invited  = all.filter(r => r.status === 'invited').length;
    const active   = all.filter(r => r.status === 'active').length;
    const pending  = all.filter(r => r.status === 'pending').length;
    const disabled = all.filter(r => r.status === 'disabled').length;
    const coveragePct = total > 0 ? Math.round((active / total) * 100) : 0;

    let provisioningStatus: TenantWorkerState['provisioningStatus'] = 'none';
    if (total > 0) {
      if (active > 0) provisioningStatus = 'active';
      else if (disabled === total) provisioningStatus = 'fully_disabled';
      else provisioningStatus = 'partial';
    }

    results.push({
      tenantId,
      tenantCode,
      companyName: t.company_name as string,
      workers: { total, invited, active, pending, disabled, coveragePct },
      provisioningStatus,
    });
  }

  return NextResponse.json({ ok: true, tenants: results, fetchedAt: new Date().toISOString() });
}
