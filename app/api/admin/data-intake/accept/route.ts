// app/api/admin/data-intake/accept/route.ts
// CSV live intake accept — KORA_ADMIN only.
//
// Receives the CSV file again — NEVER trusts dry-run result from client.
// Reruns all validation server-side: file type/size, CSV parse, header blocklist,
// PII strict-reject, then persists source_batch + uploaded_record.
//
// NO scoring. NO KORA Index. NO Decision Pack. NO operator-flow call.
// Batch status: 'pending' — awaiting UEF review in B5.
// privacy_redacted: false — strict-reject ensures no PII reaches persistence.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { detectPiiInPayload, summarizePiiFindings } from '@/lib/privacy/pii-guard';
import { classifyEligibilityBatch } from '@/lib/kora-engine/eligibility-gate';
import type { RawUploadedRecord } from '@/lib/kora-engine/types';
import type {
  BatchFinancialContext, FinancialSourceType, BudgetScope, EvidenceLevel,
} from '@/lib/ingestion/raw-to-uef-interpreter';

// ── B11.3: Financial metadata validation ─────────────────────────────────────
// financialNotes is deliberately excluded — never persisted (privacy boundary).

const VALID_FINANCIAL_SOURCE: FinancialSourceType[] = [
  'hr_declaration', 'provider_export', 'lms_export',
  'internal_accounting', 'invoice_consuntivo', 'unknown',
];
const VALID_EVIDENCE_LEVELS: EvidenceLevel[] = ['L0', 'L1', 'L2', 'L3'];
const VALID_BUDGET_SCOPES: BudgetScope[] = [
  'welfare', 'fringe_benefit', 'hr_learning',
  'esg_volunteering', 'compliance_hse', 'mixed', 'unknown',
];
const VALID_TRISTATE = ['yes', 'no', 'unknown'];

function parseAndValidateFinancialMetadata(raw: string): BatchFinancialContext {
  let obj: Record<string, unknown>;
  try { obj = JSON.parse(raw); }
  catch { throw new Error('financialMetadata must be valid JSON.'); }

  const fst = String(obj['financialSourceType'] ?? 'unknown');
  const del = String(obj['defaultEvidenceLevel'] ?? 'L0');
  const bs  = String(obj['budgetScope'] ?? 'unknown');
  const ca  = String(obj['containsAmounts'] ?? 'unknown');
  const cer = String(obj['containsEconomicRelief'] ?? 'unknown');
  const ccs = String(obj['containsComplianceSpend'] ?? 'unknown');

  if (!VALID_FINANCIAL_SOURCE.includes(fst as FinancialSourceType))
    throw new Error(`Invalid financialSourceType: '${fst}'. Must be one of: ${VALID_FINANCIAL_SOURCE.join(', ')}`);
  if (!VALID_EVIDENCE_LEVELS.includes(del as EvidenceLevel))
    throw new Error(`Invalid defaultEvidenceLevel: '${del}'. Must be one of: ${VALID_EVIDENCE_LEVELS.join(', ')}`);
  if (!VALID_BUDGET_SCOPES.includes(bs as BudgetScope))
    throw new Error(`Invalid budgetScope: '${bs}'. Must be one of: ${VALID_BUDGET_SCOPES.join(', ')}`);
  if (!VALID_TRISTATE.includes(ca))
    throw new Error(`Invalid containsAmounts: '${ca}'. Must be yes | no | unknown`);
  if (!VALID_TRISTATE.includes(cer))
    throw new Error(`Invalid containsEconomicRelief: '${cer}'. Must be yes | no | unknown`);
  if (!VALID_TRISTATE.includes(ccs))
    throw new Error(`Invalid containsComplianceSpend: '${ccs}'. Must be yes | no | unknown`);

  return {
    currency:                'EUR',
    financialSourceType:     fst as FinancialSourceType,
    defaultEvidenceLevel:    del as EvidenceLevel,
    budgetScope:             bs  as BudgetScope,
    containsAmounts:         ca  as 'yes' | 'no' | 'unknown',
    containsEconomicRelief:  cer as 'yes' | 'no' | 'unknown',
    containsComplianceSpend: ccs as 'yes' | 'no' | 'unknown',
  };
}

// ── Limits (same as upload-preview — re-validated here) ───────────────────────

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS  = 500;

// ── Header blocklist (never trust client — copied from upload-preview) ─────────

