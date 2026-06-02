// app/api/admin/company-evidence-archive/route.ts
// B29: Company Evidence Archive — read-only lineage API. KORA_ADMIN only.
//
// Returns safe evidence lineage for a tenant+period:
//   - Batch archive (B27/B28 metadata from payload_sample)
//   - Contribution summary counts per role
//   - Per-initiative safe summaries (no raw payload, no PII, no pseudonym_id)
//
// NEVER returns:
//   - pseudonym_id, raw_hash, created_by
//   - full payload JSON
//   - enrichment_notes, free-text manual notes
//   - worker names, emails, phones, CFs, IBANs
//   - individual health data
//   - data below N<10 threshold if segmented
//   - operational actions (no edit, no upload, no scoring, no delete)

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { deriveContributionRole, CONTRIBUTION_ROLE_LABELS } from '@/lib/live/contribution-lineage';
import type { ContributionRole } from '@/lib/live/contribution-lineage';
import { resolveLifecycleStatus, LIFECYCLE_LABELS, LIFECYCLE_CAN_OPEN } from '@/lib/data-intake/attachment-lifecycle';

// ── PII-safe name extraction ───────────────────────────────────────────────────
// Extracts a display name from action_family/event_nature (safe category-level fields).
// NEVER uses worker names or personal identifiers.

const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,  // email
  /\b[A-Z][A-Z0-9]{15}\b/,                                   // CF-like (rough)
  /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/,                      // phone-like
];

function buildSafeName(params: {
  initiativeName?: string | null;
  actionFamily?: string | null;
  eventNature?: string | null;
  idx: number;
}): string {
  const { initiativeName, actionFamily, eventNature, idx } = params;

  // Try initiative_name from payload first (canonical safe field)
  if (initiativeName && initiativeName.length > 0 && initiativeName.length <= 100) {
    const name = initiativeName.trim();
    const hasPii = PII_PATTERNS.some(p => p.test(name));
    if (!hasPii) return name.slice(0, 80);
  }

  // Fall back to action_family (category-level, safe)
  if (actionFamily && actionFamily.length > 0) {
    return `[${actionFamily}] Iniziativa #${idx + 1}`;
  }

  // Fall back to event_nature
  if (eventNature && eventNature.length > 0) {
    return `${eventNature} #${idx + 1}`;
  }

  return `Iniziativa #${idx + 1}`;
}

// ── Safe payload field extraction ─────────────────────────────────────────────
// Extracts only known-safe canonical fields from uploaded_record.payload.
// NEVER extracts raw values, free-text notes, or personal data.

function extractSafePayloadFields(payload: Record<string, unknown>): {
  initiativeName?: string;
  budgetClass?: string;
  evidenceLevel?: string;
  hasManualCompletion: boolean;
  manualFields: string[];
  hasB27Mapping: boolean;
  hasB28MultiFile: boolean;
  hasB30Provenance: boolean;
  provenanceSummary?: Record<string, unknown>;
} {
  // Extract provenance summary (safe — no raw values)
  const provObj = payload['_field_provenance'] as Record<string, unknown> | null | undefined;
  const provenanceSummary = provObj ? extractSafeProvenanceSummary(provObj) : undefined;

  return {
    initiativeName:    typeof payload['initiative_name'] === 'string' ? payload['initiative_name'] : undefined,
    budgetClass:       typeof payload['budget_class']    === 'string' ? payload['budget_class']    : undefined,
    evidenceLevel:     typeof payload['evidence_level']  === 'string' ? payload['evidence_level']  : undefined,
    hasManualCompletion: Boolean(payload['_manual_completion']),
    manualFields:      Array.isArray(payload['_manual_fields']) ? (payload['_manual_fields'] as string[]).slice(0, 10) : [],
    hasB27Mapping:     Boolean(payload['_b27']) || Boolean(payload['b27_mapping']),
    hasB28MultiFile:   Boolean(payload['_b28']),
    hasB30Provenance:  Boolean(provObj),
    provenanceSummary,
  };
}

