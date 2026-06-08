// app/api/admin/live-spine-diagnostics/route.ts
// KORA_ADMIN only — returns per-tenant live spine state for diagnostic use.
//
// Reads (read-only, no mutations):
//   analytics.tenant            → id, tenant_code, company_name, is_active
//   analytics.source_batch      → last batch per tenant
//   analytics.uef_record        → candidate/approved counts per batch
//   personal.uploaded_record    → uploaded_record count per batch
//   analytics.kora_index_result → last scoring result per tenant
//   analytics.decision_pack_version → last Decision Pack per tenant
//
// Returns an array of TenantSpineState — one row per active tenant.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export type ScoringReadiness =
  | 'READY'           // approved_uef >= 1, workforce baseline >= 10 (or populated)
  | 'NEEDS_REVIEW'    // pending UEF candidates, no approved yet
  | 'NO_DATA'         // no uploaded records or no UEF candidates
  | 'NO_BATCH'        // no source_batch found
  | 'UNKNOWN';

export interface TenantSpineState {
  tenantId:         string;
  tenantCode:       string;
  companyName:      string;
  isActive:         boolean;

  // last source_batch
  lastBatchId:      string | null;
  lastBatchStatus:  string | null;
  lastBatchPeriod:  string | null;
  lastBatchAt:      string | null;

  // counts from last batch
  uploadedRecordCount:  number;
  uefCandidateCount:    number;
  uefApprovedCount:     number;
  uefPendingCount:      number;
  uefRejectedCount:     number;

  // scoring
  scoringReadiness:     ScoringReadiness;
  lastScoringAt:        string | null;
  lastKoraIndex:        number | null;
  lastConfidenceScore:  number | null;
  lastSafeguard:        string | null;

  // Decision Pack
  lastDecisionPackId:   string | null;
  lastDecisionPackAt:   string | null;
  lastDecisionPackStatus: string | null;

  // next action
  warnings:   string[];
  nextAction: string;
}

