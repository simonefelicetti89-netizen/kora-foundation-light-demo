// app/api/admin/workers/list/route.ts
// B104: List workers for a tenant — KORA_ADMIN only.
//
// Returns worker_identity rows filtered by tenant.
// NEVER returns personal.worker_profile_private data.
// Company roles cannot call this route.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const tenantCode = (searchParams.get('tenantCode') ?? '').trim();

  if (!tenantCode) return NextResponse.json({ error: 'tenantCode is required' }, { status: 400 });

  const db = getSupabaseServiceClient();

  const { data: tenantRow, error: tErr } = await db.schema('analytics').from('tenant')
    .select('id')
    .eq('tenant_code', tenantCode)
    .eq('is_active', true)
    .maybeSingle();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!tenantRow) return NextResponse.json({ error: `Tenant not found: ${tenantCode}` }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantId = (tenantRow as any).id as string;

  const { data: rows, error: wErr } = await db.schema('personal').from('worker_identity')
    .select('id, worker_ref, status, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workers = (rows ?? []).map((r: any) => ({
    workerId:  r.id as string,
    workerRef: r.worker_ref as string,
    status:    r.status as string,
    createdAt: r.created_at as string,
  }));

  const summary = {
    total:    workers.length,
    invited:  workers.filter(w => w.status === 'invited').length,
    active:   workers.filter(w => w.status === 'active').length,
    pending:  workers.filter(w => w.status === 'pending').length,
    disabled: workers.filter(w => w.status === 'disabled').length,
  };

  return NextResponse.json({ ok: true, tenantCode, workers, summary });
}
