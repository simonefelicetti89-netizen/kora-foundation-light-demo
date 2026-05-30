// app/api/admin/operator-flow/route.ts
// LIVE Operator Flow — KORA_ADMIN only.
//
// Orchestrates the full synthetic operator pipeline:
//   Create/reuse tenant → workforce baseline (N≥10) → source batch →
//   uploaded records → UEF classification → runKoraPipeline → persist results →
//   persist Decision Pack (draft) → audit log
//
// Auth (priority order):
//   1. PRIMARY: KORA_ADMIN Supabase session (cookie or Authorization: Bearer <token>)
//   2. DEPRECATED fallback: x-kora-operator-secret (dev-only, BLOCKED in production)
//      See docs/technical-backlog.md TODO-002 for removal plan.
//
// Uses service_role server-side only — SUPABASE_SERVICE_ROLE_KEY never exposed to client.
//
// POST /api/admin/operator-flow
//   Body: { tenantCode, reportingPeriod, workforcePopulation?, segmentBreakdown?, batchLabel? }
//
// GET  /api/admin/operator-flow?tenantCode=OP-001&reportingPeriod=2026-Q1
//   Returns current kora_index_result for the tenant.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { classifyEligibilityBatch } from '@/lib/kora-engine/eligibility-gate';
import { runKoraPipeline } from '@/lib/kora-engine';
import { persistKoraComputationResult } from '@/lib/live/persistence';
import { persistWorkforceBaseline } from '@/lib/live/workforce-baseline';
import { persistDecisionPack } from '@/lib/live/decision-pack';
import type { RawUploadedRecord } from '@/lib/kora-engine/types';

const SYNTHETIC_WORKFORCE_DEFAULT = 50;

// Default synthetic segment breakdown — all segments ≥ 10 by construction.
const DEFAULT_SEGMENT_BREAKDOWN = {
  departments:    { 'dept-tech': 20, 'dept-sales': 15, 'dept-ops': 15 },
  contract_types: { full_time: 40, part_time: 10 },
};

// Default synthetic records — covers all 5 pillars + limited.
function buildDefaultRecords(batchId: string): RawUploadedRecord[] {
  const make = (
    id: string, idx: number, nome: string, categoria: string, tipo: string,
    extra?: Record<string, unknown>,
  ): RawUploadedRecord => ({
    recordId:           `r-op-${id}`,
    batchId,
    rowIndex:           idx,
    detectedRecordType: 'welfare_program',
    raw: { nome_iniziativa: nome, categoria, tipo, ...extra },
  });
  return [
    make('01', 0,  'Programma di supporto psicologico',      'salute e benessere', 'consumed_service',      { partecipanti: 25 }),
    make('02', 1,  'Formazione professionale avanzata',       'crescita',           'training',              { partecipanti: 20 }),
    make('03', 2,  'Programma di mentoring inter-funzionale', 'mentoring',          'policy',                { partecipanti: 14 }),
    make('04', 3,  'Volontariato aziendale territoriale',     'impatto territoriale','collective_initiative', { partecipanti: 18 }),
    make('05', 4,  'Trasferimento competenze senior-junior',  'legacy conoscenza',  'training',              { partecipanti: 10 }),
    make('06', 5,  'Buoni pasto e welfare voucher',           'sollievo economico', 'monetary_benefit',      { partecipanti: 50 }),
  ];
}

// Audit event factory.
function auditEvent(params: {
  tenantId: string; action: string; resourceType: string;
  resourceId?: string; metadata: Record<string, unknown>;
}) {
  return {
    tenant_id:     params.tenantId,
    actor_role:    'KORA_ADMIN',
    actor_id:      'system-operator-flow',
    action:        params.action,
    resource_type: params.resourceType,
    resource_id:   params.resourceId ?? null,
    payload: { synthetic_test: true, ...params.metadata },
  };
}

// ── Auth check ────────────────────────────────────────────────────────────────
// Primary: KORA_ADMIN session (cookie or Authorization header).
// Fallback: x-kora-operator-secret — DEPRECATED, dev-only, BLOCKED in production.
//   See docs/technical-backlog.md TODO-002.

async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  // 1. Primary: KORA_ADMIN session
  const authResult = await requireKoraAdmin(request);
  if (!isKoraAuthError(authResult)) return null; // authorized — proceed

  // 2. DEPRECATED fallback — BLOCKED in production
  if (process.env.NODE_ENV === 'production') {
    return authResult; // return 401/403 directly — no secret fallback in production
  }
  // [DEV ONLY] Accept deprecated secret as fallback — MUST be removed before production.
  // See docs/technical-backlog.md TODO-002.
  const secret = request.headers.get('x-kora-operator-secret');
  if (secret && secret === process.env.KORA_OPERATOR_SECRET) {
    console.warn(
      '[KORA operator-flow] DEPRECATED: authorized via x-kora-operator-secret fallback. ' +
      'This path is blocked in production. Migrate to KORA_ADMIN session auth. ' +
      'See docs/technical-backlog.md TODO-002.',
    );
    return null; // authorized via deprecated secret
  }

  return authResult; // unauthorized
}

