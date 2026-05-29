// app/api/test/seed-test-tenant/route.ts
// SERVER-SIDE TEST ROUTE — service role, NOT for production use.
//
// Demonstrates the full round-trip: create tenant → baseline → batch →
// uploaded_records → UEF classification → runKoraPipeline → persist results → audit log.
//
// Data: 100% synthetic (tenant_code 'TEST-001'). No real worker data. No PII.
// All workforce segments ≥ 10 (N≥10 boundary respected by construction).
// LIVE path invariant: never touches demo seed data (Meridiana S1/S2).
//
// Protection:
//   1. Returns 404 in NODE_ENV === 'production'.
//   2. Requires header x-kora-test-secret matching KORA_TEST_SEED_SECRET env var.
//      If env var is unset or header is missing/wrong → 401.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { classifyEligibilityBatch } from '@/lib/kora-engine/eligibility-gate';
import { runKoraPipeline } from '@/lib/kora-engine';
import { persistKoraComputationResult } from '@/lib/live/persistence';
import type { RawUploadedRecord } from '@/lib/kora-engine/types';

const TEST_TENANT_CODE     = 'TEST-001';
const TEST_TENANT_NAME     = '[SYNTHETIC TEST] KORA Pipeline Verification Tenant';
const TEST_REPORTING_PERIOD = '2026-Q1';
const WORKFORCE_POPULATION  = 50;

// ── Synthetic RawUploadedRecord data for runKoraPipeline ─────────────────────
// 12 initiative-level records covering all 5 pillars + limited + blocked.
// Raw fields use Italian keywords that the EligibilityGate recognises.

function buildSyntheticRecords(batchId: string): RawUploadedRecord[] {
  const make = (
    id: string,
    idx: number,
    nome: string,
    categoria: string,
    tipo: string,
    extra?: Record<string, unknown>,
  ): RawUploadedRecord => ({
    recordId:           `r-${TEST_TENANT_CODE}-${id}`,
    batchId,
    rowIndex:           idx,
    detectedRecordType: 'welfare_program',
    raw: { nome_iniziativa: nome, categoria, tipo, ...extra },
  });

  return [
    // LIFE — health and wellbeing
    make('01', 0,  'Programma di supporto psicologico',     'salute e benessere', 'consumed_service',      { partecipanti: 25 }),
    make('02', 1,  'Check-up medici preventivi aziendali',  'salute',             'consumed_service',      { partecipanti: 30 }),
    make('03', 2,  'Supporto nutrizionale e stile di vita', 'benessere',          'consumed_service',      { partecipanti: 20 }),
    // GROWTH — professional development
    make('04', 3,  'Formazione professionale avanzata',     'crescita',           'training',              { partecipanti: 20 }),
    make('05', 4,  'Corso di upskilling digitale',          'professionale',      'training',              { partecipanti: 15 }),
    make('06', 5,  'Coaching e sviluppo leadership',        'sviluppo personale', 'training',              { partecipanti: 12 }),
    // CONNECTION — mentoring and community
    make('07', 6,  'Programma di mentoring inter-funzionale', 'mentoring',        'policy',                { partecipanti: 14 }),
    make('08', 7,  'Community interna di pratica',          'connessione',        'collective_initiative', { partecipanti: 22 }),
    // IMPACT — volunteering and territorial
    make('09', 8,  'Volontariato aziendale territoriale',   'impatto territoriale', 'collective_initiative', { partecipanti: 18 }),
    make('10', 9,  'Progetto comunità locale',              'territoriale',       'territorial_initiative', { partecipanti: 12 }),
    // LEGACY — knowledge transfer
    make('11', 10, 'Trasferimento competenze senior-junior', 'legacy conoscenza', 'training',              { partecipanti: 10 }),
    // LIMITED — economic relief (correct keyword for limited classification)
    make('12', 11, 'Buoni pasto e welfare voucher',         'sollievo economico', 'monetary_benefit',      { partecipanti: 50 }),
  ];
}

// ── Synthetic uploaded_record rows (individual pseudonymized participations) ──
// 20 rows, pseudonym_id pattern PSY-T001-NNN, no PII, raw_hash synthetic.

