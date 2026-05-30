// app/api/test/read-test-tenant/route.ts
// DEV/TEST ONLY — remove or isolate before production.
// Uses service_role server-side. Never expose in production.
// SERVER-SIDE TEST ROUTE — service role, NOT for production use.
//
// Reads back the current KORA Index result for tenant TEST-001 and maps it
// to a ScoringResult via mapDbRow. Expected status: 'ok' after seed route ran.
//
// Protection:
//   1. Returns 404 in NODE_ENV === 'production'.
//   2. Requires header x-kora-test-secret matching KORA_TEST_SEED_SECRET env var.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { mapDbRow, type LiveRow } from '@/lib/live/scoring-mapper';

const TEST_TENANT_CODE      = 'TEST-001';
const TEST_REPORTING_PERIOD = '2026-Q1';
const READ_SCENARIO_ID      = 'S1' as const; // placeholder — live tenants have periods, not S1/S2

export async function GET(request: NextRequest) {
  // Protection 1: block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Protection 2: secret header
  const clientSecret = request.headers.get('x-kora-test-secret');
  if (!clientSecret || clientSecret !== process.env.KORA_TEST_SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabaseServiceClient();

  try {
    // ── Resolve tenantId from tenant_code ──────────────────────────────────────

    const { data: tenantRow, error: tenantErr } = await db
      .schema('analytics')
      .from('tenant')
      .select('id')
      .eq('tenant_code', TEST_TENANT_CODE)
      .maybeSingle();

    if (tenantErr) {
      return NextResponse.json({ error: `tenant lookup: ${tenantErr.message}` }, { status: 500 });
    }
    if (!tenantRow) {
      return NextResponse.json({
        ok: false,
        status: 'not_seeded',
        message: `Tenant ${TEST_TENANT_CODE} not found. Run POST /api/test/seed-test-tenant first.`,
      }, { status: 404 });
    }

    const tenantId = tenantRow.id as string;

    // ── Read kora_index_result with joins ──────────────────────────────────────
    // Mirrors the future fetchLiveScoringResult query in lib/scoring-result/index.ts.

    const { data: row, error: rowErr } = await db
      .schema('analytics')
      .from('kora_index_result')
      .select('*, confidence_result:confidence_result_id(*), activation_result:activation_result_id(*)')
      .eq('tenant_id', tenantId)
      .eq('reporting_period', TEST_REPORTING_PERIOD)
      .eq('is_current', true)
      .maybeSingle();

    if (rowErr) {
      return NextResponse.json({ error: `kora_index_result query: ${rowErr.message}` }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({
        ok: false,
        status: 'insufficient_data',
        tenant_id: tenantId,
        reporting_period: TEST_REPORTING_PERIOD,
        message: 'No current KORA Index result found. Run POST /api/test/seed-test-tenant first.',
      }, { status: 404 });
    }

    // ── Map DB row → ScoringResult via shared mapper ───────────────────────────

    const mapped = mapDbRow(row as LiveRow, tenantId, READ_SCENARIO_ID);

    // ── Return full verification payload ──────────────────────────────────────

    return NextResponse.json({
      ok:               mapped.status === 'ok',
      status:           mapped.status,
      tenant_id:        tenantId,
      tenant_code:      TEST_TENANT_CODE,
      reporting_period: TEST_REPORTING_PERIOD,
      environment:      'live',
      synthetic_test:   true,

      kora_index: mapped.koraIndex
        ? {
            id:                     mapped.koraIndex.id,
            kora_index_value:       mapped.koraIndex.kora_index_value,
            safeguard_status:       mapped.koraIndex.safeguard_status,
            calibration_status:     mapped.koraIndex.calibration_status,
            methodology_version_id: mapped.koraIndex.methodology_version_id,
            confidence_score:       mapped.koraIndex.confidence_score,
            component_count:        mapped.koraIndex.components.length,
            macroblock_count:       (mapped.koraIndex.macroblocks ?? []).length,
            generated_at:           mapped.koraIndex.generated_at,
          }
        : null,

      activation: mapped.aggregate
        ? {
            total_workers:                 mapped.aggregate.total_workers,
            active_worker_count:           mapped.aggregate.active_worker_count,
            activation_rate:               mapped.aggregate.activation_rate,
            meaningful_activation_rate:    mapped.aggregate.meaningful_activation_rate,
            privacy_threshold_met:         mapped.aggregate.privacy_threshold_met,
          }
        : null,

      confidence: mapped.confidence
        ? {
            confidence_score:   mapped.confidence.confidence_score,
            confidence_level:   mapped.confidence.confidence_level,
            data_completeness:  mapped.confidence.data_completeness,
          }
        : null,

      // Assertions for automated verification
      assertions: {
        status_is_ok:              mapped.status === 'ok',
        kora_index_present:        mapped.koraIndex !== null,
        aggregate_present:         mapped.aggregate !== null,
        confidence_present:        mapped.confidence !== null,
        no_synthetic_demo_data:    !('synthetic_demo_data' in (mapped.koraIndex ?? {})),
        no_not_live_data:          !('not_live_data'        in (mapped.aggregate ?? {})),
        components_count_is_10:    (mapped.koraIndex?.components.length ?? 0) === 10,
      },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[KORA test read] unexpected error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