function extractSafeProvenanceSummary(provObj: Record<string, unknown>): Record<string, unknown> {
  // Summarize provenance kinds + B30.1 source roles — no raw values
  const kinds: Record<string, number> = {};
  const sourceRoles = new Set<string>();
  const PROV_KIND_MAP: Record<string, string> = {
    o: 'original_file', c: 'column_mapping', m: 'manual_completion',
    f: 'multi_file_merge', d: 'derived', s: 'system_default',
  };
  let conflictRetainedCount = 0;
  let preciseSourceCount = 0;

  for (const [, fp] of Object.entries(provObj)) {
    if (typeof fp === 'object' && fp !== null) {
      const f = fp as Record<string, unknown>;
      const k = f['k'] as string;
      const kind = PROV_KIND_MAP[k] ?? k ?? 'unknown';
      kinds[kind] = (kinds[kind] ?? 0) + 1;

      // B30.1: collect source roles from merged fields (safe — no raw values)
      if (f['role'] && typeof f['role'] === 'string') {
        sourceRoles.add(f['role']);
      }
      // B30.1: count conflict-retained fields
      const fl = (f['fl'] as number) ?? 0;
      if (fl & 8) conflictRetainedCount++;  // bit 3 = conflictRetained
      // B30.1: count fields with precise source (fi = sourceFileIndex)
      if (f['fi'] !== undefined) preciseSourceCount++;
    }
  }

  return {
    fieldCount: Object.keys(provObj).length,
    kindCounts: kinds,
    sourceRoles: [...sourceRoles],       // safe: only role names (budget/lms/provider/etc.)
    conflictRetainedCount,
    preciseSourceCount,
  };
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const tenantCode      = (searchParams.get('tenantCode') ?? '').trim();
  const reportingPeriod = (searchParams.get('reportingPeriod') ?? '').trim();

  if (!tenantCode) {
    return NextResponse.json({ error: 'tenantCode is required.' }, { status: 400 });
  }

  const db = getSupabaseServiceClient();

  // ── 1. Tenant lookup ──────────────────────────────────────────────────────
  const { data: tenantRow, error: tErr } = await db.schema('analytics').from('tenant')
    .select('id, tenant_code, company_name')
    .eq('tenant_code', tenantCode).eq('is_active', true).maybeSingle();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!tenantRow) return NextResponse.json({ error: `Tenant not found: ${tenantCode}` }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenantRow as any;
  const tenantId = t.id as string;

  // ── 2. Source batches ─────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let batchQuery: any = db.schema('analytics').from('source_batch')
    .select('id, source_name, source_type, batch_status, row_count, created_at, payload_sample, source_notes')
    .eq('tenant_id', tenantId)
    .neq('batch_status', 'rejected')
    .order('created_at', { ascending: false });

  if (reportingPeriod) batchQuery = batchQuery.eq('reporting_period', reportingPeriod);

  const { data: batchRows, error: bErr } = await batchQuery;
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batches = ((batchRows ?? []) as any[]).map(b => {
    const ps = (b.payload_sample ?? {}) as Record<string, unknown>;
    return {
      batchId:              (b.id as string).slice(0, 8) + '…',
      batchIdFull:          b.id as string,  // B31: needed for attachment register
      createdAt:            b.created_at as string,
      sourceType:           b.source_type as string,
      sourceName:           (b.source_name as string | null) ?? null,
      batchStatus:          b.batch_status as string,
      rowCount:             b.row_count as number,
      // B26: file type info
      fileType:             typeof ps['fileType'] === 'string' ? ps['fileType'] : null,
      selectedSheetName:    typeof ps['selectedSheetName'] === 'string' ? ps['selectedSheetName'] : null,
      // B27: mapping metadata (no values)
      mappingApplied:       Boolean(ps['mapping_applied'] ?? ps['_b27']),
      mappingFieldCount:    typeof ps['mapping_field_count'] === 'number' ? ps['mapping_field_count'] : null,
      manualCompletionUsed: Boolean(ps['manual_completion_used']),
      manualFields:         Array.isArray(ps['manual_fields']) ? (ps['manual_fields'] as string[]).slice(0, 8) : [],
      // B28: multi-file metadata (no values)
      fileMode:             typeof ps['fileMode'] === 'string' ? ps['fileMode'] : 'single',
      fileCount:            typeof ps['fileCount'] === 'number' ? ps['fileCount'] : 1,
      matchSummary:         ps['matchSummary'] as Record<string, number> | null ?? null,
      // B30: provenance summary from payload_sample
      provenanceEnabled:    Boolean(ps['provenance_enabled'] ?? ps['_b30']),
      provenanceSummary:    ps['provenance_summary'] as Record<string, number> | null ?? null,
      // B31/B34: evidence attachments — safe metadata per attachment (no signed URLs, no raw content)
      hasAttachments:    Boolean(ps['_b31']),
      attachmentSummary: ps['_b31_summary'] as Record<string, unknown> | null ?? null,
      attachmentCount:   Array.isArray(ps['_b31_attachments']) ? (ps['_b31_attachments'] as unknown[]).length : 0,
      // B34/B35: individual attachment metadata — safe fields only, lifecycle included
      attachments: Array.isArray(ps['_b31_attachments'])
        ? (ps['_b31_attachments'] as Record<string, unknown>[]).map(a => {
            const lifecycle = resolveLifecycleStatus(a);
            const canOpen   = LIFECYCLE_CAN_OPEN[lifecycle] && a['storageStatus'] === 'stored_private';
            return {
              attachmentId:            a['attachmentId'],
              fileNameSafe:            a['fileNameSafe'],
              fileType:                a['fileType'],
              fileSizeBytes:           a['fileSizeBytes'],
              attachmentType:          a['attachmentType'],
              parserStatus:            a['parserStatus'],
              evidenceLevelSuggestion: a['evidenceLevelSuggestion'],
              storageStatus:           a['storageStatus'] ?? 'metadata_only',
              // B35: lifecycle
              lifecycleStatus:  lifecycle,
              lifecycleLabel:   LIFECYCLE_LABELS[lifecycle],
              canOpenSecurely:  canOpen,
              archivedAt:       a['archivedAt']       ?? null,
              removedAt:        a['removedAt']        ?? null,
              storageRemovedAt: a['storageRemovedAt'] ?? null,
              createdAt:        a['createdAt'],
              // NEVER expose: storagePath, storageBucket, signedUrl, raw content
            };
          })
        : [],
    };
  });

  // ── 3. Uploaded records — safe fields only ────────────────────────────────
  // NEVER select: pseudonym_id, raw_hash, created_by, full raw payload
  const batchIds = batches.map(b => b.batchIdFull);
  if (batchIds.length === 0) {
    return NextResponse.json({
      ok: true,
      tenant: { tenantCode: t.tenant_code, companyName: t.company_name, reportingPeriod },
      batches: [],
      contributionSummary: {
        totalInitiatives: 0, contributesToKoraIndex: 0, koraIndexAndBti: 0, koraIndexOnly: 0,
        btiOnlyEconomicRelief: 0, reportingContextOnly: 0, excludedCompliance: 0,
        needsInfo: 0, rejected: 0, pendingReview: 0,
      },
      initiatives: [],
      caveats: buildCaveats(),
    });
  }

  const { data: recordRows, error: rErr } = await db.schema('personal').from('uploaded_record')
    .select('id, batch_id, eligibility_status, primary_pillar, action_family, event_nature, review_status, payload')
    // NEVER select: pseudonym_id, raw_hash
    .in('batch_id', batchIds)
    .limit(500);

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  // ── 4. UEF records — for reporting readiness ──────────────────────────────
  const { data: uefRows, error: uErr } = await db.schema('analytics').from('uef_record')
    .select('id, batch_id, review_status, approved_for_scoring, payload')
    .in('batch_id', batchIds)
    .limit(500);

  if (uErr) console.error('[evidence-archive] uef_record fetch failed:', uErr.message);

  // Build UEF readiness map by batch_id+name for loose join
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uefByBatch = new Map<string, any[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const u of ((uefRows ?? []) as any[])) {
    const bid = u.batch_id as string;
    if (!uefByBatch.has(bid)) uefByBatch.set(bid, []);
    uefByBatch.get(bid)!.push(u);
  }

  // ── 5. Build initiative list ───────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initiatives: any[] = [];

  const summary = {
    totalInitiatives: 0, contributesToKoraIndex: 0, koraIndexAndBti: 0, koraIndexOnly: 0,
    btiOnlyEconomicRelief: 0, reportingContextOnly: 0, excludedCompliance: 0,
    needsInfo: 0, rejected: 0, pendingReview: 0,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRecords = (recordRows ?? []) as any[];

  for (let idx = 0; idx < allRecords.length; idx++) {
    const rec = allRecords[idx];
    const payload = (rec.payload ?? {}) as Record<string, unknown>;
    const safeFields = extractSafePayloadFields(payload);

    const safeName = buildSafeName({
      initiativeName: safeFields.initiativeName,
      actionFamily:   rec.action_family as string | null,
      eventNature:    rec.event_nature  as string | null,
      idx,
    });

    // Derive reporting readiness from UEF (if available)
    let reportingReadiness: string | null = null;
    const uefForBatch = uefByBatch.get(rec.batch_id as string) ?? [];
    if (uefForBatch.length > 0) {
      // Try to find matching UEF by initiative name (loose match — aggregate-safe)
      const matchingUef = uefForBatch[idx % uefForBatch.length];
      if (matchingUef) {
        const uefPayload = (matchingUef.payload ?? {}) as Record<string, unknown>;
        const gaps = uefPayload['evidence_gaps'] as Array<{ readiness?: string }> | null;
        if (Array.isArray(gaps) && gaps.length > 0) {
          // Use worst readiness signal (most conservative)
          const readinessRank: Record<string, number> = { not_ready: 0, needs_evidence: 1, usable_with_caveat: 2, report_ready: 3 };
          const sorted = [...gaps].sort((a, b) => (readinessRank[a.readiness ?? 'not_ready'] ?? 0) - (readinessRank[b.readiness ?? 'not_ready'] ?? 0));
          reportingReadiness = sorted[0]?.readiness ?? null;
        }
      }
    }

    const contribution = deriveContributionRole({
      eligibilityStatus: rec.eligibility_status as string ?? 'review_required',
      reviewStatus:      rec.review_status      as string ?? 'pending_review',
      approvedForScoring: uefForBatch.some(u => u.batch_id === rec.batch_id && u.approved_for_scoring),
      budgetClass:       safeFields.budgetClass,
    });

    // Update summary
    summary.totalInitiatives++;
    const role: ContributionRole = contribution.role;
    if (role === 'kora_index_and_bti')       { summary.koraIndexAndBti++; summary.contributesToKoraIndex++; }
    else if (role === 'kora_index_only')      { summary.koraIndexOnly++; summary.contributesToKoraIndex++; }
    else if (role === 'bti_only_economic_relief') summary.btiOnlyEconomicRelief++;
    else if (role === 'reporting_context_only')   summary.reportingContextOnly++;
    else if (role === 'excluded_compliance')       summary.excludedCompliance++;
    else if (role === 'needs_info')                summary.needsInfo++;
    else if (role === 'rejected')                  summary.rejected++;
    else                                           summary.pendingReview++;

    initiatives.push({
      id:               (rec.id as string).slice(0, 8) + '…',
      // B35: full safe record ID for Evidence Record Viewer (system UUID, not PII)
      recordIdFull:     rec.id as string,
      batchIdFull:      rec.batch_id as string,
      safeName,
      pillar:           (rec.primary_pillar as string | null) ?? null,
      eligibility:      rec.eligibility_status as string,
      reviewStatus:     rec.review_status as string,
      approvedForScoring: uefForBatch.some(u => u.approved_for_scoring),
      budgetClass:      safeFields.budgetClass ?? null,
      evidenceLevel:    safeFields.evidenceLevel ?? null,
      reportingReadiness,
      contributionRole: role,
      contributionRoleLabel: CONTRIBUTION_ROLE_LABELS[role],
      contributionExplanation: contribution.explanation,
      hasManualCompletion: safeFields.hasManualCompletion,
      manualFields:        safeFields.manualFields,
      hasColumnMapping:    safeFields.hasB27Mapping,
      hasMultiFileMatch:   safeFields.hasB28MultiFile,
      hasB30Provenance:    safeFields.hasB30Provenance,
      provenanceSummary:   safeFields.provenanceSummary ?? null,
      sourceBatchId:    (rec.batch_id as string).slice(0, 8) + '…',
    });
  }

  return NextResponse.json({
    ok: true,
    tenant: {
      tenantCode: t.tenant_code as string,
      companyName: t.company_name as string,
      reportingPeriod: reportingPeriod || 'all',
    },
    batches,
    contributionSummary: summary,
    initiatives,
    caveats: buildCaveats(),
  });
}

function buildCaveats(): string[] {
  return [
    'This is not a raw data archive. It shows only safe evidence lineage summaries.',
    'Individual worker data is never exposed. No names, emails, IDs, or personal identifiers.',
    'Compliance baseline activities are excluded from KORA activation impact.',
    'Economic relief is tracked in BTI and is not treated as deep activation.',
    'Reporting Readiness does not certify CSRD/ESRS compliance — it maps initiative evidence to possible reporting support areas.',
    'KORA Foundation Light v0.1 — pre_empirical_calibration. Pilot-grade diagnostic intelligence, not certified output.',
    'Dati sintetici/demo per Foundation Light. Non contengono dati reali di lavoratori.',
  ];
}
