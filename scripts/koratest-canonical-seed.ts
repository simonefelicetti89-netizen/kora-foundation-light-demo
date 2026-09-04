#!/usr/bin/env tsx
// scripts/koratest-canonical-seed.ts
// B-TRUTH — Canonical Test Tenant Input Foundation.
//
// Originally built for exactly one canonical test tenant ("KoraTest Srl",
// PR 1 of the ONE_PRODUCT_CANONICAL_MIGRATION plan). B-TRUTH Second
// Canonical Test Company (2026-09-06, PR 6 of the same plan) generalized it
// to accept ANY input fixture via --fixture=<path> — the script's own logic
// was ALREADY fixture-driven (tenant_code, company_name, reporting_period,
// workforce_population, segment_breakdown, and rows were always read FROM
// the loaded fixture, never hardcoded in the script body); only the fixture
// FILE PATH itself, and a handful of cosmetic string-literal labels/prefixes
// derived below from the fixture's own tenant_code/company_name (previously
// hardcoded to "koratest"/"KoraTest Srl"), needed generalizing. No canonical
// pipeline/methodology function below was touched — same functions, same
// call shapes, unchanged.
//
// USAGE:
//   npx tsx scripts/koratest-canonical-seed.ts
//       → Dry run against the default (KoraTest Srl) fixture: prints what
//         would be created, no DB writes
//
//   npx tsx scripts/koratest-canonical-seed.ts --apply
//       → Applies to DB: creates the KoraTest Srl tenant and pushes its fixture
//         rows through the SAME canonical pipeline a real client's upload uses.
//
//   npx tsx scripts/koratest-canonical-seed.ts --fixture=data/koratest/boscoverde_input_fixture.json --apply
//       → Same mechanism, a different canonical test tenant (its identity —
//         tenant_code, company_name — comes entirely from that fixture file).
//
// CORE INVARIANT — "seed inputs, run canonical processing, persist canonical
// outputs" — this script never writes a derived-output table directly. It
// writes only to the input-boundary tables (analytics.tenant,
// personal.workforce_baseline, analytics.source_batch, personal.uploaded_record)
// and then INVOKES the exact same canonical functions/logic the real product
// routes use to turn those inputs into derived results:
//
//   personal.uploaded_record
//     -> lib/ingestion/raw-to-uef-interpreter.ts's interpretUploadedRecord()
//        (same function app/api/admin/uef/generate-candidates/route.ts calls)
//     -> analytics.uef_record (review_status='pending_review')
//     -> a deterministic operator-approval stand-in (same effect as choosing
//        "approve" in app/api/admin/uef/review/route.ts — approved_for_scoring
//        = true, approved_for_bti_governance = true,
//        approved_for_impact_units = eligibility === 'eligible' — identical
//        rule to that route's own 'approve' branch)
//     -> lib/live/uef-to-scoring-records.ts's buildScoringRecordsFromApprovedUef()
//     -> lib/kora-engine/run-kora-pipeline.ts's runKoraPipeline() (same function
//        app/api/admin/scoring/run-approved-batch/route.ts calls)
//     -> lib/live/persistence.ts's persistKoraComputationResult()
//     -> lib/live/decision-pack.ts's persistDecisionPack()
//
// This script performs the SAME database writes app/api/admin/companies/provision
// (tenant), lib/live/workforce-baseline.ts's persistWorkforceBaseline
// (workforce baseline), and app/api/admin/data-intake/accept/route.ts
// (source_batch + uploaded_record shape) already perform for a real company —
// it does not invoke those routes over HTTP (a CLI script has no browser
// session to authenticate an HTTP call with), but it uses the identical
// underlying canonical functions and, where a route has no extracted function
// (source_batch/uploaded_record insertion), the identical insert shape —
// functionally the same code path, not a parallel one. See PART 1-2 of the
// KoraTest canonical foundation design turn for the full precedent trace.
//
// tenant_kind = 'TEST' (migration 014: "developer/QA test environment; not in
// live views") is set ONLY at tenant creation, exactly like
// app/api/admin/companies/provision/route.ts's own tenant_kind parameter — it
// is never read by interpretUploadedRecord, classifyEligibilityBatch,
// runKoraPipeline, persistKoraComputationResult, or persistDecisionPack (none
// of those five canonical functions accept or branch on tenant_kind at all).
// The ONLY existing precedent for a tenant_kind-conditioned branch anywhere in
// this pipeline (app/api/admin/companies/provision/route.ts skipping the real
// email invite side-effect for non-LIVE tenants) does not apply here — this
// script does not create a Supabase Auth user.
//
// KoraTest Srl is NOT tenant_code 'OP-001' — the one existing hardcoded
// tenant-identity special case in this pipeline
// (app/api/admin/scoring/run-approved-batch/route.ts's literal
// `tenantCode === 'OP-001'` block) does not apply to it.
//
// FORBIDDEN — this script must never directly INSERT into: analytics.uef_record
// with hand-typed interpreted content, analytics.kora_index_result,
// analytics.bti_result, analytics.activation_result, analytics.confidence_result,
// or analytics.decision_pack_version. See
// tests/unit/b-truth-koratest-canonical-foundation.test.ts for the regression
// guard proving this invariant by direct source inspection.
//
// SAFETY:
//   - Default is dry-run. --apply must be explicit.
//   - Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
//   - Idempotent: reuses an existing tenant by tenant_code; reuses an existing
//     source_batch for the same (tenant, reporting_period, source_name) instead
//     of creating a duplicate; skips UEF-generation/scoring/Decision-Pack for a
//     batch that already has them. A second --apply run is a safe no-op beyond
//     confirming the existing state, matching the accept route's own
//     duplicate-batch guard (analytics.source_batch's own natural key).
//   - Never touches any tenant other than the one resolved from the loaded
//     fixture's own tenant_code (single `.eq('tenant_id', ...)` scope
//     throughout — no broad writes, no cleanup/reset step in this script).
//   - Does NOT import from data/synthetic/** and does NOT reuse
//     lib/live/op001-synthetic-records.ts — each fixture is its own file
//     under data/koratest/.

