// app/api/company/evidence-archive/route.ts
// B36 PART 2 — Company evidence archive — read-only — COMPANY_ADMIN / COMPANY_VIEWER only.
//
// GET /api/company/evidence-archive
//
// Tenant is ALWAYS derived from authenticated session — never from query params.
//
// Returns safe, read-only evidence metadata:
//   - batch summaries (no raw payload, no mapping details beyond counts)
//   - initiative safe names (category-level only)
//   - evidence level, review status, lifecycle status
//   - attachment presence/status (metadata only — no storagePath, no signedUrl)
//
// NEVER returns:
//   - pseudonym_id, worker names, raw payload, raw_hash
//   - storagePath, signedUrl, attachment raw content
//   - lifecycle mutation actions (archive/restore/remove — not available to company users)
//   - admin-only fields (source_notes, created_by)

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { resolveLifecycleStatus, LIFECYCLE_LABELS } from '@/lib/data-intake/attachment-lifecycle';

// ── PII patterns — same guard as admin archive ─────────────────────────────────
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  /\b[A-Z][A-Z0-9]{15}\b/,
  /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/,
];

function buildSafeName(params: { initiativeName?: string | null; actionFamily?: string | null; idx: number }): string {
  const { initiativeName, actionFamily, idx } = params;
  if (initiativeName && initiativeName.length > 0 && initiativeName.length <= 100) {
    const name = initiativeName.trim();
    if (!PII_PATTERNS.some(p => p.test(name))) return name.slice(0, 80);
  }
  if (actionFamily && actionFamily.length > 0) return `[${actionFamily}] Iniziativa #${idx + 1}`;
  return `Iniziativa #${idx + 1}`;
}

