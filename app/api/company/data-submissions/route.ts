// app/api/company/data-submissions/route.ts
// B39 — Company data submission: list + create.
// COMPANY_ADMIN only (B143: COMPANY_VIEWER rimosso) — tenant from session only.
//
// GET  /api/company/data-submissions  → list own submissions (both roles)
// POST /api/company/data-submissions  → create draft submission (COMPANY_ADMIN only)
//
// Submissions stored as analytics.source_batch rows with source_type='company_submission'.
// Submission metadata stored in payload_sample._cs (company submission block).
// No UEF creation. No scoring. No raw payload in responses.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { detectPiiInPayload } from '@/lib/privacy/pii-guard';
import { randomUUID } from 'crypto';

const PII_TEXT_ERROR = 'Il testo contiene possibili dati personali. Rimuovi nomi, email, telefoni, codici fiscali o riferimenti individuali.';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(db: any, row: Record<string, unknown>): Promise<void> {
  try { await db.schema('audit').from('audit_log').insert(row); }
  catch (e) { console.error('[data-submissions audit]', (e as Error).message); }
}

// Submission type options (maps to source_name labels)
export const SUBMISSION_TYPES = [
  'initiatives', 'budget', 'participation', 'evidence',
  'lms', 'provider', 'policy', 'mixed', 'other',
] as const;
export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

// Valid source_type discriminator for company submissions
export const COMPANY_SUBMISSION_SOURCE_TYPE = 'company_submission';

// Safe fields to expose in company-facing list response
function safeSubmissionForCompany(row: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cs = ((row['payload_sample'] as any) ?? {})?._cs as Record<string, unknown> | undefined;
  return {
    submissionId:    row['id'],
    status:          row['batch_status'],
    submissionType:  cs?.['submission_type'] ?? null,
    period:          row['reporting_period'],
    companyNote:     cs?.['company_note'] ?? null,
    fileCount:       (cs?.['files'] as unknown[] | undefined)?.length ?? 0,
    submittedAt:     cs?.['submitted_at'] ?? null,
    createdAt:       row['created_at'],
    updatedAt:       row['updated_at'],
    // Safe admin comment only if marked company_visible
    adminComment:    cs?.['admin_comment_company_visible'] ? cs['admin_comment'] : null,
    // NO storagePath, NO signedUrl, NO raw payload, NO worker data
  };
}

// ── GET — list submissions for authenticated tenant ────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .schema('analytics').from('source_batch')
    .select('id, batch_status, source_name, reporting_period, row_count, created_at, updated_at, payload_sample')
    .eq('tenant_id', auth.tenantId)
    .eq('source_type', COMPANY_SUBMISSION_SOURCE_TYPE)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: 'Errore caricamento submission.' }, { status: 500 });

  const submissions = (data ?? []).map((row) =>
    safeSubmissionForCompany(row as unknown as Record<string, unknown>),
  );

  return NextResponse.json({
    ok: true,
    submissions,
    total: submissions.length,
    caveat: 'I dati caricati saranno revisionati da KORA Admin prima di entrare nella pipeline di scoring.',
  });
}

// ── POST — create draft submission (COMPANY_ADMIN only) ───────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  if (auth.koraRole !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Company Viewer non può creare submission.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const submissionType = typeof body['submissionType'] === 'string' ? body['submissionType'] : 'other';
  const period         = typeof body['period']         === 'string' ? body['period'].trim()         : '2026-Q1';
  const companyNote    = typeof body['companyNote']    === 'string'
    ? body['companyNote'].trim().slice(0, 300)
    : null;

  if (!SUBMISSION_TYPES.includes(submissionType as SubmissionType)) {
    return NextResponse.json({ error: `submissionType non valido. Valori: ${SUBMISSION_TYPES.join(', ')}` }, { status: 400 });
  }

  // PII guard on free text — must run before any DB operation (fail fast).
  // Wraps the string in { text } so detectPiiInPayload can scan it recursively.
  if (companyNote) {
    const piiScan = detectPiiInPayload({ text: companyNote });
    if (piiScan.hasPii) {
      return NextResponse.json({ error: PII_TEXT_ERROR }, { status: 422 });
    }
  }

  const db = getSupabaseServiceClient();
  const submissionId = randomUUID();

  const csBlock = {
    submission_type:       submissionType,
    company_note:          companyNote,
    submitted_by_email:    auth.email,
    submitted_by_user_id:  auth.id,
    submitted_at:          null,
    files:                 [],
    admin_comment:         null,
    admin_comment_company_visible: false,
    admin_reviewed_by:     null,
    admin_reviewed_at:     null,
    linked_source_batch_id: null,
    created_from_company_workspace: true,
  };

  const { data: created, error: createErr } = await db
    .schema('analytics').from('source_batch')
    .insert({
      id:                  submissionId,
      tenant_id:           auth.tenantId,
      source_type:         COMPANY_SUBMISSION_SOURCE_TYPE,
      source_name:         `[Submission] ${submissionType} — ${period}`,
      reporting_period:    period,
      batch_status:        'submission_draft',
      row_count:           0,
      payload_sample:      { _cs: csBlock },
    })
    .select('id, batch_status, created_at')
    .single();

  if (createErr || !created) {
    return NextResponse.json({ error: `Creazione submission fallita: ${createErr?.message ?? 'unknown'}` }, { status: 500 });
  }

  // Audit
  await logAudit(db, {
    tenant_id:     auth.tenantId,
    actor_role:    auth.koraRole,
    actor_id:      auth.id,
    action:        'company_submission_created',
    resource_type: 'analytics.source_batch',
    resource_id:   submissionId,
    payload:       { submission_type: submissionType, period, company_note_length: companyNote?.length ?? 0, operator: auth.email },
    ip_address:    null,
  });

  return NextResponse.json({
    ok:           true,
    submissionId,
    status:       'submission_draft',
    submissionType,
    period,
    message:      'Submission creata in bozza. Carica i file e poi clicca Invia per completare.',
  }, { status: 201 });
}