const FORBIDDEN_HEADERS = new Set([
  'email', 'e-mail', 'email_address', 'mail',
  'phone', 'telefono', 'mobile', 'cel', 'cellulare', 'phone_number', 'tel',
  'codice_fiscale', 'cf', 'tax_code', 'fiscal_code', 'codice_fiscale_lavoratore',
  'iban', 'bic', 'iban_number',
  'name', 'first_name', 'last_name', 'surname',
  'nome', 'cognome', 'full_name', 'employee_name',
  'nominativo', 'worker_name', 'nome_lavoratore', 'cognome_lavoratore',
  'address', 'indirizzo', 'street', 'via', 'citta', 'city', 'cap',
  'domicilio', 'residenza',
  'birth_date', 'data_nascita', 'date_of_birth', 'age', 'eta',
  'health', 'salute', 'diagnosi', 'diagnosis', 'referto', 'medical_data',
]);

// ── Safe payload keys — only these fields stored in uploaded_record.payload ───

const SAFE_PAYLOAD_KEYS = new Set([
  'initiative_id', 'initiative_name', 'nome_iniziativa',
  'category', 'categoria', 'type', 'tipo',
  'participants', 'partecipanti',
  'pillar',
  'amount', 'budget_amount', 'importo',
  'source', 'budget_source', 'evidence_type', 'fonte',
  'period', 'department_group', 'site', 'cluster', 'provider',
  'mandatory', 'initiative_type',
]);

// ── CSV parser (inline — same as upload-preview, never trusts dry-run result) ─

function parseCsv(content: string): {
  headers: string[]; rows: Record<string, string>[]; warnings: string[];
} {
  const warnings: string[] = [];
  const text  = content.replace(/^﻿/, ''); // strip BOM
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0)  throw new Error('Empty file: no content found.');
  if (lines.length < 2)   throw new Error('File must contain at least one header row and one data row.');

  const headerLine  = lines[0];
  const commaCount  = (headerLine.match(/,/g) ?? []).length;
  const semiCount   = (headerLine.match(/;/g) ?? []).length;
  const sep         = semiCount > commaCount ? ';' : ',';

  const headers = headerLine.split(sep)
    .map(h => h.trim().toLowerCase().replace(/[\s-]/g, '_').replace(/[^a-z0-9_]/g, ''));
  if (headers.every(h => h === '')) throw new Error('Header row is empty or contains only special characters.');

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep);
    if (vals.length !== headers.length) {
      warnings.push(`Row ${i}: column count mismatch (expected ${headers.length}, found ${vals.length}).`);
    }
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = (vals[j] ?? '').trim(); });
    rows.push(row);
  }
  return { headers, rows, warnings };
}

// ── Payload builder — only SAFE_PAYLOAD_KEYS allowed in stored payload ────────

function buildSafePayload(row: Record<string, string>): Record<string, unknown> {
  const safe: Record<string, unknown> = {
    b4_intake:  true,
    pii_policy: 'strict_reject',
  };
  for (const [k, v] of Object.entries(row)) {
    if (SAFE_PAYLOAD_KEYS.has(k) && v !== '') safe[k] = v;
  }
  return safe;
}

// ── CSV row → RawUploadedRecord for eligibility gate ─────────────────────────

function csvToUploadedRecords(rows: Record<string, string>[]): RawUploadedRecord[] {
  return rows.map((row, i) => ({
    recordId:           `accept-row-${i}`,
    batchId:            'accept-pending',
    rowIndex:           i,
    detectedRecordType: 'welfare_program',
    raw:                { ...row } as Record<string, unknown>,
  }));
}

// ── Audit event factory ────────────────────────────────────────────────────────

function makeAudit(params: {
  tenantId: string; actorId: string; action: string; resourceType: string;
  resourceId?: string; metadata: Record<string, unknown>;
}) {
  return {
    tenant_id:     params.tenantId,
    actor_role:    'KORA_ADMIN',
    actor_id:      params.actorId,
    action:        params.action,
    resource_type: params.resourceType,
    resource_id:   params.resourceId ?? null,
    payload:       params.metadata,
    ip_address:    null,
  };
}

