// app/api/company/data-submissions/[id]/submit/route.ts
// B39 — Submit company data submission for KORA Admin review.
// COMPANY_ADMIN only.
//
// POST /api/company/data-submissions/[id]/submit
//
// Transitions status: submission_draft → submission_pending
// Validates: has at least one file, belongs to tenant, is in draft.
// Does NOT create UEF. Does NOT trigger scoring. Does NOT create source_batch intake.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { COMPANY_SUBMISSION_SOURCE_TYPE } from '../../route';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(db: any, row: Record<string, unknown>): Promise<void> {
  try { await db.schema('audit').from('audit_log').insert(row); }
  catch (e) { console.error('[data-submissions/submit audit]', (e as Error).message); }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: submissionId } = await params;

  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  if (auth.koraRole !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Company Viewer non può inviare submission.' }, { status: 403 });
  }

  const db = getSupabaseServiceClient();

  const { data: subRow, error: subErr } = await db
    .schema('analytics').from('source_batch')
    .select('id, tenant_id, batch_status, payload_sample')
    .eq('id', submissionId)
    .eq('tenant_id', auth.tenantId)
    .eq('source_type', COMPANY_SUBMISSION_SOURCE_TYPE)
    .maybeSingle();

  if (subErr || !subRow) {
    return NextResponse.json({ error: 'Submission non trovata.' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subRow as any;

  if (sub.batch_status !== 'submission_draft') {
    return NextResponse.json({
      error: `Impossibile inviare: lo stato attuale è "${sub.batch_status}". Solo le bozze possono essere inviate.`,
    }, { status: 422 });
  }

  // Must have at least one file
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const files = (sub.payload_sample?._cs?.files ?? []) as any[];
  if (files.length === 0) {
    return NextResponse.json({ error: 'Aggiungere almeno un file prima di inviare.' }, { status: 422 });
  }

  const now = new Date().toISOString();
  const updatedCs = {
    ...((sub.payload_sample?._cs ?? {}) as Record<string, unknown>),
    submitted_at: now,
  };

  const { error: updateErr } = await db
    .schema('analytics').from('source_batch')
    .update({
      batch_status:   'submission_pending',
      payload_sample: { ...(sub.payload_sample ?? {}), _cs: updatedCs },
      updated_at:     now,
    })
    .eq('id', submissionId)
    .eq('tenant_id', auth.tenantId);

  if (updateErr) {
    return NextResponse.json({ error: 'Errore aggiornamento stato submission.' }, { status: 500 });
  }

  await logAudit(db, {
    tenant_id:     auth.tenantId,
    actor_role:    auth.koraRole,
    actor_id:      auth.id,
    action:        'company_submission_submitted',
    resource_type: 'analytics.source_batch',
    resource_id:   submissionId,
    payload:       { file_count: files.length, submitted_at: now, operator: auth.email },
    ip_address:    null,
  });

  return NextResponse.json({
    ok:          true,
    submissionId,
    status:      'submission_pending',
    submittedAt: now,
    message:     'Submission inviata a KORA Admin per la revisione. Riceverai aggiornamenti di stato.',
  });
}
