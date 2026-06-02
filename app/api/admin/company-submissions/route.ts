// app/api/admin/company-submissions/route.ts
// B39 — Admin company submission review queue.
// KORA_ADMIN only.
//
// GET /api/admin/company-submissions
//   ?tenantId=  (optional — filter by tenant)
//   ?status=    (optional — filter by batch_status)

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { COMPANY_SUBMISSION_SOURCE_TYPE } from '@/app/api/company/data-submissions/route';

export async function GET(request: NextRequest) {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const filterTenant = searchParams.get('tenantId')?.trim() ?? null;
  const filterStatus = searchParams.get('status')?.trim()   ?? null;

  const db = getSupabaseServiceClient();

  let query = db
    .schema('analytics').from('source_batch')
    .select('id, tenant_id, batch_status, source_name, reporting_period, row_count, created_at, updated_at, payload_sample')
    .eq('source_type', COMPANY_SUBMISSION_SOURCE_TYPE)
    .order('created_at', { ascending: false })
    .limit(200);

  if (filterTenant) query = query.eq('tenant_id', filterTenant);
  if (filterStatus) query = query.eq('batch_status', filterStatus);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tenantIds = [...new Set((data ?? []).map((r: any) => r.tenant_id as string))];

  // Enrich with company names
  const companyMap: Record<string, string> = {};
  const tenantCodeMap: Record<string, string> = {};
  if (tenantIds.length > 0) {
    const { data: tenantRows } = await db
      .schema('analytics').from('tenant')
      .select('id, company_name, tenant_code')
      .in('id', tenantIds);
    for (const t of tenantRows ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = t as any;
      companyMap[row.id]     = row.company_name;
      tenantCodeMap[row.id]  = row.tenant_code;
    }
  }

  const submissions = (data ?? []).map((row: any) => {
    const cs = (row.payload_sample?._cs ?? {}) as Record<string, unknown>;
    const safeFiles = ((cs['files'] ?? []) as Record<string, unknown>[]).map((f) => ({
      fileId:        f['file_id'],
      safeName:      f['safe_name'],
      fileType:      f['file_type'],
      fileSizeBytes: f['file_size_bytes'],
      purpose:       f['purpose'],
      uploadedAt:    f['uploaded_at'],
      storageStatus: f['storage_status'],
      // ADMIN: no storagePath in list — use separate GET single for details if needed
    }));

    return {
      submissionId:       row.id,
      tenantId:           row.tenant_id,
      companyName:        companyMap[row.tenant_id] ?? row.tenant_id,
      tenantCode:         tenantCodeMap[row.tenant_id] ?? null,
      status:             row.batch_status,
      submissionType:     cs['submission_type'] ?? null,
      period:             row.reporting_period,
      fileCount:          safeFiles.length,
      files:              safeFiles,
      submittedByEmail:   cs['submitted_by_email'] ?? null,
      submittedAt:        cs['submitted_at'] ?? null,
      companyNote:        cs['company_note'] ?? null,
      adminComment:       cs['admin_comment'] ?? null,
      adminReviewedBy:    cs['admin_reviewed_by'] ?? null,
      adminReviewedAt:    cs['admin_reviewed_at'] ?? null,
      linkedSourceBatchId: cs['linked_source_batch_id'] ?? null,
      createdAt:          row.created_at,
      updatedAt:          row.updated_at,
      // Quick action URLs
      quickActions: {
        review: `/admin/company-submissions`,
        workspace: `/admin/company-workspace?tenantCode=${encodeURIComponent(tenantCodeMap[row.tenant_id] ?? '')}&reportingPeriod=${encodeURIComponent(row.reporting_period ?? '2026-Q1')}`,
        dataIntake: `/admin/data-intake?tenantCode=${encodeURIComponent(tenantCodeMap[row.tenant_id] ?? '')}&reportingPeriod=${encodeURIComponent(row.reporting_period ?? '2026-Q1')}`,
      },
    };
  });

  const pendingCount         = submissions.filter((s) => s.status === 'submission_pending').length;
  const needsClarificationCount = submissions.filter((s) => s.status === 'submission_needs_clarification').length;

  return NextResponse.json({
    ok: true,
    submissions,
    total: submissions.length,
    summary: {
      pending:            pendingCount,
      needs_clarification: needsClarificationCount,
      accepted:           submissions.filter((s) => s.status === 'submission_accepted').length,
      rejected:           submissions.filter((s) => s.status === 'submission_rejected').length,
    },
    generatedAt: new Date().toISOString(),
  });
}
