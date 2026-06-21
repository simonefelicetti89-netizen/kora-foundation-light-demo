// app/api/company/data-submissions/history/route.ts
// GET /api/company/data-submissions/history
//
// Returns full upload/batch history for the authenticated company tenant.
// Covers all source_batch types: company_submission + csv_upload (admin-accepted).
//
// Security:
//   - COMPANY_ADMIN or COMPANY_VIEWER (requireCompanyUser).
//   - tenantId ALWAYS from session JWT — never from query param.
//   - No worker-level rows returned. No raw payload. No pseudonym_id.
//   - Eligibility counts from payload_sample (aggregate only).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// Human-readable status labels for company-facing history.
const STATUS_LABEL: Record<string, string> = {
  pending:                        'In attesa di revisione',
  approved:                       'Approvato',
  rejected:                       'Rifiutato',
  archived:                       'Archiviato',
  submission_draft:               'Bozza',
  submission_pending:             'Inviato a KORA',
  submission_needs_clarification: 'Chiarimento richiesto',
  submission_accepted:            'Accettato',
  submission_rejected:            'Rifiutato',
  submission_archived:            'Archiviato',
};

function safeHistoryEntry(row: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = (row['payload_sample'] as any) ?? {};
  const cs      = payload._cs as Record<string, unknown> | undefined;

  const eligibilityCounts = typeof payload._b11_3 === 'undefined' ? null : {
    eligible:       payload['eligible_count']       ?? null,
    limited:        payload['limited_count']        ?? null,
    blocked:        payload['blocked_count']        ?? null,
    reviewRequired: payload['review_required_count'] ?? null,
  };

  return {
    batchId:          row['id'],
    sourceType:       row['source_type'],
    sourceName:       row['source_name'],
    period:           row['reporting_period'],
    status:           row['batch_status'],
    statusLabel:      STATUS_LABEL[row['batch_status'] as string] ?? String(row['batch_status']),
    rowCount:         row['row_count'] ?? null,
    mappedCount:      row['mapped_count'] ?? null,
    rejectedCount:    row['rejected_count'] ?? null,
    createdAt:        row['created_at'],
    updatedAt:        row['updated_at'],
    processedAt:      row['processed_at'] ?? null,
    // Company submission specific fields
    submissionType:   cs?.['submission_type'] ?? null,
    submittedAt:      cs?.['submitted_at'] ?? null,
    fileCount:        (cs?.['files'] as unknown[] | undefined)?.length ?? null,
    adminComment:     cs?.['admin_comment_company_visible'] ? cs['admin_comment'] : null,
    // Eligibility counts if available (from admin intake path)
    eligibilityCounts,
    // Scoring status
    scoringStatus: row['batch_status'] === 'approved' ? 'scored_or_approved' : null,
    // NO storagePath, NO signedUrl, NO worker rows, NO pseudonym_id
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  const db = await getSupabaseServerClient();

  // Return all source_batch rows for this tenant — both company_submission and csv_upload.
  // Tenant isolation: auth.tenantId comes from JWT app_metadata, never from query params.
  const { data, error } = await db
    .schema('analytics')
    .from('source_batch')
    .select('id, source_type, source_name, batch_status, reporting_period, row_count, mapped_count, rejected_count, created_at, updated_at, processed_at, payload_sample')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: 'Errore caricamento cronologia upload.' }, { status: 500 });
  }

  const history = (data ?? []).map((row) =>
    safeHistoryEntry(row as unknown as Record<string, unknown>),
  );

  return NextResponse.json({
    ok:      true,
    history,
    total:   history.length,
    tenantId: auth.tenantId,
    note:    'Cronologia completa dei dati inviati a KORA — nessun dato individuale incluso.',
  });
}
