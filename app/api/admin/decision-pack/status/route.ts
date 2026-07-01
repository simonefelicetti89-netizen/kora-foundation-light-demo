// app/api/admin/decision-pack/status/route.ts
// Decision Pack lifecycle promotion — KORA_ADMIN only.
//
// POST: advance status along the lifecycle: draft → ready → exported.
// Validates transition, updates the latest version for tenant+period,
// writes audit log. Controlled-error strategy: if the status update
// succeeds but audit log insert fails, returns 200 with auditWarning
// (never silent failure, never rollback for audit).
//
// Allowed transitions:
//   draft  → ready    ✓
//   ready  → exported ✓
//   all other combinations → 422
//
// Body: { tenantCode, reportingPeriod, nextStatus: 'ready' | 'exported' }

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

type AllowedNextStatus = 'ready' | 'exported';

function canTransition(current: string, next: AllowedNextStatus): boolean {
  if (current === 'draft' && next === 'ready')    return true;
  if (current === 'ready' && next === 'exported') return true;
  return false;
}

function allowedFrom(current: string): string[] {
  if (current === 'draft') return ['ready'];
  if (current === 'ready') return ['exported'];
  return [];
}

export async function POST(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tenantCode, reportingPeriod, nextStatus } = body as {
    tenantCode?: string;
    reportingPeriod?: string;
    nextStatus?: string;
  };

  if (!tenantCode || !reportingPeriod || !nextStatus) {
    return NextResponse.json(
      { error: 'tenantCode, reportingPeriod, nextStatus are all required' },
      { status: 400 },
    );
  }

  if (nextStatus !== 'ready' && nextStatus !== 'exported') {
    return NextResponse.json(
      { error: `nextStatus must be 'ready' or 'exported'. Received: '${nextStatus}'` },
      { status: 400 },
    );
  }

  const db = getSupabaseServiceClient();

  // ── Resolve tenant ─────────────────────────────────────────────────────────

  const { data: tenant, error: tenantErr } = await db.schema('analytics').from('tenant')
    .select('id').eq('tenant_code', tenantCode).maybeSingle();
  if (tenantErr) {
    return NextResponse.json({ error: `Tenant lookup failed: ${tenantErr.message}` }, { status: 500 });
  }
  if (!tenant) {
    return NextResponse.json({ error: `Tenant not found: ${tenantCode}` }, { status: 404 });
  }
  const tenantId = (tenant as { id: string }).id;

  // ── Fetch latest Decision Pack for this tenant + period ────────────────────

  const { data: dp, error: fetchErr } = await db.schema('analytics').from('decision_pack_version')
    .select('id, version_id, status, created_at')
    .eq('tenant_id', tenantId)
    .eq('reporting_period', reportingPeriod)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: `DB fetch failed: ${fetchErr.message}` }, { status: 500 });
  }
  if (!dp) {
    return NextResponse.json(
      { error: `No Decision Pack found for ${tenantCode} / ${reportingPeriod}. Run operator flow first.` },
      { status: 404 },
    );
  }

  const currentStatus = (dp as { status: string }).status;
  const dpId          = (dp as { id: string }).id;
  const versionId     = (dp as { version_id: string }).version_id;

  // ── Validate transition ────────────────────────────────────────────────────

  if (!canTransition(currentStatus, nextStatus as AllowedNextStatus)) {
    return NextResponse.json(
      {
        error:              `Transition not allowed: '${currentStatus}' → '${nextStatus}'`,
        currentStatus,
        allowedTransitions: allowedFrom(currentStatus),
      },
      { status: 422 },
    );
  }

  // ── Update status ──────────────────────────────────────────────────────────
  // exported_at is set when transitioning to 'exported' (field exists in schema).
  // ready_at does not exist in schema — do not set it.

  const updatePayload: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === 'exported') {
    updatePayload['exported_at'] = new Date().toISOString();
  }

  const { error: updateErr } = await db.schema('analytics').from('decision_pack_version')
    .update(updatePayload)
    .eq('id', dpId);
  if (updateErr) {
    return NextResponse.json(
      { error: `Status update failed: ${updateErr.message}` },
      { status: 500 },
    );
  }

  const updatedAt = new Date().toISOString();

  // ── Audit log ──────────────────────────────────────────────────────────────
  // Controlled error: status is already updated above.
  // If audit insert fails → return 200 with auditWarning (not silent, not rollback).

  let auditEventId: string | null = null;
  let auditWarning: string | null = null;

  const { data: auditData, error: auditErr } = await db.schema('audit').from('audit_log')
    .insert({
      tenant_id:     tenantId,
      actor_role:    'KORA_ADMIN',
      actor_id:      authResult.id,
      action:        `decision_pack_status_${nextStatus}` as string,
      resource_type: 'analytics.decision_pack_version',
      resource_id:   dpId,
      payload: {
        previous_status:  currentStatus,
        next_status:      nextStatus,
        version_id:       versionId,
        reporting_period: reportingPeriod,
        operator_email:   authResult.email,
      },
      ip_address: null,
    })
    .select('id')
    .single();

  if (auditErr) {
    auditWarning = `Audit log insert failed: ${auditErr.message}`;
    console.error('[decision-pack/status] audit_log:', auditErr.message);
  } else {
    auditEventId = (auditData as { id: string } | null)?.id ?? null;
  }

  return NextResponse.json({
    ok:             true,
    decisionPackId: dpId,
    versionId,
    previousStatus: currentStatus,
    nextStatus,
    updatedAt,
    auditEventId,
    ...(auditWarning ? { auditWarning } : {}),
  });
}