import * as fs from 'fs';
import * as path from 'path';

// ── Args ──────────────────────────────────────────────────────────────────────

const args  = process.argv.slice(2);
const apply = args.includes('--apply');

// ── Load fixture ──────────────────────────────────────────────────────────────

interface KoraTestFixtureRow {
  row_id: string;
  initiative_name: string;
  category: string;
  type: string;
  amount?: number;
  participants?: number;
  department_group?: string;
  _note?: string;
}

interface KoraTestFixture {
  company_name: string;
  tenant_code: string;
  reporting_period: string;
  workforce_population: number;
  segment_breakdown: Record<string, Record<string, number>>;
  rows: KoraTestFixtureRow[];
}

const fixtureArg = args.find((a) => a.startsWith('--fixture='));
const fixturePath = fixtureArg
  ? path.resolve(process.cwd(), fixtureArg.slice('--fixture='.length))
  : path.resolve(__dirname, '../data/koratest/koratest_input_fixture.json');

if (!fs.existsSync(fixturePath)) {
  console.error(`\n✗ Fixture not found: ${fixturePath}\n`);
  process.exit(1);
}

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8')) as KoraTestFixture;

// tenant_code, lowercased, used only to derive cosmetic identifiers below
// (pseudonym_id/raw_hash/recordId prefixes, createdBy label) — never used in
// any canonical function call and never a processing branch.
const tenantSlug = fixture.tenant_code.toLowerCase();

