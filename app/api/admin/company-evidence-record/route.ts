// app/api/admin/company-evidence-record/route.ts
// B35: Evidence Record Detail — safe per-record view. KORA_ADMIN only.
//
// Returns a safe, detailed view of a single initiative/record:
//   - Safe canonical fields (no raw payload, no PII)
//   - Contribution role + explanation
//   - Field-level provenance (decoded from compressed format)
//   - Match review metadata (from uef_record.payload)
//   - Attachment list with lifecycle status (no storagePath, no signedUrl)
//   - Evidence gaps / reporting readiness
//
// NEVER returns:
//   - pseudonym_id, raw_hash, created_by
//   - full raw payload
//   - storagePath, storageBucket, signedUrl
//   - worker data, health data, PII

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { deriveContributionRole, CONTRIBUTION_ROLE_LABELS } from '@/lib/live/contribution-lineage';
import { resolveLifecycleStatus, LIFECYCLE_LABELS, LIFECYCLE_CAN_OPEN } from '@/lib/data-intake/attachment-lifecycle';

// ── Safe canonical fields allowed in valuePreview ────────────────────────────
// Only show these fields — never raw payload keys outside this set.

const VIEWABLE_FIELDS = new Set([
  'initiative_name', 'category', 'type', 'pillar', 'reporting_period',
  'amount', 'participants', 'hours', 'coverage', 'uptake',
  'source', 'evidence_level', 'budget_class', 'provider', 'cost_center',
  'policy_evidence',
]);

// Fields where we show the raw value (numeric / categorical — no PII risk)
const SHOW_VALUE_FIELDS = new Set([
  'amount', 'participants', 'hours', 'coverage', 'uptake',
  'category', 'type', 'pillar', 'reporting_period', 'evidence_level',
  'budget_class', 'cost_center', 'policy_evidence',
]);

// PII scan for string values before showing
const PII_VALUE_PATTERNS = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
  /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i,
  /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/,
];

function safeValuePreview(field: string, value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  if (!str) return null;

  // Fields where we always show value
  if (SHOW_VALUE_FIELDS.has(field)) {
    return str.slice(0, 120);
  }

  // initiative_name: PII scan
  if (field === 'initiative_name') {
    if (PII_VALUE_PATTERNS.some(p => p.test(str))) return '[nome non visualizzabile]';
    return str.slice(0, 80);
  }

  // provider/source: PII scan
  if (field === 'provider' || field === 'source') {
    if (PII_VALUE_PATTERNS.some(p => p.test(str))) return '[valore disponibile — nascosto per sicurezza]';
    return str.slice(0, 60);
  }

  // Default: show truncated
  return str.slice(0, 60);
}

// ── Provenance decoder ────────────────────────────────────────────────────────
// Compressed format from sanitizeProvenanceForStorage():
//   k=kind, conf=confidence, str=strength, fl=flags, role, ft, sh, fi, ri, mid, cav

const PROV_KIND_MAP: Record<string, string> = {
  o: 'original_file', c: 'column_mapping', m: 'manual_completion',
  f: 'multi_file_merge', d: 'derived', s: 'system_default',
};
const PROV_STR_MAP: Record<string, string> = {
  s: 'strong', m: 'medium', w: 'weak', u: 'unknown',
};