// ── POST: run full operator flow ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  let body: {
    tenantCode?: string;
    reportingPeriod?: string;
    workforcePopulation?: number;
    segmentBreakdown?: Record<string, Record<string, number>>;
    batchLabel?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const tenantCode        = body.tenantCode ?? 'OP-001';
  const reportingPeriod   = body.reportingPeriod ?? '2026-Q1';
  const workforcePopulation = body.workforcePopulation ?? SYNTHETIC_WORKFORCE_DEFAULT;
  const segmentBreakdown  = body.segmentBreakdown ?? DEFAULT_SEGMENT_BREAKDOWN;
  const batchLabel        = body.batchLabel ?? `[SYNTHETIC] Operator batch ${new Date().toISOString().slice(0,10)}`;

  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const auditRows: ReturnType<typeof auditEvent>[] = [];

  try {
    // ── Step 1: Upsert analytics.tenant ────────────────────────────────────

    let tenantId: string;
    const { data: existing } = await db.schema('analytics').from('tenant')
      .select('id').eq('tenant_code', tenantCode).maybeSingle();

    if (existing) {
      tenantId = existing.id as string;
      auditRows.push(auditEvent({ tenantId, action: 'tenant_reused',
        resourceType: 'analytics.tenant', resourceId: tenantId,
        metadata: { tenant_code: tenantCode } }));
    } else {
      const { data: created, error: tErr } = await db.schema('analytics').from('tenant')
        .insert({
          tenant_code: tenantCode, company_name: `[SYNTHETIC] ${tenantCode}`,
          industry_code: 'SYNTHETIC', country_code: 'IT',
          onboarding_status: 'active', data_readiness_status: 'complete',
          decision_pack_status: 'not_ready',
          methodology_version_id: 'KORA Methodology v0.1', is_active: true,
        }).select('id').single();
      if (tErr || !created) return NextResponse.json({ error: `tenant: ${tErr?.message}` }, { status: 500 });
      tenantId = (created as { id: string }).id;
      auditRows.push(auditEvent({ tenantId, action: 'tenant_created',
        resourceType: 'analytics.tenant', resourceId: tenantId,
        metadata: { tenant_code: tenantCode } }));
    }

    // ── Step 2: Workforce baseline (N≥10 enforced via shared function) ─────

    let wbResult: Awaited<ReturnType<typeof persistWorkforceBaseline>>;
    try {
      wbResult = await persistWorkforceBaseline({
        db, tenantId, reportingPeriod,
        totalWorkers: workforcePopulation,
        rawSegmentBreakdown: segmentBreakdown,
        createdBy: 'system-operator-flow',
      });
    } catch (e) {
      return NextResponse.json({ error: `workforce_baseline: ${(e as Error).message}` }, { status: 500 });
    }
    for (const s of wbResult.suppressionAuditSummary) {
      auditRows.push(auditEvent({ tenantId,
        action: s.hadSuppression ? 'privacy_threshold_suppressed' : 'privacy_threshold_checked',
        resourceType: 'personal.workforce_baseline', resourceId: wbResult.id,
        metadata: { dimension: s.dimension, had_suppression: s.hadSuppression,
          suppressed_group_count: s.suppressedGroupCount, min_group_size: wbResult.minimumGroupSize } }));
    }
    auditRows.push(auditEvent({ tenantId, action: 'workforce_baseline_inserted',
      resourceType: 'personal.workforce_baseline', resourceId: wbResult.id,
      metadata: { total_workers: workforcePopulation, segments_all_safe: !wbResult.suppression.anyUnsafe } }));

    // ── Step 3: Source batch ────────────────────────────────────────────────

    const { data: batchData, error: batchErr } = await db.schema('analytics').from('source_batch')
      .insert({
        tenant_id: tenantId, source_type: 'welfare_provider', source_name: batchLabel,
        reporting_period: reportingPeriod, row_count: 6, mapped_count: 5, rejected_count: 1,
        batch_status: 'approved', completeness_pct: 0.85, mapping_confidence_avg: 0.82,
        evidence_attached_pct: 0.5, pending_review_count: 0, created_by: 'system-operator-flow',
      }).select('id').single();
    if (batchErr || !batchData) return NextResponse.json({ error: `source_batch: ${batchErr?.message}` }, { status: 500 });
    const batchId = (batchData as { id: string }).id;
    auditRows.push(auditEvent({ tenantId, action: 'source_batch_created',
      resourceType: 'analytics.source_batch', resourceId: batchId,
      metadata: { batch_label: batchLabel } }));

    // ── Step 4: Uploaded records (pseudonymized) ────────────────────────────

    const uploadedRows = Array.from({ length: 10 }, (_, i) => {
      const n = String(i + 1).padStart(3, '0');
      return {
        tenant_id: tenantId, batch_id: batchId,
        pseudonym_id: `PSY-OP-${tenantCode}-${n}`,
        raw_hash: `sha256:synthetic:op:${tenantCode}:${n}`,
        eligibility_status: i < 8 ? 'eligible' : 'limited',
        primary_pillar: ['LIFE','GROWTH','CONNECTION','IMPACT','LEGACY','LIFE','GROWTH','CONNECTION','IMPACT','LEGACY'][i],
        event_nature: 'consumed_service',
        review_status: 'approved',
        payload: { synthetic: true, tenant_code: tenantCode, row_index: i },
        privacy_redacted: true,
      };
    });
    const { error: urErr } = await db.schema('personal').from('uploaded_record').insert(uploadedRows);
    if (urErr) return NextResponse.json({ error: `uploaded_record: ${urErr.message}` }, { status: 500 });
    auditRows.push(auditEvent({ tenantId, action: 'uploaded_records_inserted',
      resourceType: 'personal.uploaded_record',
      metadata: { count: 10, pseudonym_prefix: `PSY-OP-${tenantCode}-`, pii_present: false } }));

    // ── Step 5: EligibilityGate → UEF records ──────────────────────────────

    const syntheticRecords = buildDefaultRecords(batchId);
    const eligibilityResults = classifyEligibilityBatch(syntheticRecords);
    const uefRows = syntheticRecords.map((rec, i) => {
      const elig = eligibilityResults[i];
      return {
        tenant_id: tenantId, batch_id: batchId, reporting_period: reportingPeriod,
        raw_name: String(rec.raw['nome_iniziativa'] ?? rec.recordId),
        eligibility: elig.status === 'review_required' ? 'limited' : elig.status,
        primary_pillar: null, action_family: String(rec.raw['categoria'] ?? ''),
        event_nature: String(rec.raw['tipo'] ?? ''),
        approved_for_scoring:        elig.status === 'eligible',
        approved_for_bti_governance: elig.status === 'eligible' || elig.status === 'limited',
        approved_for_impact_units:   elig.status === 'eligible',
        data_completeness_score: elig.confidence,
        missing_fields: [], review_status: 'approved',
        reviewer_notes: `EligibilityGate: ${elig.status}`, reviewed_by: 'system-operator-flow',
        payload: { synthetic: true, eligibility_result: elig },
      };
    });
    const { error: uefErr } = await db.schema('analytics').from('uef_record').insert(uefRows);
    if (uefErr) return NextResponse.json({ error: `uef_record: ${uefErr.message}` }, { status: 500 });
    const eligCount = { eligible: eligibilityResults.filter(e => e.status === 'eligible').length,
                        limited:  eligibilityResults.filter(e => e.status === 'limited').length,
                        blocked:  eligibilityResults.filter(e => e.status === 'blocked').length };
    auditRows.push(auditEvent({ tenantId, action: 'uef_records_generated',
      resourceType: 'analytics.uef_record', metadata: { ...eligCount, total: syntheticRecords.length } }));

    // ── Step 6: runKoraPipeline + persist ───────────────────────────────────

    const pipelineResult = runKoraPipeline({
      tenantId, batchId, records: syntheticRecords, workforcePopulation,
    });
    auditRows.push(auditEvent({ tenantId, action: 'scoring_run_completed',
      resourceType: 'kora_pipeline', resourceId: batchId,
      metadata: { kora_index_value: pipelineResult.koraIndex.value,
        safeguard_status: pipelineResult.activation.safeguardStatus,
        confidence_score: pipelineResult.confidence.score } }));

    const persistResult = await persistKoraComputationResult({
      tenantId, batchId, reportingPeriod, workforcePopulation, result: pipelineResult,
    });
    auditRows.push(auditEvent({ tenantId, action: 'results_persisted',
      resourceType: 'analytics.kora_index_result', resourceId: persistResult.koraIndexResultId,
      metadata: { kora_index_result_id: persistResult.koraIndexResultId, is_current: true } }));

    // ── Step 7: Decision Pack (draft) ───────────────────────────────────────

    const decisionPack = await persistDecisionPack({
      db, tenantId, reportingPeriod, persistenceResult: persistResult,
      createdBy: 'system-operator-flow',
      packPayload: { tenant_code: tenantCode, kora_index: pipelineResult.koraIndex.value,
        safeguard: pipelineResult.activation.safeguardStatus,
        confidence_score: pipelineResult.confidence.score / 100 },
    });
    auditRows.push(auditEvent({ tenantId, action: 'decision_pack_created',
      resourceType: 'analytics.decision_pack_version', resourceId: decisionPack.id,
      metadata: { version_id: decisionPack.versionId, status: 'draft' } }));

    // ── Step 8: Flush audit log ─────────────────────────────────────────────

    const { error: auditErr } = await db.schema('audit').from('audit_log').insert(auditRows);
    if (auditErr) console.error('[operator-flow] audit_log:', auditErr.message);

    return NextResponse.json({
      ok: true,
      tenant_id:       tenantId,
      tenant_code:     tenantCode,
      reporting_period: reportingPeriod,
      batch_id:        batchId,
      scoring: {
        mode:                       pipelineResult.scoringMode,
        kora_index_value:           pipelineResult.koraIndex.value,
        safeguard_status:           pipelineResult.activation.safeguardStatus,
        confidence_score:           pipelineResult.confidence.score,  // 0–100
        activation_rate:            pipelineResult.activation.activationReach,
        meaningful_activation_rate: pipelineResult.activation.meaningfulActivationReach,
      },
      persisted: {
        activation_result_id: persistResult.activationResultId,
        confidence_result_id: persistResult.confidenceResultId,
        bti_result_id:        persistResult.btiResultId,
        kora_index_result_id: persistResult.koraIndexResultId,
      },
      decision_pack: {
        id:                  decisionPack.id,
        version_id:          decisionPack.versionId,
        status:              decisionPack.status,
        kora_index_result_id: persistResult.koraIndexResultId,
      },
      privacy: {
        n_threshold:            10,
        segment_breakdown_safe: !wbResult.suppression.anyUnsafe,
      },
      audit_events_written: auditRows.length,
      audit_actions:        auditRows.map(r => r.action),
      synthetic_test: true,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[operator-flow] unexpected error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── GET: read current scoring result for a tenant ────────────────────────────

export async function GET(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const tenantCode      = searchParams.get('tenantCode');
  const reportingPeriod = searchParams.get('reportingPeriod');
  if (!tenantCode || !reportingPeriod) {
    return NextResponse.json({ error: 'tenantCode and reportingPeriod required' }, { status: 400 });
  }

  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: tenant } = await db.schema('analytics').from('tenant')
    .select('id').eq('tenant_code', tenantCode).maybeSingle();
  if (!tenant) return NextResponse.json({ ok: false, status: 'not_found' }, { status: 404 });

  const { data: ki } = await db.schema('analytics').from('kora_index_result')
    .select('*, confidence_result:confidence_result_id(*), activation_result:activation_result_id(*)')
    .eq('tenant_id', tenant.id).eq('reporting_period', reportingPeriod).eq('is_current', true)
    .maybeSingle();
  if (!ki) return NextResponse.json({ ok: false, status: 'no_result' });

  // Expand decision_pack to include created_at and kora_index_result_id.
  const { data: dp } = await db.schema('analytics').from('decision_pack_version')
    .select('id,version_id,status,created_at,kora_index_result_id')
    .eq('tenant_id', tenant.id)
    .eq('reporting_period', reportingPeriod)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();

  // Audit summary: last 10 events for this tenant — read-only, no new logic.
  const { data: auditEvents } = await db.schema('audit').from('audit_log')
    .select('action, resource_type, created_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Extract activation rates from joined activation_result row.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actRow = (ki as any).activation_result as {
    activation_rate?: number;
    meaningful_activation_rate?: number;
  } | null;

  return NextResponse.json({
    ok: true,
    tenant_id:        tenant.id,
    tenant_code:      tenantCode,
    reporting_period: reportingPeriod,
    kora_index: {
      id:                         ki.id,
      value:                      ki.kora_index_value,
      safeguard:                  ki.safeguard_status,
      calibration:                ki.calibration_status,
      methodology:                ki.methodology_version_id,
      confidence:                 (ki as any).confidence_result?.confidence_score ?? null, // eslint-disable-line @typescript-eslint/no-explicit-any
      component_count:            (ki.components ?? []).length,
      is_current:                 ki.is_current,
      created_at:                 ki.created_at,
      activation_rate:            actRow?.activation_rate ?? null,
      meaningful_activation_rate: actRow?.meaningful_activation_rate ?? null,
    },
    decision_pack:  dp ?? null,
    audit_summary:  (auditEvents ?? []).map(e => ({
      action:        (e as any).action as string, // eslint-disable-line @typescript-eslint/no-explicit-any
      resource_type: (e as any).resource_type as string | null, // eslint-disable-line @typescript-eslint/no-explicit-any
      created_at:    (e as any).created_at as string, // eslint-disable-line @typescript-eslint/no-explicit-any
    })),
    synthetic_test: true,
  });
}