function buildUploadedRecordRows(tenantId: string, batchId: string) {
  const pillars  = ['LIFE', 'LIFE', 'LIFE', 'LIFE', 'LIFE',
                    'GROWTH', 'GROWTH', 'GROWTH', 'GROWTH', 'GROWTH',
                    'CONNECTION', 'CONNECTION', 'CONNECTION', 'CONNECTION',
                    'IMPACT', 'IMPACT', 'IMPACT',
                    'LEGACY', 'LEGACY', 'LEGACY'];
  const statuses = Array(16).fill('eligible')
    .concat(['eligible', 'limited', 'limited', 'blocked']) as string[];

  return Array.from({ length: 20 }, (_, i) => {
    const n = String(i + 1).padStart(3, '0');
    return {
      tenant_id:          tenantId,
      batch_id:           batchId,
      pseudonym_id:       `PSY-T001-${n}`,
      raw_hash:           `sha256:synthetic:test:001:row:${n}`,
      eligibility_status: statuses[i],
      primary_pillar:     pillars[i],
      event_nature:       i < 17 ? 'consumed_service' : (i === 17 ? 'monetary_benefit' : 'blocked_compliance'),
      review_status:      'approved',
      payload:            { synthetic: true, test_tenant: TEST_TENANT_CODE, row_index: i },
      privacy_redacted:   true,
    };
  });
}

// ── Audit helper ──────────────────────────────────────────────────────────────