export async function GET(request: NextRequest) {
  const authResult = await requireCompanyUser(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { tenantId } = authResult;

  const { searchParams } = new URL(request.url);
  const reportingPeriod = (searchParams.get('reportingPeriod') ?? '').trim();

  const db = getSupabaseServiceClient();

  // ── 1. Tenant info ─────────────────────────────────────────────────────────
  const { data: tenantRow } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, company_name, methodology_version_id')
    .eq('id', tenantId)
    .maybeSingle();

  if (!tenantRow) return NextResponse.json({ error: 'Workspace non trovato.' }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenantRow as any;

  // ── 2. Source batches ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let batchQuery: any = db
    .schema('analytics').from('source_batch')
    .select('id, source_type, batch_status, row_count, created_at, payload_sample')
    .eq('tenant_id', tenantId)
    .neq('batch_status', 'rejected')
    .order('created_at', { ascending: false });

  if (reportingPeriod) batchQuery = batchQuery.eq('reporting_period', reportingPeriod);

  const { data: batchRows, error: bErr } = await batchQuery;
  if (bErr) return NextResponse.json({ error: 'Errore caricamento archivio.' }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batches = ((batchRows ?? []) as any[]).map(b => {
    const ps = (b.payload_sample ?? {}) as Record<string, unknown>;

    // Attachment metadata — safe fields only, NO storagePath, NO signedUrl
    const attachmentSummary = Array.isArray(ps['_b31_attachments'])
      ? (ps['_b31_attachments'] as Record<string, unknown>[]).map(a => {
          const lifecycle = resolveLifecycleStatus(a);
          return {
            attachmentId:   a['attachmentId'],
            fileNameSafe:   a['fileNameSafe'],
            fileType:       a['fileType'],
            fileSizeBytes:  a['fileSizeBytes'],
            attachmentType: a['attachmentType'],
            storageStatus:  a['storageStatus'] ?? 'metadata_only',
            lifecycleStatus: lifecycle,
            lifecycleLabel:  LIFECYCLE_LABELS[lifecycle],
            // Company users cannot open attachments via this endpoint — no canOpen flag
            // Attachment open is controlled by /api/admin/evidence-attachments/signed-url (admin only)
            createdAt: a['createdAt'],
            // NEVER expose: storagePath, storageBucket, signedUrl
          };
        })
      : [];

    return {
      batchId:        (b.id as string).slice(0, 8) + '…',
      batchIdFull:    b.id as string,
      createdAt:      b.created_at as string,
      sourceType:     b.source_type as string,
      batchStatus:    b.batch_status as string,
      rowCount:       b.row_count as number,
      fileType:       typeof ps['fileType'] === 'string' ? ps['fileType'] : null,
      hasAttachments: Boolean(ps['_b31']),
      attachmentCount: attachmentSummary.length,
      attachments:    attachmentSummary,
    };
  });

  // ── 3. Uploaded records — safe fields only ─────────────────────────────────
  const batchIds = batches.map(b => b.batchIdFull);

  if (batchIds.length === 0) {
    return NextResponse.json({
      ok: true,
      tenant: { companyName: t.company_name, methodologyVersion: t.methodology_version_id },
      reportingPeriod: reportingPeriod || 'all',
      batches: [],
      initiatives: [],
      summary: { total: 0, withEvidence: 0, pendingReview: 0, approved: 0 },
      readOnly: true,
      caveat: 'Nessuna evidenza caricata per questo periodo.',
    });
  }

  const { data: recordRows, error: rErr } = await db
    .schema('personal').from('uploaded_record')
    // NEVER select: pseudonym_id, raw_hash, created_by
    .select('id, batch_id, eligibility_status, primary_pillar, action_family, event_nature, review_status, payload')
    .in('batch_id', batchIds)
    .limit(300);

  if (rErr) return NextResponse.json({ error: 'Errore caricamento evidenze.' }, { status: 500 });

  // ── 4. Build initiatives (safe summaries) ──────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRecords = (recordRows ?? []) as any[];

  let withEvidence = 0;
  let pendingReview = 0;
  let approved = 0;

  const initiatives = allRecords.map((rec, idx) => {
    const payload = (rec.payload ?? {}) as Record<string, unknown>;
    const initiativeName = typeof payload['initiative_name'] === 'string' ? payload['initiative_name'] : undefined;
    const evidenceLevel  = typeof payload['evidence_level']  === 'string' ? payload['evidence_level']  : undefined;
    const budgetClass    = typeof payload['budget_class']    === 'string' ? payload['budget_class']    : undefined;

    const safeName = buildSafeName({ initiativeName, actionFamily: rec.action_family as string | null, idx });

    if (evidenceLevel) withEvidence++;
    if (rec.review_status === 'pending_review' || rec.review_status === 'pending') pendingReview++;
    if (rec.review_status === 'approved' || rec.review_status === 'approved_for_scoring') approved++;

    return {
      // Safe short ID for display — not full UUID for company users
      id:           (rec.id as string).slice(0, 8) + '…',
      recordIdFull: rec.id as string,
      batchIdFull:  rec.batch_id as string,
      safeName,
      pillar:       (rec.primary_pillar as string | null) ?? null,
      // Category-level only — no raw values, no worker data
      actionFamily:    (rec.action_family as string | null) ?? null,
      evidenceLevel:   evidenceLevel ?? null,
      budgetClass:     budgetClass ?? null,
      reviewStatus:    rec.review_status as string,
      eligibility:     rec.eligibility_status as string,
      // Note: NO lifecycle actions, NO attachment open for company users
    };
  });

  return NextResponse.json({
    ok: true,
    tenant: {
      companyName:       t.company_name as string,
      methodologyVersion: t.methodology_version_id as string,
      calibrationStatus: 'pre_empirical_calibration',
    },
    reportingPeriod: reportingPeriod || 'all',
    batches,
    initiatives,
    summary: {
      total:        initiatives.length,
      withEvidence,
      pendingReview,
      approved,
    },
    readOnly:  true,
    canMutate: false,
    // Non-suppressible privacy notice
    privacyNote: 'Nessun dato individuale del lavoratore incluso. Soglia privacy N≥10 applicata. Pseudonym ID non esposto.',
    caveat: 'Archivio evidenze in sola lettura. Le azioni sul ciclo di vita degli allegati sono riservate all\'operatore KORA Admin.',
  });
}