// ── POST handler ───────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {

  // ── 1. Auth ─────────────────────────────────────────────────────────────────
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  // ── 2. Parse multipart form ──────────────────────────────────────────────────
  let formData: FormData;
  try { formData = await request.formData(); }
  catch {
    return NextResponse.json({ error: 'Invalid multipart/form-data request.' }, { status: 400 });
  }

  const fileEntry = formData.get('file');
  if (!fileEntry || !(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'Missing required field: file (CSV).' }, { status: 400 });
  }
  const file             = fileEntry;
  // B13 FASE 1: require explicit tenantCode — no silent OP-001 default
  const tenantCode = String(formData.get('tenantCode') ?? '').trim();
  if (!tenantCode) {
    return NextResponse.json({
      error: 'tenantCode is required. Select a company explicitly before uploading live data.',
      hint:  'OP-001 is reserved for synthetic demo data only.',
    }, { status: 400 });
  }
  const reportingPeriod  = String(formData.get('reportingPeriod') ?? '2026-Q1');
  const batchLabelInput  = formData.get('batchLabel');

  // B13 FASE 3: pseudonymization confirmation gate
  const pseudonymizationConfirmation = String(formData.get('pseudonymizationConfirmation') ?? '').trim();
  if (pseudonymizationConfirmation !== 'true') {
    return NextResponse.json({
      error: 'pseudonymizationConfirmation is required and must be "true". Operator must confirm the file is pseudonymized before accepting live data.',
    }, { status: 400 });
  }

  // B11.3: optional financial metadata (financialNotes intentionally excluded)
  let batchFinancialMeta: BatchFinancialContext | null = null;
  const financialMetadataRaw = formData.get('financialMetadata');
  if (financialMetadataRaw && String(financialMetadataRaw).trim() !== '') {
    try {
      batchFinancialMeta = parseAndValidateFinancialMetadata(String(financialMetadataRaw));
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 400 });
    }
  }
  const batchLabel       = batchLabelInput ? String(batchLabelInput) : `[CSV] ${file.name}`;

  // ── 3. Validate file type ────────────────────────────────────────────────────
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return NextResponse.json({
      error: 'File must be a CSV (.csv). Only CSV is supported in B4.2.',
    }, { status: 400 });
  }

  // ── 4. Validate file size ────────────────────────────────────────────────────
  if (file.size > MAX_BYTES) {
    return NextResponse.json({
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum: 2 MB.`,
    }, { status: 413 });
  }

  // ── 5. Read + parse CSV ──────────────────────────────────────────────────────
  const content = Buffer.from(await file.arrayBuffer()).toString('utf-8');
  let headers: string[], rows: Record<string, string>[], parseWarnings: string[];
  try {
    ({ headers, rows, warnings: parseWarnings } = parseCsv(content));
  } catch (e) {
    return NextResponse.json({
      error: `CSV parse error: ${(e as Error).message}`,
    }, { status: 400 });
  }

  // ── 6. Row count limit ───────────────────────────────────────────────────────
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({
      error: `Too many rows: ${rows.length}. Maximum: ${MAX_ROWS}.`,
    }, { status: 400 });
  }

  // ── 7. Tenant lookup (early — needed for audit events on rejection) ───────────
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: tenant, error: tenantErr } = await db.schema('analytics').from('tenant')
    .select('id').eq('tenant_code', tenantCode).maybeSingle();
  if (tenantErr) {
    return NextResponse.json({ error: `Tenant lookup failed: ${tenantErr.message}` }, { status: 500 });
  }
  if (!tenant) {
    return NextResponse.json({
      error: `Tenant not found: ${tenantCode}. Run operator flow first to provision the tenant.`,
    }, { status: 404 });
  }
  const tenantId = (tenant as { id: string }).id;

  // ── 8. Header blocklist check ─────────────────────────────────────────────────
  const forbiddenFound = headers.filter(h => FORBIDDEN_HEADERS.has(h));
  if (forbiddenFound.length > 0) {
    // Audit the rejection
    const { error: rejErr } = await db.schema('audit').from('audit_log').insert(
      makeAudit({
        tenantId, actorId: authResult.id,
        action: 'pii_guard_batch_rejected',
        resourceType: 'personal.uploaded_record',
        metadata: {
          reason:           'forbidden_headers',
          forbidden_headers: forbiddenFound,
          policy:           'strict_reject',
          row_count:        rows.length,
        },
      }),
    );
    if (rejErr) console.error('[data-intake/accept] rejection audit (header):', rejErr.message);

    return NextResponse.json({
      ok:               false,
      error:            'Batch rejected: forbidden column headers detected.',
      piiStatus:        'rejected',
      rejectedAt:       new Date().toISOString(),
      forbiddenHeaders: forbiddenFound,
      note:             'No data has been stored. Remove personal identifier columns and re-submit.',
    }, { status: 422 });
  }

  // ── 9. PII strict-reject on values ───────────────────────────────────────────
  const piiFindings: Array<{ rowIndex: number; fieldPath: string; riskType: string; severity: string }> = [];
  for (let i = 0; i < rows.length; i++) {
    const result = detectPiiInPayload(rows[i] as Record<string, unknown>);
    if (result.hasPii) {
      for (const f of result.findings) {
        piiFindings.push({ rowIndex: i + 1, fieldPath: f.fieldPath, riskType: f.riskType, severity: f.severity });
        // NEVER log/include the PII value itself
      }
    }
  }

  if (piiFindings.length > 0) {
    const allFindings = rows.flatMap(row => detectPiiInPayload(row as Record<string, unknown>).findings);
    const summary     = summarizePiiFindings(allFindings);

    const { error: rejErr } = await db.schema('audit').from('audit_log').insert(
      makeAudit({
        tenantId, actorId: authResult.id,
        action: 'pii_guard_batch_rejected',
        resourceType: 'personal.uploaded_record',
        metadata: {
          reason:            'pii_in_values',
          total_findings:    summary.total,
          high_severity:     summary.highSeverityCount,
          by_risk_type:      summary.byRiskType,
          field_paths:       summary.fieldPaths,  // paths only, no values
          policy:            'strict_reject',
          row_count:         rows.length,
          // pii values are NEVER logged here
        },
      }),
    );
    if (rejErr) console.error('[data-intake/accept] rejection audit (pii):', rejErr.message);

    return NextResponse.json({
      ok:          false,
      error:       'Batch rejected: direct personal data detected in file values.',
      piiStatus:   'rejected',
      rejectedAt:  new Date().toISOString(),
      findings:    piiFindings,   // rowIndex + fieldPath + riskType + severity — NEVER values
      auditSummary: {
        totalFindings:     summary.total,
        highSeverityCount: summary.highSeverityCount,
        byRiskType:        summary.byRiskType,
        fieldPaths:        summary.fieldPaths,
      },
      note:        'No data has been stored. Remove all direct personal identifiers and re-submit.',
    }, { status: 422 });
  }

  // ── All checks passed — begin persistence ─────────────────────────────────────
  // At this point: no PII, no forbidden headers, file within limits.

  const auditRows: ReturnType<typeof makeAudit>[] = [];

  // ── 10. Eligibility classification ───────────────────────────────────────────
  const records: RawUploadedRecord[] = csvToUploadedRecords(rows);
  const eligResults = classifyEligibilityBatch(records);

  const eligCounts = {
    eligible:       eligResults.filter(e => e.status === 'eligible').length,
    limited:        eligResults.filter(e => e.status === 'limited').length,
    blocked:        eligResults.filter(e => e.status === 'blocked').length,
    reviewRequired: eligResults.filter(e => e.status === 'review_required').length,
    total:          eligResults.length,
  };

  // ── 11. Create source_batch ───────────────────────────────────────────────────
  const { data: batchData, error: batchErr } = await db.schema('analytics').from('source_batch')
    .insert({
      tenant_id:              tenantId,
      source_type:            'csv_upload',
      source_name:            batchLabel,
      reporting_period:       reportingPeriod,
      row_count:              rows.length,
      mapped_count:           eligCounts.eligible + eligCounts.limited,
      rejected_count:         eligCounts.blocked,
      batch_status:           'pending',         // not 'approved' — awaits UEF review in B5
      completeness_pct:       null,              // set during review
      mapping_confidence_avg: null,
      evidence_attached_pct:  null,
      pending_review_count:   rows.length,
      source_notes:           'B4.2 CSV live intake · strict-reject PII policy · pending UEF review (B5)',
      // B11.3: store validated financial metadata — no financialNotes, no PII
      payload_sample:         batchFinancialMeta
        ? { _b11_3: true, ...batchFinancialMeta }
        : null,
      created_by:             authResult.email,
      processed_at:           null,
    })
    .select('id')
    .single();

  if (batchErr || !batchData) {
    return NextResponse.json(
      { error: `source_batch creation failed: ${batchErr?.message ?? 'no data returned'}` },
      { status: 500 },
    );
  }
  const batchId = (batchData as { id: string }).id;

  auditRows.push(makeAudit({
    tenantId, actorId: authResult.id,
    action: 'source_batch_created',
    resourceType: 'analytics.source_batch', resourceId: batchId,
    metadata: {
      batch_id:                   batchId,
      source_type:                'csv_upload',
      batch_status:               'pending',
      row_count:                  rows.length,
      tenant_code:                tenantCode,
      reporting_period:           reportingPeriod,
      pseudonymization_confirmed: true,  // B13 FASE 3: operator confirmation gate
    },
  }));

  // B11.3: audit financial metadata — partial only, financialNotes never logged
  if (batchFinancialMeta) {
    auditRows.push(makeAudit({
      tenantId, actorId: authResult.id,
      action: 'batch_financial_metadata_attached',
      resourceType: 'analytics.source_batch', resourceId: batchId,
      metadata: {
        financial_metadata_provided: true,
        keys_present:          Object.keys(batchFinancialMeta),
        currency:              batchFinancialMeta.currency,
        financialSourceType:   batchFinancialMeta.financialSourceType,
        defaultEvidenceLevel:  batchFinancialMeta.defaultEvidenceLevel,
        budgetScope:           batchFinancialMeta.budgetScope,
      },
    }));
  }

  // ── 12. Build + insert uploaded_record rows ───────────────────────────────────
  // pseudonym_id: non-reversible, not derived from personal data.
  // raw_hash: batch-scoped row identifier (non-cryptographic for B4.2).
  // payload: safe fields only — PII strict-reject guarantees cleanliness.

  const uploadedRows = rows.map((row, i) => ({
    tenant_id:          tenantId,
    batch_id:           batchId,
    pseudonym_id:       `PSY-B42-${batchId.slice(0, 8)}-${String(i).padStart(4, '0')}`,
    raw_hash:           `csv-row:${batchId}:${String(i).padStart(4, '0')}`,
    eligibility_status: eligResults[i].status,
    primary_pillar:     (row['pillar'] || row['categoria'] || null) as string | null,
    action_family:      (row['category'] || row['categoria'] || null) as string | null,
    event_nature:       (row['type'] || row['tipo'] || null) as string | null,
    review_status:      'pending' as const,
    payload:            buildSafePayload(row),
    privacy_redacted:   false,  // strict-reject ensures no PII in payload
    reviewed_at:        null,
  }));

  auditRows.push(makeAudit({
    tenantId, actorId: authResult.id,
    action: 'pii_guard_checked',
    resourceType: 'personal.uploaded_record',
    metadata: { record_count: uploadedRows.length, pii_found: false, policy: 'strict_reject' },
  }));

  const { error: urErr } = await db.schema('personal').from('uploaded_record').insert(uploadedRows);
  if (urErr) {
    return NextResponse.json(
      { error: `uploaded_record insertion failed: ${urErr.message}` },
      { status: 500 },
    );
  }

  auditRows.push(makeAudit({
    tenantId, actorId: authResult.id,
    action: 'uploaded_records_inserted',
    resourceType: 'personal.uploaded_record',
    metadata: {
      count:            uploadedRows.length,
      batch_id:         batchId,
      pii_found:        false,
      privacy_redacted: false,
      review_status:    'pending',
      eligibility_counts: eligCounts,
    },
  }));

  // ── 13. Flush audit log ───────────────────────────────────────────────────────
  const { error: auditErr } = await db.schema('audit').from('audit_log').insert(auditRows);
  if (auditErr) console.error('[data-intake/accept] audit_log flush:', auditErr.message);

  // ── 14. Return success ────────────────────────────────────────────────────────
  return NextResponse.json({
    ok:               true,
    batchId,
    tenantCode,
    reportingPeriod,
    rowCount:         rows.length,
    eligibilitySummary: eligCounts,
    batchStatus:      'pending',
    message:          'Batch created for review. Scoring remains locked until B5.',
    lockedFeatures:   ['scoring_run', 'kora_index_generation', 'decision_pack_generation'],
    auditEventsWritten: auditRows.length,
    warnings:         parseWarnings,
    synthetic_test:   false,
  });
}