function auditEvent(params: {
  tenantId:     string;
  action:       string;
  resourceType: string;
  resourceId?:  string;
  metadata:     Record<string, unknown>;
}) {
  return {
    tenant_id:     params.tenantId,
    actor_role:    'KORA_TEST_PIPELINE',
    actor_id:      'system-test-seed-route',
    action:        params.action,
    resource_type: params.resourceType,
    resource_id:   params.resourceId ?? null,
    payload: {
      synthetic_test:  true,
      tenant_code:     TEST_TENANT_CODE,
      reporting_period: TEST_REPORTING_PERIOD,
      ...params.metadata,
    },
  };
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Protection 1: block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Protection 2: secret header
  const clientSecret = request.headers.get('x-kora-test-secret');
  if (!clientSecret || clientSecret !== process.env.KORA_TEST_SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Phase 2B: 'as any' for multi-schema ops — pending supabase gen types (Task 7).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseServiceClient() as any;

  const auditRows: ReturnType<typeof auditEvent>[] = [];

  try {
    // ── Step 1a: Upsert analytics.tenant ─────────────────────────────────────

    let tenantId: string;
    let tenantWasCreated = false;

    const { data: existingTenant } = await db
      .schema('analytics')
      .from('tenant')
      .select('id')
      .eq('tenant_code', TEST_TENANT_CODE)
      .maybeSingle();

    if (existingTenant) {
      tenantId = existingTenant.id as string;
    } else {
      const { data: newTenant, error: tenantErr } = await db
        .schema('analytics')
        .from('tenant')
        .insert({
          tenant_code:            TEST_TENANT_CODE,
          company_name:           TEST_TENANT_NAME,
          industry_code:          'TEST',
          country_code:           'IT',
          onboarding_status:      'active',
          data_readiness_status:  'complete',
          decision_pack_status:   'not_ready',
          methodology_version_id: 'KORA Methodology v0.1',
          is_active:              true,
        })
        .select('id')
        .single();

      if (tenantErr || !newTenant) {
        return NextResponse.json({ error: `tenant insert failed: ${tenantErr?.message}` }, { status: 500 });
      }
      tenantId = newTenant.id as string;
      tenantWasCreated = true;
    }

    auditRows.push(auditEvent({
      tenantId,
      action:       'tenant_created_or_reused',
      resourceType: 'analytics.tenant',
      resourceId:   tenantId,
      metadata:     { operation: tenantWasCreated ? 'created' : 'reused', tenant_code: TEST_TENANT_CODE },
    }));

    // ── Step 1b: Insert personal.workforce_baseline ──────────────────────────
    // All segments ≥ 10 — N≥10 boundary respected by construction.

    const { data: wbData, error: wbErr } = await db
      .schema('personal')
      .from('workforce_baseline')
      .upsert({
        tenant_id:                tenantId,
        reporting_period:         TEST_REPORTING_PERIOD,
        total_workers:            WORKFORCE_POPULATION,
        segment_breakdown: {
          departments:    { 'dept-tech': 20, 'dept-sales': 15, 'dept-ops': 15 },
          contract_types: { full_time: 40, part_time: 10 },
        },
        privacy_threshold_applied: true,
        minimum_group_size:        10,
        created_by:                'system-test-seed-route',
      }, { onConflict: 'tenant_id,reporting_period' })
      .select('id')
      .single();

    if (wbErr || !wbData) {
      return NextResponse.json({ error: `workforce_baseline failed: ${wbErr?.message}` }, { status: 500 });
    }

    auditRows.push(auditEvent({
      tenantId,
      action:       'workforce_baseline_inserted',
      resourceType: 'personal.workforce_baseline',
      resourceId:   wbData.id as string,
      metadata:     { total_workers: WORKFORCE_POPULATION, segments_all_gte_10: true },
    }));

    // ── Step 1c: Insert analytics.source_batch ───────────────────────────────

    const { data: batchData, error: batchErr } = await db
      .schema('analytics')
      .from('source_batch')
      .insert({
        tenant_id:        tenantId,
        source_type:      'welfare_provider',
        source_name:      '[SYNTHETIC] Test welfare export',
        reporting_period: TEST_REPORTING_PERIOD,
        row_count:        20,
        mapped_count:     18,
        rejected_count:   1,
        batch_status:     'approved',
        completeness_pct: 0.9,
        mapping_confidence_avg: 0.85,
        evidence_attached_pct:  0.6,
        pending_review_count:   0,
        source_notes:     'Synthetic test batch — no real data',
        created_by:       'system-test-seed-route',
      })
      .select('id')
      .single();

    if (batchErr || !batchData) {
      return NextResponse.json({ error: `source_batch failed: ${batchErr?.message}` }, { status: 500 });
    }
    const batchId = batchData.id as string;

    auditRows.push(auditEvent({
      tenantId,
      action:       'source_batch_created',
      resourceType: 'analytics.source_batch',
      resourceId:   batchId,
      metadata:     { source_type: 'welfare_provider', row_count: 20 },
    }));

    // ── Step 1d: Insert personal.uploaded_record (20 synthetic rows) ─────────

    const uploadedRows = buildUploadedRecordRows(tenantId, batchId);
    const { error: urErr } = await db
      .schema('personal')
      .from('uploaded_record')
      .insert(uploadedRows);

    if (urErr) {
      return NextResponse.json({ error: `uploaded_record failed: ${urErr.message}` }, { status: 500 });
    }

    auditRows.push(auditEvent({
      tenantId,
      action:       'uploaded_records_inserted',
      resourceType: 'personal.uploaded_record',
      metadata:     { count: 20, pseudonym_prefix: 'PSY-T001-', pii_present: false },
    }));

    // ── Step 2: Generate analytics.uef_record via EligibilityGate ────────────

    const syntheticRecords = buildSyntheticRecords(batchId);
    const eligibilityResults = classifyEligibilityBatch(syntheticRecords);

    const uefRows = syntheticRecords.map((rec, i) => {
      const elig = eligibilityResults[i];
      return {
        tenant_id:                   tenantId,
        batch_id:                    batchId,
        reporting_period:            TEST_REPORTING_PERIOD,
        raw_name:                    String(rec.raw['nome_iniziativa'] ?? rec.recordId),
        eligibility:                 elig.status === 'review_required' ? 'limited' : elig.status,
        primary_pillar:              null,  // pillar mapping is a separate engine step
        action_family:               String(rec.raw['categoria'] ?? ''),
        event_nature:                String(rec.raw['tipo'] ?? ''),
        approved_for_scoring:        elig.status === 'eligible',
        approved_for_bti_governance: elig.status === 'eligible' || elig.status === 'limited',
        approved_for_impact_units:   elig.status === 'eligible',
        data_completeness_score:     elig.confidence,
        missing_fields:              [],
        review_status:               'approved',
        reviewer_notes:              `Synthetic test. EligibilityGate: ${elig.status} (${elig.reason.slice(0, 120)})`,
        reviewed_by:                 'system-test-seed-route',
        payload:                     { synthetic: true, eligibility_result: elig },
      };
    });

    const { error: uefErr } = await db
      .schema('analytics')
      .from('uef_record')
      .insert(uefRows);

    if (uefErr) {
      return NextResponse.json({ error: `uef_record failed: ${uefErr.message}` }, { status: 500 });
    }

    const eligibleCount = eligibilityResults.filter(e => e.status === 'eligible').length;
    const limitedCount  = eligibilityResults.filter(e => e.status === 'limited').length;
    const blockedCount  = eligibilityResults.filter(e => e.status === 'blocked').length;

    auditRows.push(auditEvent({
      tenantId,
      action:       'uef_records_generated',
      resourceType: 'analytics.uef_record',
      metadata:     {
        total_records:   syntheticRecords.length,
        eligible:        eligibleCount,
        limited:         limitedCount,
        blocked:         blockedCount,
        eligibility_gate_version: 'v0.1',
      },
    }));

    // ── Step 3: runKoraPipeline + persist ─────────────────────────────────────

    const pipelineResult = runKoraPipeline({
      tenantId,
      batchId,
      records:             syntheticRecords,
      workforcePopulation: WORKFORCE_POPULATION,
    });

    auditRows.push(auditEvent({
      tenantId,
      action:       'scoring_run_completed',
      resourceType: 'kora_pipeline',
      resourceId:   batchId,
      metadata:     {
        scoring_mode:       pipelineResult.scoringMode,
        kora_index_value:   pipelineResult.koraIndex.value,
        safeguard_status:   pipelineResult.activation.safeguardStatus,
        confidence_score:   pipelineResult.confidence.score,
        pipeline_warnings:  pipelineResult.warnings.length,
      },
    }));

    const persistResult = await persistKoraComputationResult({
      tenantId,
      batchId,
      reportingPeriod:     TEST_REPORTING_PERIOD,
      workforcePopulation: WORKFORCE_POPULATION,
      result:              pipelineResult,
    });

    auditRows.push(auditEvent({
      tenantId,
      action:       'results_persisted',
      resourceType: 'analytics.kora_index_result',
      resourceId:   persistResult.koraIndexResultId,
      metadata:     {
        activation_result_id:  persistResult.activationResultId,
        confidence_result_id:  persistResult.confidenceResultId,
        bti_result_id:         persistResult.btiResultId,
        kora_index_result_id:  persistResult.koraIndexResultId,
        is_current:            true,
      },
    }));

    // ── Flush audit log (all 7 events, service role) ──────────────────────────

    const { error: auditErr } = await db
      .schema('audit')
      .from('audit_log')
      .insert(auditRows);

    if (auditErr) {
      // Audit failure is non-fatal for the test; log but continue.
      console.error('[KORA test seed] audit_log insert failed:', auditErr.message);
    }

    // ── Response ──────────────────────────────────────────────────────────────

    return NextResponse.json({
      ok: true,
      tenant_id:           tenantId,
      tenant_code:         TEST_TENANT_CODE,
      reporting_period:    TEST_REPORTING_PERIOD,
      batch_id:            batchId,
      scoring_mode:        pipelineResult.scoringMode,
      kora_index_value:    pipelineResult.koraIndex.value,
      safeguard_status:    pipelineResult.activation.safeguardStatus,
      confidence_score:    pipelineResult.confidence.score,
      activation_rate:     pipelineResult.activation.activationReach,
      eligibility: { eligible: eligibleCount, limited: limitedCount, blocked: blockedCount },
      persisted: persistResult,
      audit_events_written: auditRows.length,
      synthetic_test: true,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[KORA test seed] unexpected error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
