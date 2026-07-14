// app/api/admin/company-submissions/[id]/review/route.ts
// B39 — Admin review actions on company submission.
// KORA_ADMIN only.
//
// PATCH /api/admin/company-submissions/[id]/review
//
// Actions:
//   needs_clarification — ask company for more info
//   reject              — reject submission with safe reason
//   accept_for_intake   — mark as accepted; admin will continue manually in Data Intake
//   archive             — archive submission
//
// INVARIANTS:
//   - accept_for_intake does NOT auto-score.
//   - accept_for_intake does NOT create UEF records.
//   - accept_for_intake does NOT approve source_batch for scoring pipeline.
//   - Valid transitions enforced (invalid transitions return 422).
//   - All transitions audit logged.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { detectPiiInPayload } from '@/lib/privacy/pii-guard';
import { COMPANY_SUBMISSION_SOURCE_TYPE } from '@/app/api/company/data-submissions/route';
import { assertSameOrigin } from '@/lib/security/origin';

const PII_TEXT_ERROR = 'Il testo contiene possibili dati personali. Rimuovi nomi, email, telefoni, codici fiscali o riferimenti individuali.';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(db: any, row: Record<string, unknown>): Promise<void> {
  try { await db.schema('audit').from('audit_log').insert(row); }
  catch (e) { console.error('[company-submissions/review audit]', (e as Error).message); }
}

type ReviewAction = 'needs_clarification' | 'reject' | 'accept_for_intake' | 'archive';

// Valid state transitions
const VALID_TRANSITIONS: Record<string, ReviewAction[]> = {
  submission_pending:             ['needs_clarification', 'reject', 'accept_for_intake', 'archive'],
  submission_needs_clarification: ['needs_clarification', 'reject', 'accept_for_intake', 'archive'],
  submission_draft:               ['reject', 'archive'],  // admin can reject/archive even drafts
  submission_accepted:            ['archive'],             // accepted is near-final; only archive allowed
  submission_rejected:            ['archive'],             // rejected can only be archived
  submission_archived:            [],                      // terminal state
};

function actionToStatus(action: ReviewAction): string {
  switch (action) {
    case 'needs_clarification': return 'submission_needs_clarification';
    case 'reject':              return 'submission_rejected';
    case 'accept_for_intake':   return 'submission_accepted';
    case 'archive':             return 'submission_archived';
  }
}

function actionToAuditEvent(action: ReviewAction): string {
  switch (action) {
    case 'needs_clarification': return 'company_submission_needs_clarification';
    case 'reject':              return 'company_submission_rejected';
    case 'accept_for_intake':   return 'company_submission_accepted_for_intake';
    case 'archive':             return 'company_submission_archived';
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const { id: submissionId } = await params;

  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const action = typeof body['action'] === 'string' ? body['action'].trim() as ReviewAction : null;
  if (!action || !(['needs_clarification','reject','accept_for_intake','archive'] as string[]).includes(action)) {
    return NextResponse.json({
      error: 'Campo "action" obbligatorio. Valori: needs_clarification, reject, accept_for_intake, archive.',
    }, { status: 400 });
  }

  // Admin comment — max 500 chars + PII guard (fail fast, before any DB operation)
  const adminComment = typeof body['adminComment'] === 'string'
    ? body['adminComment'].trim().slice(0, 500)
    : null;
  const commentCompanyVisible = body['commentCompanyVisible'] === true;

  if (adminComment) {
    const piiScan = detectPiiInPayload({ text: adminComment });
    if (piiScan.hasPii) {
      return NextResponse.json({ error: PII_TEXT_ERROR }, { status: 422 });
    }
  }

  const db = getSupabaseServiceClient();

  const { data: subRow, error: subErr } = await db
    .schema('analytics').from('source_batch')
    .select('id, tenant_id, batch_status, payload_sample')
    .eq('id', submissionId)
    .eq('source_type', COMPANY_SUBMISSION_SOURCE_TYPE)
    .maybeSingle();

  if (subErr || !subRow) {
    return NextResponse.json({ error: 'Submission non trovata.' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subRow as any;
  const currentStatus: string = sub.batch_status;
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

  if (!allowed.includes(action)) {
    return NextResponse.json({
      error: `Transizione non valida: "${currentStatus}" → "${action}". Transizioni consentite: ${allowed.join(', ') || 'nessuna'}.`,
      currentStatus,
      requestedAction: action,
    }, { status: 422 });
  }

  const newStatus = actionToStatus(action);
  const now       = new Date().toISOString();

  const updatedCs: Record<string, unknown> = {
    ...((sub.payload_sample?._cs ?? {}) as Record<string, unknown>),
    admin_comment:                adminComment,
    admin_comment_company_visible: commentCompanyVisible,
    admin_reviewed_by:            auth.email,
    admin_reviewed_at:            now,
  };

  // For accept_for_intake: add data-intake CTA link in metadata
  if (action === 'accept_for_intake') {
    const { data: tenantRow } = await db.schema('analytics').from('tenant')
      .select('tenant_code')
      .eq('id', sub.tenant_id)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenantCode = (tenantRow as any)?.tenant_code ?? '';
    const period = ((sub.payload_sample?._cs as Record<string, unknown> | undefined)?.['period'] ?? '2026-Q1') as string;
    updatedCs['intake_cta_url'] = `/admin/data-intake?tenantCode=${encodeURIComponent(tenantCode)}&reportingPeriod=${encodeURIComponent(period)}`;
    updatedCs['intake_cta_note'] = 'Continua manualmente in Data Intake per creare il batch ufficiale. Accepted_for_intake non crea UEF, non avvia scoring, non bypassa Match Review o UEF Review.';
  }

  const { error: updateErr } = await db
    .schema('analytics').from('source_batch')
    .update({
      batch_status:   newStatus,
      payload_sample: { ...(sub.payload_sample ?? {}), _cs: updatedCs },
      updated_at:     now,
    })
    .eq('id', submissionId);

  if (updateErr) {
    return NextResponse.json({ error: `Aggiornamento stato fallito: ${updateErr.message}` }, { status: 500 });
  }

  // Audit: review action
  await logAudit(db, {
    tenant_id:     sub.tenant_id as string,
    actor_role:    'KORA_ADMIN',
    actor_id:      auth.id,
    action:        actionToAuditEvent(action),
    resource_type: 'analytics.source_batch',
    resource_id:   submissionId,
    payload: {
      previous_status:         currentStatus,
      new_status:              newStatus,
      admin_comment_provided:  !!adminComment,
      comment_company_visible: commentCompanyVisible,
      operator:                auth.email,
    },
    ip_address: null,
  });

  // Build response
  const response: Record<string, unknown> = {
    ok:            true,
    submissionId,
    action,
    previousStatus: currentStatus,
    newStatus,
    reviewedAt:    now,
  };

  if (action === 'accept_for_intake') {
    response['intakeNote'] = 'Accepted for intake. Aprire Data Intake per creare il batch ufficiale manualmente. Nessuno scoring automatico. Nessuna UEF generata.';
    response['intakeCta'] = updatedCs['intake_cta_url'];
  }

  return NextResponse.json(response);
}