function decodeProvenance(provObj: Record<string, unknown>): Array<{
  field: string; kind: string; confidence: number; sourceStrength: string;
  fileRole?: string; isManual?: boolean; isMerged?: boolean; isDerived?: boolean;
  conflictRetained?: boolean; caveat?: string;
}> {
  const result = [];
  for (const [field, fp] of Object.entries(provObj)) {
    if (!fp || typeof fp !== 'object') continue;
    const f = fp as Record<string, unknown>;
    const fl = (f['fl'] as number) ?? 0;
    result.push({
      field,
      kind:            PROV_KIND_MAP[String(f['k'] ?? '')] ?? String(f['k'] ?? 'unknown'),
      confidence:      typeof f['conf'] === 'number' ? f['conf'] : 0,
      sourceStrength:  PROV_STR_MAP[String(f['str'] ?? '')] ?? String(f['str'] ?? 'unknown'),
      ...(f['role'] ? { fileRole: String(f['role']) }             : {}),
      ...(fl & 1    ? { isManual: true }                          : {}),
      ...(fl & 2    ? { isMerged: true }                          : {}),
      ...(fl & 4    ? { isDerived: true }                         : {}),
      ...(fl & 8    ? { conflictRetained: true }                  : {}),
      ...(f['cav']  ? { caveat: String(f['cav']).slice(0, 140) }  : {}),
    });
  }
  return result;
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const tenantCode      = (searchParams.get('tenantCode') ?? '').trim();
  const recordId        = (searchParams.get('recordId')   ?? '').trim(); // full uploaded_record.id
  const reportingPeriod = (searchParams.get('reportingPeriod') ?? '').trim();

  if (!tenantCode) return NextResponse.json({ error: 'tenantCode is required.' }, { status: 400 });
  if (!recordId)   return NextResponse.json({ error: 'recordId is required.' }, { status: 400 });

  const db = getSupabaseServiceClient();

  // ── 1. Tenant ─────────────────────────────────────────────────────────────
  const { data: tenantRow } = await db.schema('analytics').from('tenant')
    .select('id, tenant_code, company_name').eq('tenant_code', tenantCode).eq('is_active', true).maybeSingle();
  if (!tenantRow) return NextResponse.json({ error: `Tenant not found: ${tenantCode}` }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenantRow as any;
  const tenantId = t.id as string;

  // ── 2. Uploaded record (safe fields only — no pseudonym_id, no raw_hash) ─
  const { data: recRow, error: recErr } = await db.schema('personal').from('uploaded_record')
    .select('id, batch_id, eligibility_status, primary_pillar, action_family, event_nature, review_status, payload')
    .eq('id', recordId).eq('tenant_id', tenantId)
    .maybeSingle();
  if (recErr)   return NextResponse.json({ error: recErr.message }, { status: 500 });
  if (!recRow)  return NextResponse.json({ error: `Record not found: ${recordId}` }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec = recRow as any;

  // ── 3. Extract safe payload fields ────────────────────────────────────────
  const rawPayload = (rec.payload ?? {}) as Record<string, unknown>;
  const safeFields: Array<{
    field: string; valuePreview: string | number | null;
    provenanceKind?: string; sourceStrength?: string; confidence?: number;
    flags: string[]; caveat?: string;
  }> = [];

  // Decode compressed provenance
  const provObj = rawPayload['_field_provenance'] as Record<string, unknown> | null | undefined;
  const provDecoded = provObj ? decodeProvenance(provObj) : [];
  const provByField = new Map(provDecoded.map(p => [p.field, p]));

  for (const field of VIEWABLE_FIELDS) {
    const rawVal = rawPayload[field];
    if (rawVal === null || rawVal === undefined || rawVal === '') continue;
    const preview = safeValuePreview(field, rawVal);
    const prov    = provByField.get(field);
    const flags: string[] = [];
    if (prov?.isManual)        flags.push('manual');
    if (prov?.isMerged)        flags.push('merged');
    if (prov?.isDerived)       flags.push('derived');
    if (prov?.conflictRetained) flags.push('conflict_retained');

    safeFields.push({
      field,
      valuePreview: preview,
      ...(prov ? { provenanceKind: prov.kind, sourceStrength: prov.sourceStrength, confidence: prov.confidence } : {}),
      flags,
      ...(prov?.caveat ? { caveat: prov.caveat } : {}),
    });
  }

  // ── 4. Related UEF record (linked via uploaded_record_id in payload) ──────
  let uefRecord: Record<string, unknown> | null = null;
  const { data: uefRows } = await db.schema('analytics').from('uef_record')
    .select('id, review_status, approved_for_scoring, primary_pillar, action_family, event_nature, eligibility, data_completeness_score, missing_fields, payload')
    .eq('batch_id', rec.batch_id)
    .limit(200);

  // Find exact match via uploaded_record_id in uef payload
  for (const u of ((uefRows ?? []) as Record<string, unknown>[])) {
    const uPl = (u['payload'] ?? {}) as Record<string, unknown>;
    if (uPl['uploaded_record_id'] === recordId) { uefRecord = u; break; }
  }

  // ── 5. Related source_batch (for attachments + provenance summary) ────────
  const { data: batchRow } = await db.schema('analytics').from('source_batch')
    .select('id, payload_sample, reporting_period').eq('id', rec.batch_id as string).maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batchPs = (((batchRow as any)?.payload_sample) ?? {}) as Record<string, unknown>;

  // ── 6. Contribution role ──────────────────────────────────────────────────
  const contribution = deriveContributionRole({
    eligibilityStatus:  String(rec.eligibility_status ?? 'review_required'),
    reviewStatus:       String(rec.review_status ?? 'pending_review'),
    approvedForScoring: Boolean(uefRecord?.['approved_for_scoring']),
    budgetClass:        rawPayload['budget_class'] as string | null ?? null,
  });

  // ── 7. Provenance summary ─────────────────────────────────────────────────
  const psSummary = batchPs['provenance_summary'] as Record<string, unknown> | null ?? null;
  const provenanceSummary = {
    originalFields:       Number(psSummary?.['originalFileFields'] ?? 0),
    mappedFields:         Number(psSummary?.['columnMappedFields']  ?? 0),
    manualFields:         Number(psSummary?.['manualCompletionFields'] ?? 0),
    mergedFields:         Number(psSummary?.['mergedFields']        ?? 0),
    derivedFields:        Number(psSummary?.['derivedFields']       ?? 0),
    conflictFieldsRetained: Number(psSummary?.['conflictFieldsRetained'] ?? 0),
  };

  // ── 8. Match review metadata from batch payload_sample ────────────────────
  let matchReview: Record<string, unknown> | null = null;
  if (batchPs['_b33'] || batchPs['match_review_applied']) {
    matchReview = {
      applied:    Boolean(batchPs['match_review_applied']),
      summary:    batchPs['match_review_summary'] ?? null,
    };
  }

  // ── 9. Attachments (safe fields, no storagePath, no signedUrl) ────────────
  const batchAttachments = Array.isArray(batchPs['_b31_attachments'])
    ? (batchPs['_b31_attachments'] as Record<string, unknown>[])
    : [];

  const linkedInitName = rawPayload['initiative_name'] as string | undefined;
  const attachmentList = batchAttachments
    .filter(a => {
      if (!linkedInitName) return true; // show all batch attachments if no initiative name
      const attLinked = a['linkedInitiativeName'] as string | undefined;
      if (!attLinked) return a['scope'] === 'batch'; // batch-scoped attachments always shown
      return attLinked.toLowerCase() === linkedInitName.toLowerCase();
    })
    .map(a => {
      const lifecycle = resolveLifecycleStatus(a);
      const canOpen   = LIFECYCLE_CAN_OPEN[lifecycle] && a['storageStatus'] === 'stored_private';
      return {
        attachmentId:            a['attachmentId'],
        fileNameSafe:            a['fileNameSafe'],
        attachmentType:          a['attachmentType'],
        fileType:                a['fileType'],
        fileSizeBytes:           a['fileSizeBytes'],
        evidenceLevelSuggestion: a['evidenceLevelSuggestion'] ?? null,
        parserStatus:            a['parserStatus'],
        storageStatus:           a['storageStatus'] ?? 'metadata_only',
        lifecycleStatus:         lifecycle,
        lifecycleLabel:          LIFECYCLE_LABELS[lifecycle],
        canOpenSecurely:         canOpen,
        batchId:                 rec.batch_id,  // safe: needed for signed-url route
        // NEVER expose: storagePath, storageBucket, signedUrl
      };
    });

  // ── 10. Evidence gaps from uef payload ────────────────────────────────────
  const uefPl = (uefRecord?.['payload'] as Record<string, unknown>) ?? {};
  const evidenceGaps = (uefPl['evidence_gaps'] as Array<Record<string, unknown>> | null) ?? [];

  // ── 11. Reporting readiness ───────────────────────────────────────────────
  const reportingReadiness = uefPl['reporting_readiness'] as string | null ?? null;

  // ── 12. Build safe name ───────────────────────────────────────────────────
  const rawName = rawPayload['initiative_name'] as string | undefined;
  let safeName: string;
  if (rawName?.trim() && !PII_VALUE_PATTERNS.some(p => p.test(rawName))) {
    safeName = rawName.trim().slice(0, 80);
  } else if (rec.action_family) {
    safeName = `[${rec.action_family}] Iniziativa`;
  } else {
    safeName = `Iniziativa (${recordId.slice(0, 8)}…)`;
  }

  // ── Build response ────────────────────────────────────────────────────────
  return NextResponse.json({
    ok: true,
    tenant: {
      tenantCode: t.tenant_code,
      companyName: t.company_name,
      reportingPeriod: reportingPeriod || ((batchRow as Record<string, unknown>)?.['reporting_period'] ?? ''),
    },
    record: {
      id:                 `${recordId.slice(0, 8)}…`,
      safeName,
      pillar:             (rec.primary_pillar as string | null) ?? null,
      eligibility:        rec.eligibility_status as string,
      reviewStatus:       rec.review_status as string,
      approvedForScoring: Boolean(uefRecord?.['approved_for_scoring']),
      budgetClass:        (rawPayload['budget_class'] as string | null) ?? null,
      evidenceLevel:      (rawPayload['evidence_level'] as string | null) ?? null,
      reportingReadiness,
      contributionRole:        contribution.role,
      contributionRoleLabel:   CONTRIBUTION_ROLE_LABELS[contribution.role],
      contributionExplanation: contribution.explanation,
      contributes:             contribution.contributes,
    },
    safeFields,
    provenance: {
      summary: provenanceSummary,
      fields:  provDecoded.slice(0, 20), // cap for response size
    },
    matchReview,
    attachments: attachmentList,
    evidenceGaps: evidenceGaps.slice(0, 10).map(g => ({
      code:     g['code']     ?? null,
      severity: g['severity'] ?? null,
      message:  g['message']  ?? null,
    })),
    caveats: [
      'Vista safe — solo metadati evidence canonici. Payload raw e dati lavoratori mai esposti.',
      'I livelli evidenza suggeriti richiedono UEF Review prima di influenzare lo scoring.',
      'KORA Foundation Light v0.1 — pre_empirical_calibration.',
    ],
  });
}
