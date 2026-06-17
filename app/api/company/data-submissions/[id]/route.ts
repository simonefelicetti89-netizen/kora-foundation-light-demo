// app/api/company/data-submissions/[id]/route.ts
// B39 — Get single company data submission. Both roles (read-only).
//
// GET /api/company/data-submissions/[id]
//
// Returns safe metadata only. No storagePath, no signedUrl, no raw payload.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { COMPANY_SUBMISSION_SOURCE_TYPE } from '../route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: submissionId } = await params;

  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  const db = await getSupabaseServerClient();

  const { data: subRow, error } = await db
    .schema('analytics').from('source_batch')
    .select('id, batch_status, source_name, reporting_period, row_count, created_at, updated_at, payload_sample')
    .eq('id', submissionId)
    .eq('tenant_id', auth.tenantId)
    .eq('source_type', COMPANY_SUBMISSION_SOURCE_TYPE)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Errore caricamento submission.' }, { status: 500 });
  if (!subRow) return NextResponse.json({ error: 'Submission non trovata.' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subRow as any;
  const cs = (sub.payload_sample?._cs ?? {}) as Record<string, unknown>;

  // Safe file metadata — NO storagePath, NO signedUrl
  const safeFiles = ((cs['files'] ?? []) as Record<string, unknown>[]).map((f) => ({
    fileId:        f['file_id'],
    safeName:      f['safe_name'],
    fileType:      f['file_type'],
    fileSizeBytes: f['file_size_bytes'],
    purpose:       f['purpose'],
    uploadedAt:    f['uploaded_at'],
    storageStatus: f['storage_status'],
    rowCount:      f['row_count'] ?? null,
  }));

  return NextResponse.json({
    ok:             true,
    submissionId,
    status:         sub.batch_status,
    submissionType: cs['submission_type'] ?? null,
    period:         sub.reporting_period,
    companyNote:    cs['company_note'] ?? null,
    files:          safeFiles,
    fileCount:      safeFiles.length,
    submittedAt:    cs['submitted_at'] ?? null,
    createdAt:      sub.created_at,
    updatedAt:      sub.updated_at,
    // Admin comment — only if marked company_visible
    adminComment:   cs['admin_comment_company_visible'] ? cs['admin_comment'] : null,
  });
}
