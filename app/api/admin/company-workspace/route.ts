// app/api/admin/company-workspace/route.ts
// Pilot workspace read-model — KORA_ADMIN only.
//
// Single GET call that aggregates pilot state for one tenant+period:
//   tenant → workforce → latest batch → UEF counts → scoring → decision pack
//
// Read-only. No PII. No raw payload. No worker data. No scoring execution.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

// Pilot status derived from aggregated data — UI read-model only, no DB enum.
export type PilotStatus =
  | 'not_started'
  | 'batch_pending'
  | 'review_ready'
  | 'needs_enrichment'
  | 'ready_for_scoring'
  | 'scored'
  | 'decision_pack_draft'
  | 'decision_pack_exported'
  | 'archived';

function derivePilotStatus(
  hasBatch: boolean,
  uef: { total: number; pendingReview: number; approved: number; needsEnrichment: number } | null,
  hasScoring: boolean,
  dpStatus: string | null,
): PilotStatus {
  if (!hasBatch)                                                 return 'not_started';
  if (!uef || uef.total === 0)                                   return 'batch_pending';
  if (uef.pendingReview > 0)                                     return 'review_ready';
  if (uef.needsEnrichment > 0 && uef.pendingReview === 0)        return 'needs_enrichment';
  if (uef.approved > 0 && !hasScoring)                           return 'ready_for_scoring';
  if (hasScoring && dpStatus === 'exported')                      return 'decision_pack_exported';
  if (hasScoring && dpStatus)                                     return 'decision_pack_draft';
  if (hasScoring)                                                 return 'scored';
  return 'review_ready';
}