export async function GET(request: NextRequest) {

  // ── 1. Auth ──────────────────────────────────────────────────────────────────
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const db = getSupabaseServiceClient();

  // ── 2. Fetch all active tenants ───────────────────────────────────────────────
  const { data: tenants, error: tenantErr } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, company_name, is_active')
    .order('created_at', { ascending: false });

  if (tenantErr) {
    return NextResponse.json({ error: `Tenant fetch failed: ${tenantErr.message}` }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantRows = (tenants ?? []) as any[];

  if (tenantRows.length === 0) {
    return NextResponse.json({ tenants: [], meta: { total: 0, readyCount: 0 } });
  }

  const tenantIds = tenantRows.map((t) => t.id as string);

  // ── 3. Fetch last source_batch per tenant ─────────────────────────────────────
  // One query — we'll group client-side.
  const { data: batches, error: batchErr } = await db
    .schema('analytics').from('source_batch')
    .select('id, tenant_id, reporting_period, batch_status, created_at')
    .in('tenant_id', tenantIds)
    .order('created_at', { ascending: false });

  if (batchErr) {
    return NextResponse.json({ error: `Batch fetch failed: ${batchErr.message}` }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batchRows = (batches ?? []) as any[];

  // last batch per tenant
  const lastBatchByTenant = new Map<string, typeof batchRows[0]>();
  for (const b of batchRows) {
    if (!lastBatchByTenant.has(b.tenant_id)) {
      lastBatchByTenant.set(b.tenant_id, b);
    }
  }

  // ── 4. Fetch uploaded_record counts per batch ─────────────────────────────────
  const batchIds = batchRows.map((b) => b.id as string);

  const [uploadedResult, uefResult, scoringResult, dpResult] = await Promise.all([

    // uploaded_record counts
    batchIds.length > 0
      ? db.schema('personal').from('uploaded_record')
          .select('batch_id')
          .in('batch_id', batchIds)
      : Promise.resolve({ data: [], error: null }),

    // uef_record counts
    batchIds.length > 0
      ? db.schema('analytics').from('uef_record')
          .select('batch_id, review_status, approved_for_scoring')
          .in('batch_id', batchIds)
      : Promise.resolve({ data: [], error: null }),

    // last kora_index_result per tenant
    db.schema('analytics').from('kora_index_result')
      .select('tenant_id, kora_index, confidence_score, safeguard_status, created_at')
      .in('tenant_id', tenantIds)
      .order('created_at', { ascending: false }),

    // last decision_pack_version per tenant
    db.schema('analytics').from('decision_pack_version')
      .select('tenant_id, version_id, status, created_at')
      .in('tenant_id', tenantIds)
      .order('created_at', { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uploadedRows  = (uploadedResult.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uefRows       = (uefResult.data   ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scoringRows   = (scoringResult.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dpRows        = (dpResult.data    ?? []) as any[];

  // ── 5. Aggregate counts ───────────────────────────────────────────────────────

  // uploaded_record count per batch
  const uploadedCountByBatch = new Map<string, number>();
  for (const r of uploadedRows) {
    uploadedCountByBatch.set(r.batch_id, (uploadedCountByBatch.get(r.batch_id) ?? 0) + 1);
  }

  // uef counts per batch
  const uefByBatch = new Map<string, { candidate: number; approved: number; pending: number; rejected: number }>();
  for (const r of uefRows) {
    const bid = r.batch_id as string;
    const cur = uefByBatch.get(bid) ?? { candidate: 0, approved: 0, pending: 0, rejected: 0 };
    cur.candidate++;
    if (r.review_status === 'approved' && r.approved_for_scoring === true) cur.approved++;
    if (r.review_status === 'pending_review') cur.pending++;
    if (r.review_status === 'rejected') cur.rejected++;
    uefByBatch.set(bid, cur);
  }

  // last scoring per tenant
  const lastScoringByTenant = new Map<string, typeof scoringRows[0]>();
  for (const r of scoringRows) {
    if (!lastScoringByTenant.has(r.tenant_id)) lastScoringByTenant.set(r.tenant_id, r);
  }

  // last Decision Pack per tenant
  const lastDpByTenant = new Map<string, typeof dpRows[0]>();
  for (const r of dpRows) {
    if (!lastDpByTenant.has(r.tenant_id)) lastDpByTenant.set(r.tenant_id, r);
  }

  // ── 6. Build per-tenant spine state ──────────────────────────────────────────
  const result: TenantSpineState[] = [];

  for (const t of tenantRows) {
    const tenantId   = t.id as string;
    const tenantCode = t.tenant_code as string;

    const lastBatch        = lastBatchByTenant.get(tenantId) ?? null;
    const lastBatchId      = lastBatch?.id ?? null;
    const uefCounts        = lastBatchId ? (uefByBatch.get(lastBatchId) ?? { candidate: 0, approved: 0, pending: 0, rejected: 0 }) : { candidate: 0, approved: 0, pending: 0, rejected: 0 };
    const uploadedCount    = lastBatchId ? (uploadedCountByBatch.get(lastBatchId) ?? 0) : 0;
    const lastScoring      = lastScoringByTenant.get(tenantId) ?? null;
    const lastDp           = lastDpByTenant.get(tenantId) ?? null;

    // Scoring readiness
    let scoringReadiness: ScoringReadiness;
    const warnings: string[] = [];

    if (!lastBatch) {
      scoringReadiness = 'NO_BATCH';
      warnings.push('Nessun source_batch trovato. Carica dati via Data Intake.');
    } else if (uploadedCount === 0) {
      scoringReadiness = 'NO_DATA';
      warnings.push('Nessun uploaded_record nel batch corrente. Carica un file.');
    } else if (uefCounts.candidate === 0) {
      scoringReadiness = 'NO_DATA';
      warnings.push('Nessun UEF candidate generato. Vai a UEF Review → Genera candidati.');
    } else if (uefCounts.approved === 0) {
      scoringReadiness = 'NEEDS_REVIEW';
      warnings.push(`${uefCounts.pending} record UEF in attesa di review. Approva almeno un record per abilitare lo scoring.`);
    } else {
      scoringReadiness = 'READY';
    }

    if (tenantCode === 'OP-001') {
      warnings.push('OP-001 è un tenant sintetico demo — non usare nel path live.');
    }

    if (lastBatch?.batch_status === 'pending') {
      warnings.push('Batch in stato pending. Controlla se l\'ingestion è completa.');
    }

    // Next action
    let nextAction: string;
    if (scoringReadiness === 'NO_BATCH') {
      nextAction = 'Carica dati via /admin/data-intake';
    } else if (scoringReadiness === 'NO_DATA' && uploadedCount === 0) {
      nextAction = 'Invia un file via Data Intake (upload + accept)';
    } else if (scoringReadiness === 'NO_DATA' && uefCounts.candidate === 0) {
      nextAction = 'Vai a /admin/uef-review → Genera UEF candidates';
    } else if (scoringReadiness === 'NEEDS_REVIEW') {
      nextAction = `Approva i ${uefCounts.pending} record UEF in /admin/uef-review`;
    } else if (!lastScoring) {
      nextAction = 'Pronto per scoring → /admin/uef-review → Run scoring';
    } else if (!lastDp) {
      nextAction = 'Scoring completato. Decision Pack mancante — rilanciare scoring.';
    } else {
      nextAction = `Decision Pack presente (${lastDp.version_id ?? '—'}) — tutto pronto.`;
    }

    result.push({
      tenantId,
      tenantCode,
      companyName:     t.company_name  as string,
      isActive:        t.is_active     as boolean,

      lastBatchId,
      lastBatchStatus: lastBatch?.batch_status ?? null,
      lastBatchPeriod: lastBatch?.reporting_period ?? null,
      lastBatchAt:     lastBatch?.created_at ?? null,

      uploadedRecordCount: uploadedCount,
      uefCandidateCount:   uefCounts.candidate,
      uefApprovedCount:    uefCounts.approved,
      uefPendingCount:     uefCounts.pending,
      uefRejectedCount:    uefCounts.rejected,

      scoringReadiness,
      lastScoringAt:        lastScoring?.created_at ?? null,
      lastKoraIndex:        lastScoring?.kora_index  ?? null,
      lastConfidenceScore:  lastScoring?.confidence_score ?? null,
      lastSafeguard:        lastScoring?.safeguard_status ?? null,

      lastDecisionPackId:     lastDp?.version_id ?? null,
      lastDecisionPackAt:     lastDp?.created_at ?? null,
      lastDecisionPackStatus: lastDp?.status     ?? null,

      warnings,
      nextAction,
    });
  }

  const readyCount = result.filter((r) => r.scoringReadiness === 'READY').length;

  return NextResponse.json({
    tenants: result,
    meta: {
      total:      result.length,
      readyCount,
      asOf:       new Date().toISOString(),
    },
  });
}