// ── Header ────────────────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  KORA Canonical Test Tenant Foundation — ${fixture.company_name}`);
console.log(`  Tenant code : ${fixture.tenant_code}`);
console.log(`  Period      : ${fixture.reporting_period}`);
console.log(`  Mode        : ${apply ? '⚠  APPLY (writes to DB, runs canonical pipeline)' : '✓  DRY RUN (no writes)'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(`Input rows to submit (${fixture.rows.length} total):`);
fixture.rows.forEach((r) => {
  const note = r._note ? ` — ${r._note}` : '';
  console.log(`  [${r.row_id}] ${r.initiative_name}${note}`);
});
console.log(`\nWorkforce population: ${fixture.workforce_population}`);

if (!apply) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DRY RUN complete. No changes made.');
  console.log('  To apply: add --apply flag');
  console.log('  Nothing here is a KORA output — apply mode only submits inputs and');
  console.log('  then invokes the real canonical pipeline to derive every result.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(0);
}

// ── Apply mode ────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('\n✗ Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  console.error('  Set them in .env.local and run with: source .env.local && npx tsx scripts/koratest-canonical-seed.ts --apply\n');
  process.exit(1);
}

async function run(): Promise<void> {
  // Dynamic imports — avoid loading Supabase/canonical engine modules in dry-run.
  const { createClient } = await import('@supabase/supabase-js');
  const { classifyEligibilityBatch } = await import('../lib/kora-engine/eligibility-gate');
  const { runKoraPipeline } = await import('../lib/kora-engine/run-kora-pipeline');
  const { persistKoraComputationResult } = await import('../lib/live/persistence');
  const { persistWorkforceBaseline } = await import('../lib/live/workforce-baseline');
  const { persistDecisionPack } = await import('../lib/live/decision-pack');
  const { interpretUploadedRecord } = await import('../lib/ingestion/raw-to-uef-interpreter');
  const { buildScoringRecordsFromApprovedUef } = await import('../lib/live/uef-to-scoring-records');
  type RawUploadedRecord = import('../lib/kora-engine/types').RawUploadedRecord;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } }) as any;

  const createdBy = `system-${tenantSlug}-canonical-seed`;

  // ── Step 1: Create or reuse the tenant identified by the fixture ───────────
  // Same insert shape as app/api/admin/companies/provision/route.ts's tenant
  // creation — idempotent on tenant_code, tenant_kind = 'TEST' (operational
  // safety only — see the file header for the no-branching proof).

  console.log(`\nLooking up tenant: ${fixture.tenant_code} ...`);

  let tenantId: string;
  const { data: existingTenant, error: lookupErr } = await db
    .schema('analytics').from('tenant')
    .select('id, company_name')
    .eq('tenant_code', fixture.tenant_code)
    .maybeSingle();

  if (lookupErr) {
    console.error(`\n✗ Tenant lookup failed: ${lookupErr.message}\n`);
    process.exit(1);
  }

  if (existingTenant) {
    tenantId = (existingTenant as { id: string }).id;
    console.log(`✓ Tenant reused: "${(existingTenant as { company_name: string }).company_name}" (${tenantId})`);
  } else {
    const { data: created, error: insertErr } = await db
      .schema('analytics').from('tenant')
      .insert({
        tenant_code:             fixture.tenant_code,
        company_name:            fixture.company_name,
        industry_code:           null,
        country_code:            'IT',
        onboarding_status:       'active',
        data_readiness_status:   'intake_ready',
        decision_pack_status:    'not_ready',
        methodology_version_id:  'KORA Index v1.0',
        is_active:               true,
        tenant_kind:             'TEST',
      })
      .select('id')
      .single();

    if (insertErr || !created) {
      console.error(`\n✗ Tenant creation failed: ${insertErr?.message ?? 'no data returned'}\n`);
      process.exit(1);
    }
    tenantId = (created as { id: string }).id;
    console.log(`✓ Tenant created: "${fixture.company_name}" (${tenantId})`);
  }

  // ── Step 2: Workforce baseline (canonical, N>=10 enforced, self-idempotent) ─
  // persistWorkforceBaseline() upserts on (tenant_id, reporting_period) — a
  // second --apply run updates the same row rather than duplicating it.

  const wbResult = await persistWorkforceBaseline({
    db, tenantId,
    reportingPeriod:     fixture.reporting_period,
    totalWorkers:        fixture.workforce_population,
    rawSegmentBreakdown: fixture.segment_breakdown,
    createdBy,
  });
  console.log(`✓ Workforce baseline persisted (${wbResult.totalWorkers} workers, id=${wbResult.id})`);

  // ── Step 3: Source batch — same natural-key duplicate guard as the real ────
  // accept route (tenant_id, reporting_period, source_name).

  const batchLabel = `${fixture.company_name} — canonical foundation batch ${fixture.reporting_period}`;

  const { data: existingBatch } = await db
    .schema('analytics').from('source_batch')
    .select('id, batch_status')
    .eq('tenant_id', tenantId)
    .eq('reporting_period', fixture.reporting_period)
    .eq('source_name', batchLabel)
    .not('batch_status', 'in', '("rejected","archived")')
    .limit(1)
    .maybeSingle();

  let batchId: string;
  let batchIsNew = false;

  if (existingBatch) {
    batchId = (existingBatch as { id: string }).id;
    console.log(`✓ Source batch reused (id=${batchId}, status=${(existingBatch as { batch_status: string }).batch_status})`);
  } else {
    batchIsNew = true;

    // ── Step 4: uploaded_record — same shape as accept/route.ts, canonical
    // classifyEligibilityBatch() drives eligibility_status (not hand-typed).

    const rawRecords: RawUploadedRecord[] = fixture.rows.map((row, i) => ({
      recordId:           `${tenantSlug}-${row.row_id}`,
      batchId:             'pre-batch',
      rowIndex:            i,
      detectedRecordType: 'welfare_program',
      raw: {
        initiative_name: row.initiative_name,
        category:        row.category,
        type:            row.type,
        ...(row.amount       != null ? { amount: row.amount } : {}),
        ...(row.participants != null ? { participants: row.participants } : {}),
      },
    }));
    const eligResults = classifyEligibilityBatch(rawRecords);

    const { data: batchData, error: batchErr } = await db
      .schema('analytics').from('source_batch')
      .insert({
        tenant_id:              tenantId,
        source_type:            'manual',
        source_name:            batchLabel,
        reporting_period:       fixture.reporting_period,
        row_count:               fixture.rows.length,
        mapped_count:            eligResults.filter(e => e.status === 'eligible' || e.status === 'limited').length,
        rejected_count:          eligResults.filter(e => e.status === 'blocked').length,
        batch_status:            'pending',
        completeness_pct:        null,
        mapping_confidence_avg:  null,
        evidence_attached_pct:   null,
        pending_review_count:    fixture.rows.length,
        source_notes:            `B-TRUTH ${fixture.company_name} canonical foundation — deterministic fixture, real pipeline.`,
        created_by:              createdBy,
        processed_at:            null,
      })
      .select('id')
      .single();

    if (batchErr || !batchData) {
      console.error(`\n✗ source_batch creation failed: ${batchErr?.message ?? 'no data returned'}\n`);
      process.exit(1);
    }
    batchId = (batchData as { id: string }).id;
    console.log(`✓ Source batch created (id=${batchId})`);

    const uploadedRows = fixture.rows.map((row, i) => ({
      tenant_id:          tenantId,
      batch_id:           batchId,
      pseudonym_id:       `PSY-${tenantSlug.toUpperCase()}-${batchId.slice(0, 8)}-${String(i).padStart(4, '0')}`,
      raw_hash:           `${tenantSlug}-row:${batchId}:${String(i).padStart(4, '0')}`,
      eligibility_status: eligResults[i].status,
      primary_pillar:     null,
      action_family:      row.category,
      event_nature:       row.type,
      review_status:      'pending' as const,
      payload: {
        initiative_name: row.initiative_name,
        category:        row.category,
        type:            row.type,
        ...(row.amount       != null ? { amount: row.amount } : {}),
        ...(row.participants != null ? { participants: row.participants } : {}),
        ...(row.department_group ? { department_group: row.department_group } : {}),
      },
      privacy_redacted: false,
      reviewed_at:      null,
    }));

    const { error: urErr } = await db.schema('personal').from('uploaded_record').insert(uploadedRows);
    if (urErr) {
      console.error(`\n✗ uploaded_record insertion failed: ${urErr.message}\n`);
      process.exit(1);
    }
    console.log(`✓ ${uploadedRows.length} uploaded_record rows persisted`);
  }

  // ── Step 5: Canonical UEF interpretation ────────────────────────────────────
  // Skip if this batch already has UEF candidates (idempotent rerun).

  const { count: existingUefCount } = await db
    .schema('analytics').from('uef_record')
    .select('id', { count: 'exact', head: true })
    .eq('batch_id', batchId);

  if ((existingUefCount ?? 0) > 0) {
    console.log(`✓ UEF candidates already exist for this batch (${existingUefCount}) — skipping generation`);
  } else {
    const { data: uploadedForInterp, error: urReadErr } = await db
      .schema('personal').from('uploaded_record')
      .select('id, payload, action_family, event_nature, primary_pillar, eligibility_status')
      .eq('batch_id', batchId)
      .eq('review_status', 'pending');

    if (urReadErr || !uploadedForInterp) {
      console.error(`\n✗ uploaded_record read failed: ${urReadErr?.message ?? 'no rows'}\n`);
      process.exit(1);
    }

    // Canonical interpreter — same call shape as
    // app/api/admin/uef/generate-candidates/route.ts. No hand-written
    // interpreted content anywhere in this script.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uefRows = (uploadedForInterp as any[]).map((row) => {
      const proposal = interpretUploadedRecord({
        id:                 row.id,
        payload:            (row.payload as Record<string, unknown>) ?? {},
        action_family:      row.action_family ?? null,
        event_nature:       row.event_nature ?? null,
        primary_pillar:     row.primary_pillar ?? null,
        eligibility_status: row.eligibility_status ?? null,
      }, 'KORA Index v1.0');

      // Deterministic operator-approval stand-in for the human UEF review
      // step (documented in the file header) — identical rule to
      // app/api/admin/uef/review/route.ts's 'approve' branch. The
      // interpreted CONTENT above is never touched by this stand-in; only
      // the review/approval state is set.
      const approvedForScoring     = true;
      const approvedForBTI         = true;
      const approvedForImpactUnits = proposal.eligibility === 'eligible';

      return {
        tenant_id:                   tenantId,
        batch_id:                    batchId,
        reporting_period:            fixture.reporting_period,
        raw_name:                    proposal.rawName,
        eligibility:                 proposal.eligibility,
        primary_pillar:              proposal.pillar,
        action_family:               proposal.actionFamily,
        event_nature:                proposal.eventNature,
        approved_for_scoring:        approvedForScoring,
        approved_for_bti_governance: approvedForBTI,
        approved_for_impact_units:   approvedForImpactUnits,
        data_completeness_score:     proposal.mappingConfidence,
        missing_fields:              proposal.warnings,
        review_status:               'approved',
        reviewer_notes:              `B-TRUTH ${fixture.company_name} canonical foundation — automated operator approval for deterministic test provisioning.`,
        reviewed_by:                 createdBy,
        reviewed_at:                 new Date().toISOString(),
        payload: {
          uploaded_record_id:        row.id,
          event_type:                proposal.eventType,
          reason_codes:              proposal.reasonCodes,
          budget_amount:             proposal.budgetAmount,
          participants:              proposal.participants,
          evidence_level:            proposal.evidenceLevel,
          source_tier:               proposal.sourceTier,
          amount_parsing_status:     proposal.amountParsingStatus,
          participants_approximate: proposal.participantsApproximate,
          initiative_domain:         proposal.initiativeDomain,
          budget_class:              proposal.budgetClass,
          interpreter_version:       proposal.interpreterVersion,
          generated_by:              proposal.generatedBy,
          methodology_version:       'KORA Index v1.0',
        },
      };
    });

    const { error: uefErr } = await db.schema('analytics').from('uef_record').insert(uefRows);
    if (uefErr) {
      console.error(`\n✗ uef_record insertion failed: ${uefErr.message}\n`);
      process.exit(1);
    }
    console.log(`✓ ${uefRows.length} UEF candidates generated (canonical interpreter) and auto-approved (operator stand-in)`);

    if (batchIsNew) {
      await db.schema('analytics').from('source_batch').update({ batch_status: 'processing' }).eq('id', batchId);
    }
  }

  // ── Step 6: Canonical scoring — skip if this batch already has a result ────

  const { data: existingResult } = await db
    .schema('analytics').from('kora_index_result')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('reporting_period', fixture.reporting_period)
    .eq('is_current', true)
    .maybeSingle();

  if (existingResult) {
    console.log(`✓ kora_index_result already exists for this period (id=${(existingResult as { id: string }).id}) — skipping scoring rerun`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  APPLY complete (idempotent no-op past this point).');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
  }

  const { data: approvedUef, error: approvedUefErr } = await db
    .schema('analytics').from('uef_record')
    .select('id, raw_name, eligibility, primary_pillar, action_family, event_nature, missing_fields, approved_for_impact_units, payload')
    .eq('batch_id', batchId)
    .eq('review_status', 'approved')
    .eq('approved_for_scoring', true);

  if (approvedUefErr || !approvedUef || approvedUef.length === 0) {
    console.error(`\n✗ No approved UEF records found for scoring: ${approvedUefErr?.message ?? 'none'}\n`);
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedUefRows = (approvedUef as any[]).map((row) => ({
    id:                        row.id as string,
    raw_name:                  row.raw_name as string,
    eligibility:               row.eligibility as string,
    primary_pillar:            row.primary_pillar as string | null,
    action_family:             row.action_family as string | null,
    event_nature:              row.event_nature as string | null,
    missing_fields:            Array.isArray(row.missing_fields) ? row.missing_fields as string[] : [],
    approved_for_impact_units: Boolean(row.approved_for_impact_units),
    payload:                   (row.payload ?? {}) as Record<string, unknown>,
  }));

  // Canonical adapter — same call as run-approved-batch/route.ts.
  const records = buildScoringRecordsFromApprovedUef(typedUefRows, batchId);

  // Canonical scoring engine — same call as run-approved-batch/route.ts.
  const pipelineResult = runKoraPipeline({
    tenantId, batchId, records,
    workforcePopulation: fixture.workforce_population,
  });

  console.log(`✓ runKoraPipeline() executed — KORA Index: ${pipelineResult.koraIndex.value}, safeguard: ${pipelineResult.activation.safeguardStatus}`);

  // Canonical persistence — same call as run-approved-batch/route.ts.
  const persistResult = await persistKoraComputationResult({
    tenantId, batchId,
    reportingPeriod:     fixture.reporting_period,
    workforcePopulation: fixture.workforce_population,
    result:              pipelineResult,
  });
  console.log(`✓ Results persisted (kora_index_result_id=${persistResult.koraIndexResultId})`);

  // ── Step 7: Canonical Decision Pack ─────────────────────────────────────────

  const decisionPack = await persistDecisionPack({
    db, tenantId,
    reportingPeriod:   fixture.reporting_period,
    persistenceResult: persistResult,
    createdBy,
    packPayload: {
      batch_id:             batchId,
      approved_uef_count:   approvedUef.length,
      workforce_population: fixture.workforce_population,
      canonical_test_tenant_foundation: true,
    },
  });
  console.log(`✓ Decision Pack created (id=${decisionPack.id}, version=${decisionPack.versionId})`);

  // Same source_batch -> 'approved' update as
  // app/api/admin/scoring/run-approved-batch/route.ts's own Step 12 — kept
  // as its own step here for the same reason that route keeps it separate:
  // a failure here must not undo the scoring/Decision Pack results already
  // persisted above, only be logged. Added 2026-09-05 (B-TRUTH
  // CompanyDataIntakeService Canonical Migration) — PR 1's own scoring step
  // omitted this update, leaving source_batch.batch_status stuck at
  // 'processing' even after real scoring completed; canonical Data Intake
  // status derivation (lib/live/data-intake-status.ts) reads batch_status
  // to determine readiness, so KoraTest Srl needs this to be accurate for
  // that derivation to validate correctly against real KoraTest data.
  const { error: batchApprovedErr } = await db
    .schema('analytics').from('source_batch')
    .update({ batch_status: 'approved' })
    .eq('id', batchId);
  if (batchApprovedErr) console.error('[koratest-canonical-seed] batch status update:', batchApprovedErr.message);
  else console.log('✓ Source batch marked approved');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  APPLY complete.');
  console.log(`  Tenant:        ${fixture.tenant_code} (${tenantId})`);
  console.log(`  KORA Index:    ${pipelineResult.koraIndex.value}`);
  console.log(`  Safeguard:     ${pipelineResult.activation.safeguardStatus}`);
  console.log(`  Decision Pack: ${decisionPack.versionId} (${decisionPack.status})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch((err) => {
  console.error('\n✗ Unexpected error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