export async function GET(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const tenantCode      = (searchParams.get('tenantCode') ?? '').trim();
  const reportingPeriod = (searchParams.get('reportingPeriod') ?? '2026-Q1').trim();

  if (!tenantCode) {
    return NextResponse.json({ error: 'tenantCode is required.' }, { status: 400 });
  }

  const db = getSupabaseServiceClient();

  // ── 1. Tenant lookup ───────────────────────────────────────────────────────
  const { data: tenantRow, error: tErr } = await db.schema('analytics').from('tenant')
    .select('id, tenant_code, company_name, onboarding_status')
    .eq('tenant_code', tenantCode).eq('is_active', true).maybeSingle();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!tenantRow) return NextResponse.json({ error: `Tenant not found: ${tenantCode}` }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenantRow as any;
  const tenantId = t.id as string;

  // ── 2. Workforce baseline ──────────────────────────────────────────────────
  const { data: wbRows } = await db.schema('personal').from('workforce_baseline')
    .select('id, total_workers, created_at')
    .eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wb = ((wbRows ?? []) as any[])[0];

  // ── 3. Latest batch (exclude soft-deleted rejected) ────────────────────────
  const { data: batchRows } = await db.schema('analytics').from('source_batch')
    .select('id, source_name, batch_status, row_count, created_at, payload_sample')
    .eq('tenant_id', tenantId).eq('reporting_period', reportingPeriod)
    .neq('batch_status', 'rejected')
    .order('created_at', { ascending: false }).limit(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestBatch = ((batchRows ?? []) as any[])[0];

  // ── 4. UEF counts (for latest batch) ──────────────────────────────────────
  let uef: {
    total: number; pendingReview: number; approved: number;
    rejected: number; needsInfo: number; needsEnrichment: number;
  } | null = null;

  if (latestBatch) {
    const { data: uefRows } = await db.schema('analytics').from('uef_record')
      .select('review_status, approved_for_scoring, payload')
      .eq('batch_id', latestBatch.id);

    if (uefRows) {
      uef = { total: 0, pendingReview: 0, approved: 0, rejected: 0, needsInfo: 0, needsEnrichment: 0 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of uefRows as any[]) {
        uef.total++;
        const status = row.review_status as string;
        if (status === 'pending_review') {
          uef.pendingReview++;
        } else if (status === 'approved') {
          uef.approved++;
          const pl = (row.payload ?? {}) as Record<string, unknown>;
          if (pl['needs_enrichment'] === true) uef.needsEnrichment++;
        } else if (status === 'rejected') {
          uef.rejected++;
        } else if (status === 'needs_info') {
          uef.needsInfo++;
        }
      }
    }
  }

  // ── 5. Latest KORA Index result ────────────────────────────────────────────
  const { data: kiRows } = await db.schema('analytics').from('kora_index_result')
    .select('id, kora_index_value, confidence_score, safeguard_status, activation_rate, meaningful_activation_rate, created_at')
    .eq('tenant_id', tenantId).eq('reporting_period', reportingPeriod)
    .order('created_at', { ascending: false }).limit(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ki = ((kiRows ?? []) as any[])[0];

  // ── 6. Latest Decision Pack ────────────────────────────────────────────────
  const { data: dpRows } = await db.schema('analytics').from('decision_pack_version')
    .select('id, version_id, status, archived_at, created_at')
    .eq('tenant_id', tenantId).eq('reporting_period', reportingPeriod)
    .order('created_at', { ascending: false }).limit(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dp = ((dpRows ?? []) as any[])[0];

  // ── 7. Derive pilot status & recommended next action ──────────────────────
  const pilotStatus = derivePilotStatus(
    !!latestBatch,
    uef,
    !!ki,
    dp?.status ?? null,
  );

  const tcEnc  = encodeURIComponent(tenantCode);
  const rpEnc  = encodeURIComponent(reportingPeriod);
  const batchHref = latestBatch
    ? `/admin/uef-review?batchId=${latestBatch.id}`
    : `/admin/data-intake?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}`;

  const NEXT_ACTION: Record<PilotStatus, { label: string; href: string }> = {
    not_started:             { label: 'Carica dati',                     href: `/admin/data-intake?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}` },
    batch_pending:           { label: 'Genera candidati UEF',            href: batchHref },
    review_ready:            { label: 'Completa review UEF',             href: batchHref },
    needs_enrichment:        { label: 'Completa enrichment budget',      href: batchHref },
    ready_for_scoring:       { label: 'Esegui Live Scoring',             href: batchHref },
    scored:                  { label: 'Apri Decision Pack',              href: `/api/admin/decision-pack/preview?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}` },
    decision_pack_draft:     { label: 'Visualizza Decision Pack',        href: `/api/admin/decision-pack/preview?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}` },
    decision_pack_exported:  { label: 'Scarica PDF Decision Pack',       href: `/api/admin/decision-pack/pdf?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}` },
    archived:                { label: 'Carica nuovi dati',               href: `/admin/data-intake?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}` },
  };

  return NextResponse.json({
    ok: true,
    tenant: {
      id:          tenantId,
      tenantCode:  t.tenant_code as string,
      companyName: t.company_name as string,
    },
    reportingPeriod,
    workforce: {
      exists:       !!wb,
      totalWorkers: (wb?.total_workers as number | null) ?? null,
    },
    latestBatch: latestBatch ? {
      id:                   latestBatch.id as string,
      sourceName:           latestBatch.source_name as string | null,
      status:               latestBatch.batch_status as string,
      rowCount:             latestBatch.row_count as number,
      createdAt:            latestBatch.created_at as string,
      hasFinancialMetadata: !!((latestBatch.payload_sample as Record<string, unknown> | null)?.['_b11_3']),
    } : null,
    uef,
    scoring: ki ? {
      hasResult:                true,
      koraIndex:                ki.kora_index_value as number,
      confidenceScore:          ki.confidence_score as number,
      safeguard:                ki.safeguard_status as string,
      activationRate:           ki.activation_rate as number | null,
      meaningfulActivationRate: ki.meaningful_activation_rate as number | null,
    } : null,
    decisionPack: dp ? {
      versionId:  dp.version_id as string,
      status:     dp.status as string,
      createdAt:  dp.created_at as string,
      previewUrl: `/api/admin/decision-pack/preview?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}`,
      pdfUrl:     `/api/admin/decision-pack/pdf?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}`,
    } : null,
    pilotStatus,
    recommendedNextAction: NEXT_ACTION[pilotStatus],
  });
}
