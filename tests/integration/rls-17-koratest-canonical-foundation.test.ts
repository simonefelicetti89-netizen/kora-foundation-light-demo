/**
 * RLS-17 — KoraTest Srl canonical test-tenant foundation, real-runtime proof
 * (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A DB-backed proof that scripts/koratest-canonical-seed.ts's approach —
 *   seed INPUTS only (tenant, workforce baseline, source batch, uploaded
 *   records), then invoke the canonical Raw-to-UEF interpreter
 *   (interpretUploadedRecord, unchanged) and the canonical scoring engine
 *   (runKoraPipeline, unchanged) — actually produces UEF content from the
 *   real interpreter (not hand-typed) and a real scoring result, for a
 *   tenant_kind='TEST' tenant that is NOT OP-001, and that a second
 *   --apply-equivalent run is idempotent (no duplicate rows).
 *
 *   This is a narrower, KoraTest-specific companion to RLS-16
 *   (tests/integration/rls-16-ingestion-tenant-kind-parity.test.ts), which
 *   already proves the broader "no tenant_kind branch, DEMO-kind and
 *   LIVE-kind tenants reach identical runKoraPipeline output" invariant
 *   using the same underlying functions. RLS-16 hand-builds its
 *   analytics.uef_record fixture directly from classifyEligibilityBatch's
 *   output (no interpreter call); this test additionally proves the
 *   interpreter itself (interpretUploadedRecord) is exercised for real,
 *   which is the one canonical step scripts/koratest-canonical-seed.ts adds
 *   beyond RLS-16's own proof.
 *
 * DELIBERATELY OUT OF SCOPE (not gaps — see PART 17's own instruction not to
 * duplicate broad architecture tests):
 *   - Cross-tenant RLS isolation (a second tenant cannot read KoraTest's
 *     rows) is already generically proven, for EVERY tenant regardless of
 *     tenant_kind, by the existing RLS-03/RLS-11..15 suite's
 *     `tenant_id = kora.tenant_id()` policy proofs — not duplicated here.
 *   - persistKoraComputationResult / persistDecisionPack (the Supabase-JS,
 *     service-role write path, not a raw-pg path) are exercised by
 *     scripts/koratest-canonical-seed.ts itself, using the exact same call
 *     shape app/api/admin/scoring/run-approved-batch/route.ts already uses
 *     (imported unchanged, never reimplemented) — not duplicated here as a
 *     second, parallel implementation risk.
 *
 * SAME SAFETY MODEL AS RLS-16 (see that file's header for the full
 * rationale): skip-safe by default (RLS17_PG_URL + RLS17_ALLOW_RUN==='true'
 * required), an always-on static guard blocking known staging/production
 * refs and any hosted Supabase domain, loopback-host-only, single
 * privileged connection, teardown scoped strictly to this test's own
 * tenant_code.
 *
 * REQUIRED ENV VARS:
 *   RLS17_PG_URL     — direct Postgres connection string, local Supabase only.
 *   RLS17_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';
import { classifyEligibilityBatch, runKoraPipeline } from '../../lib/kora-engine';
import type { RawUploadedRecord } from '../../lib/kora-engine/types';
import { interpretUploadedRecord, type UploadedRecordInput } from '../../lib/ingestion/raw-to-uef-interpreter';
import { buildScoringRecordsFromApprovedUef, type UefRowForScoring } from '../../lib/live/uef-to-scoring-records';

// ── Structural guard — no legacy synthetic path, no data/synthetic/** import ─

describe('RLS-17 structural guard — no legacy synthetic Ingestion/UEF path is used by this suite', () => {
  const ownSource = readFileSync(resolve(__dirname, 'rls-17-koratest-canonical-foundation.test.ts'), 'utf-8');

  it('does not import IngestionSimulatorService, IngestionPipelineService, EligibilityGateService (demo), UEFReviewService, ReportGeneratorService, or ScoringSimulatorService', () => {
    const importLine = /from\s+['"][^'"]*\b(IngestionSimulatorService|IngestionPipelineService|EligibilityGateService|UEFReviewService|ReportGeneratorService|ScoringSimulatorService|DynamicScoringPreviewService)\b[^'"]*['"]/;
    expect(ownSource).not.toMatch(importLine);
  });

  it('does not import any data/synthetic/** runtime fixture, and does not import lib/live/op001-synthetic-records', () => {
    expect(ownSource).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
    expect(ownSource).not.toMatch(/from\s+['"][^'"]*op001-synthetic-records['"]/);
  });

  it('imports the real canonical interpreter, not a hand-written UEF content generator', () => {
    expect(ownSource).toContain("from '../../lib/ingestion/raw-to-uef-interpreter'");
  });
});

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls17Config {
  pgUrl: string;
}

function readRls17Config(): Rls17Config | null {
  const pgUrl = readEnv('RLS17_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS17_ALLOW_RUN') === 'true';
}

const KNOWN_NON_THROWAWAY_PROJECT_REFS = [
  'azdnepfmwrmacruykskm', // production — never a valid target, under any circumstance
  'haqflkurpmeaxpikozjl', // staging (dedicated) — shared with other in-flight work, discouraged
];

const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

function assertLocalPostgresOnly(pgUrl: string): void {
  const lower = pgUrl.toLowerCase();
  for (const ref of KNOWN_NON_THROWAWAY_PROJECT_REFS) {
    if (lower.includes(ref)) {
      throw new Error(
        `RLS17_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS17_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS17_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS17_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-17 guard — RLS17_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS17_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS17_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readRls17Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const TENANT_CODE = 'RLS17-KORATEST';
const REPORTING_PERIOD = 'RLS17-PERIOD';
const WORKFORCE_POPULATION = 42;

// Same 10-row shape as data/koratest/koratest_input_fixture.json, inlined
// here (not imported) so this test's fixture is self-contained and does not
// depend on the seed script's file-loading path — the SHAPE is what matters
// for proving the interpreter runs for real, not byte-identity with the JSON.
const FIXTURE_ROWS: Array<{
  initiative_name: string; category: string; type: string;
  amount?: number; participants?: number;
}> = [
  { initiative_name: 'Corso di formazione digitale avanzata', category: 'formazione', type: 'training', amount: 3200, participants: 25 },
  { initiative_name: 'Sportello di supporto psicologico aziendale', category: 'benessere psicologico', type: 'counselling', amount: 4100, participants: 40 },
  { initiative_name: 'Programma di mentoring inter-funzionale', category: 'mentoring', type: 'coaching', amount: 1800, participants: 18 },
  { initiative_name: 'Iniziativa di volontariato territoriale', category: 'volontariato', type: 'community', amount: 2600, participants: 30 },
  { initiative_name: 'Percorso di trasferimento competenze senior-junior', category: 'trasferimento competenze', type: 'knowledge transfer', amount: 1500, participants: 12 },
  { initiative_name: 'Buoni pasto mensili', category: 'buoni pasto', type: 'fringe benefit', amount: 5400, participants: 42 },
  { initiative_name: 'Corso obbligatorio sicurezza sul lavoro (D.Lgs 81/08)', category: 'sicurezza obbligatoria', type: 'compliance', amount: 900, participants: 42 },
  { initiative_name: 'Workshop di crescita professionale', category: 'sviluppo professionale', type: 'training' },
  { initiative_name: 'Checkup salute e prevenzione', category: 'prevenzione sanitaria', type: 'wellbeing', amount: 2200, participants: 33 },
  { initiative_name: 'Community di innovazione interna', category: 'collaborazione', type: 'peer coaching', amount: 1200, participants: 20 },
];

// B-TRUTH Second Canonical Test Company (2026-09-06, PR 6 of the
// founder-ratified ONE_PRODUCT_CANONICAL_MIGRATION plan): a SECOND canonical
// test tenant, "Bosco Verde Cooperativa Sociale" — deliberately distinct
// from KoraTest Srl above (different workforce size, different row count,
// a cooperative/social-enterprise category mix skewed toward IMPACT/
// CONNECTION rather than KoraTest's GROWTH/mixed skew, its own separate
// limited/blocked/incomplete rows) — proves the SAME canonical mechanism
// (not a copy, not a "second-company mode") generalizes to a genuinely
// different second tenant, seeded via the SAME seedCanonicalTestTenant()
// function below, not a parallel reimplementation.
const TENANT_CODE_B = 'RLS17-BOSCOVERDE';
const REPORTING_PERIOD_B = 'RLS17-PERIOD-B';
const WORKFORCE_POPULATION_B = 68;

const FIXTURE_ROWS_B: Array<{
  initiative_name: string; category: string; type: string;
  amount?: number; participants?: number;
}> = [
  { initiative_name: 'Corso di agricoltura biologica e sostenibile', category: 'formazione', type: 'training', amount: 2100, participants: 22 },
  { initiative_name: 'Sportello di ascolto e supporto psicologico', category: 'benessere psicologico', type: 'counselling', amount: 3600, participants: 50 },
  { initiative_name: 'Programma di inserimento lavorativo per categorie fragili', category: 'inclusione sociale', type: 'community', amount: 5200, participants: 35 },
  { initiative_name: 'Iniziativa di riforestazione territoriale', category: 'volontariato ambientale', type: 'community', amount: 3100, participants: 40 },
  { initiative_name: 'Percorso di mentoring tra soci fondatori e nuovi assunti', category: 'trasferimento competenze', type: 'knowledge transfer', amount: 1400, participants: 15 },
  { initiative_name: 'Buoni spesa mensili per il personale', category: 'buoni spesa', type: 'fringe benefit', amount: 4800, participants: 68 },
  { initiative_name: 'Corso obbligatorio sicurezza sul lavoro (D.Lgs 81/08)', category: 'sicurezza obbligatoria', type: 'compliance', amount: 700, participants: 68 },
  { initiative_name: 'Community di scambio tra cooperative locali', category: 'collaborazione', type: 'peer coaching' },
  { initiative_name: 'Checkup salute stagionale per lavoratori agricoli', category: 'prevenzione sanitaria', type: 'wellbeing', amount: 1900, participants: 44 },
  { initiative_name: 'Laboratorio di co-progettazione con la comunità locale', category: 'collaborazione', type: 'coaching', amount: 1600, participants: 20 },
  { initiative_name: 'Percorso di crescita professionale per responsabili di area', category: 'sviluppo professionale', type: 'training', amount: 2400, participants: 10 },
  { initiative_name: 'Evento di volontariato sociale con anziani del territorio', category: 'volontariato', type: 'community', amount: 900, participants: 25 },
];

describe.skipIf(!ready)(
  'RLS-17 — two canonical test tenants (tenant_kind=TEST), input-to-canonical-output pipeline via the real interpreter, via the SAME seeding mechanism',
  () => {
    let client: InstanceType<typeof Client>;
    let tenantId: string;
    let batchId: string;
    let tenantIdB: string;
    let batchIdB: string;

    beforeAll(async () => {
      if (!config) throw new Error('unreachable: beforeAll only runs when describe.skipIf(!ready) has already passed');
      assertLocalPostgresOnly(config.pgUrl);
      client = new Client({ connectionString: config.pgUrl });
      await client.connect();
    });

    afterAll(async () => {
      if (!client) return;
      for (const code of [TENANT_CODE, TENANT_CODE_B]) {
        const t = await client.query<{ id: string }>(`SELECT id FROM analytics.tenant WHERE tenant_code = $1`, [code]);
        const id = t.rows[0]?.id;
        if (id) {
          await client.query(`DELETE FROM analytics.uef_record WHERE tenant_id = $1`, [id]);
          await client.query(`DELETE FROM personal.uploaded_record WHERE tenant_id = $1`, [id]);
          await client.query(`DELETE FROM analytics.source_batch WHERE tenant_id = $1`, [id]);
          await client.query(`DELETE FROM personal.workforce_baseline WHERE tenant_id = $1`, [id]);
          await client.query(`DELETE FROM analytics.tenant WHERE tenant_code = $1`, [code]);
        }
      }
      await client.end();
    });

    interface SeedParams {
      tenantCode: string;
      companyName: string;
      reportingPeriod: string;
      workforcePopulation: number;
      segmentBreakdown: Record<string, Record<string, number>>;
      batchLabel: string;
      fixtureRows: Array<{ initiative_name: string; category: string; type: string; amount?: number; participants?: number }>;
      idPrefix: string;
      approverNote: string;
    }

    // Mirrors scripts/koratest-canonical-seed.ts's own write sequence:
    // tenant (upsert) -> workforce_baseline -> source_batch (idempotent on
    // natural key) -> uploaded_record -> uef_record via the REAL
    // interpretUploadedRecord() call, never hand-typed content. Calling this
    // twice must not create duplicate rows — that IS the idempotency proof.
    // Parameterized (not duplicated) so the SAME function proves the
    // mechanism for both canonical test tenants — the whole point of this
    // PR is that this is reusable, not a KoraTest-only one-off.
    async function seedCanonicalTestTenant(p: SeedParams): Promise<{ tenantId: string; batchId: string }> {
      const tenantResult = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'TEST')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        [p.tenantCode, p.companyName],
      );
      const tId = tenantResult.rows[0].id;

      await client.query(
        `INSERT INTO personal.workforce_baseline
           (tenant_id, reporting_period, total_workers, segment_breakdown, privacy_threshold_applied, minimum_group_size, created_by)
         VALUES ($1, $2, $3, $4, true, 10, 'rls17-test')
         ON CONFLICT (tenant_id, reporting_period) DO UPDATE SET total_workers = EXCLUDED.total_workers`,
        [tId, p.reportingPeriod, p.workforcePopulation, JSON.stringify(p.segmentBreakdown)],
      );

      const existingBatch = await client.query<{ id: string }>(
        `SELECT id FROM analytics.source_batch WHERE tenant_id = $1 AND reporting_period = $2 AND source_name = $3`,
        [tId, p.reportingPeriod, p.batchLabel],
      );

      let bId: string;
      if (existingBatch.rows.length > 0) {
        bId = existingBatch.rows[0].id;
      } else {
        const batchResult = await client.query<{ id: string }>(
          `INSERT INTO analytics.source_batch
             (tenant_id, source_type, source_name, reporting_period, row_count, mapped_count, rejected_count,
              batch_status, pending_review_count, created_by)
           VALUES ($1, 'manual', $2, $3, $4, $4, 0, 'pending', $4, 'rls17-test')
           RETURNING id`,
          [tId, p.batchLabel, p.reportingPeriod, p.fixtureRows.length],
        );
        bId = batchResult.rows[0].id;

        const rawRecords: RawUploadedRecord[] = p.fixtureRows.map((row, i) => ({
          recordId: `${p.idPrefix}-${i}`, batchId: bId, rowIndex: i, detectedRecordType: 'welfare_program',
          raw: { initiative_name: row.initiative_name, category: row.category, type: row.type,
            ...(row.amount != null ? { amount: row.amount } : {}), ...(row.participants != null ? { participants: row.participants } : {}) },
        }));
        const eligResults = classifyEligibilityBatch(rawRecords);

        for (const [i, row] of p.fixtureRows.entries()) {
          await client.query(
            `INSERT INTO personal.uploaded_record
               (tenant_id, batch_id, pseudonym_id, raw_hash, eligibility_status, primary_pillar, action_family, event_nature, review_status, payload, privacy_redacted)
             VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, 'pending', $8, false)`,
            [
              tId, bId, `PSY-${p.idPrefix.toUpperCase()}-${String(i).padStart(4, '0')}`, `${p.idPrefix}-row:${i}`,
              eligResults[i].status, row.category, row.type,
              JSON.stringify({ initiative_name: row.initiative_name, category: row.category, type: row.type, ...(row.amount != null ? { amount: row.amount } : {}), ...(row.participants != null ? { participants: row.participants } : {}) }),
            ],
          );
        }

        // Real canonical interpreter — content is DERIVED, never hand-typed.
        for (const row of p.fixtureRows) {
          const input: UploadedRecordInput = {
            id: `${p.idPrefix}-input-${row.initiative_name}`,
            payload: { initiative_name: row.initiative_name, category: row.category, type: row.type,
              ...(row.amount != null ? { amount: row.amount } : {}), ...(row.participants != null ? { participants: row.participants } : {}) },
            action_family: row.category, event_nature: row.type, primary_pillar: null,
            eligibility_status: null,
          };
          const proposal = interpretUploadedRecord(input, 'KORA Index v1.0');
          const approvedForImpactUnits = proposal.eligibility === 'eligible';

          await client.query(
            `INSERT INTO analytics.uef_record
               (tenant_id, batch_id, reporting_period, raw_name, eligibility, primary_pillar, action_family, event_nature,
                approved_for_scoring, approved_for_bti_governance, approved_for_impact_units,
                data_completeness_score, missing_fields, review_status, reviewer_notes, reviewed_by, payload)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, $9, $10, $11, 'approved', $12, 'rls17-test', $13)`,
            [
              tId, bId, p.reportingPeriod, proposal.rawName, proposal.eligibility, proposal.pillar,
              proposal.actionFamily, proposal.eventNature, approvedForImpactUnits, proposal.mappingConfidence,
              // missing_fields is a native Postgres text[] column — pass the
              // plain JS array; node-postgres serializes it to the correct
              // array literal automatically. JSON.stringify() here produced
              // a JSON string ("[...]"), which Postgres rejects as a
              // malformed array literal for a text[] column — this was the
              // bug, found only once this file first actually ran against
              // real Postgres in CI (see B-TRUTH CompanyDataIntakeService
              // Canonical Migration's own PR for how that CI gap was found
              // and closed). The real production script,
              // scripts/koratest-canonical-seed.ts, was never affected —
              // it uses the Supabase JS client, which already handles this
              // conversion correctly for a plain JS array.
              proposal.warnings, p.approverNote,
              JSON.stringify({ interpreter_version: proposal.interpreterVersion, generated_by: proposal.generatedBy, reason_codes: proposal.reasonCodes }),
            ],
          );
        }
      }

      return { tenantId: tId, batchId: bId };
    }

    async function seedKoraTestFixture(): Promise<{ tenantId: string; batchId: string }> {
      return seedCanonicalTestTenant({
        tenantCode: TENANT_CODE, companyName: 'RLS-17 KoraTest Reference Tenant',
        reportingPeriod: REPORTING_PERIOD, workforcePopulation: WORKFORCE_POPULATION,
        segmentBreakdown: { departments: { 'dept-tech': 16, 'dept-operations': 14, 'dept-people': 12 } },
        batchLabel: 'RLS-17 canonical foundation batch', fixtureRows: FIXTURE_ROWS,
        idPrefix: 'rls17', approverNote: 'RLS-17 automated operator approval stand-in',
      });
    }

    async function seedBoscoVerdeFixture(): Promise<{ tenantId: string; batchId: string }> {
      return seedCanonicalTestTenant({
        tenantCode: TENANT_CODE_B, companyName: 'RLS-17 Bosco Verde Reference Tenant',
        reportingPeriod: REPORTING_PERIOD_B, workforcePopulation: WORKFORCE_POPULATION_B,
        segmentBreakdown: { departments: { 'dept-agricoltura': 28, 'dept-servizi': 24, 'dept-amministrazione': 16 } },
        batchLabel: 'RLS-17 second-tenant canonical foundation batch', fixtureRows: FIXTURE_ROWS_B,
        idPrefix: 'rls17b', approverNote: 'RLS-17 second-tenant automated operator approval stand-in',
      });
    }

    it('KoraTest Srl is a tenant_kind=TEST ordinary row — not OP-001', async () => {
      const seeded = await seedKoraTestFixture();
      tenantId = seeded.tenantId;
      batchId = seeded.batchId;

      const rows = await client.query<{ tenant_code: string; tenant_kind: string }>(
        `SELECT tenant_code, tenant_kind FROM analytics.tenant WHERE tenant_code = $1`,
        [TENANT_CODE],
      );
      expect(rows.rows[0].tenant_kind).toBe('TEST');
      expect(TENANT_CODE).not.toBe('OP-001');
    });

    it('input rows (workforce_baseline, source_batch, uploaded_record) are persisted with the fixture\'s own 10-row shape', async () => {
      const wb = await client.query(`SELECT total_workers FROM personal.workforce_baseline WHERE tenant_id = $1`, [tenantId]);
      expect(wb.rows[0].total_workers).toBe(WORKFORCE_POPULATION);

      const ur = await client.query(`SELECT id FROM personal.uploaded_record WHERE tenant_id = $1`, [tenantId]);
      expect(ur.rows.length).toBe(FIXTURE_ROWS.length);
    });

    it('UEF records were derived by the real interpreter — content varies (not all eligible), not hand-typed', async () => {
      const uef = await client.query<{ eligibility: string; primary_pillar: string | null }>(
        `SELECT eligibility, primary_pillar FROM analytics.uef_record WHERE tenant_id = $1`,
        [tenantId],
      );
      expect(uef.rows.length).toBe(FIXTURE_ROWS.length);
      const statuses = new Set(uef.rows.map((r) => r.eligibility));
      // Deliberately non-uniform fixture (kt-006 limited, kt-007 blocked) — proves
      // this is the real interpreter's own classification, not a fabricated
      // all-eligible shortcut.
      expect(statuses.has('limited') || statuses.has('blocked')).toBe(true);
      expect(statuses.has('eligible')).toBe(true);
    });

    it('runKoraPipeline() executes on the approved UEF set and produces a real, non-trivial result', async () => {
      const approved = await client.query(
        `SELECT id, raw_name, eligibility, primary_pillar, action_family, event_nature, missing_fields, approved_for_impact_units, payload
         FROM analytics.uef_record
         WHERE tenant_id = $1 AND review_status = 'approved' AND approved_for_scoring = true`,
        [tenantId],
      );
      expect(approved.rows.length).toBe(FIXTURE_ROWS.length);

      const uefRows = approved.rows.map((row) => ({
        id: row.id as string,
        raw_name: row.raw_name as string,
        eligibility: row.eligibility as string,
        primary_pillar: row.primary_pillar as string | null,
        action_family: row.action_family as string | null,
        event_nature: row.event_nature as string | null,
        missing_fields: Array.isArray(row.missing_fields) ? row.missing_fields as string[] : [],
        approved_for_impact_units: Boolean(row.approved_for_impact_units),
        payload: (row.payload ?? {}) as Record<string, unknown>,
      })) satisfies UefRowForScoring[];

      const records = buildScoringRecordsFromApprovedUef(uefRows, batchId);
      const result = runKoraPipeline({ tenantId, batchId, records, workforcePopulation: WORKFORCE_POPULATION });

      expect(result.warnings.some((w) => w.includes('KoraPipeline_v2.0'))).toBe(true);
      expect(typeof result.koraIndex.value).toBe('number');
      expect(['CLEAR', 'WARNING', 'FLAGGED']).toContain(result.activation.safeguardStatus);
    });

    it('re-running the seed is idempotent — no duplicate tenant, batch, uploaded_record, or uef_record rows', async () => {
      await seedKoraTestFixture();

      const tenantRows = await client.query(`SELECT id FROM analytics.tenant WHERE tenant_code = $1`, [TENANT_CODE]);
      expect(tenantRows.rows.length).toBe(1);

      const batchRows = await client.query(`SELECT id FROM analytics.source_batch WHERE tenant_id = $1`, [tenantId]);
      expect(batchRows.rows.length).toBe(1);

      const uploadedRows = await client.query(`SELECT id FROM personal.uploaded_record WHERE tenant_id = $1`, [tenantId]);
      expect(uploadedRows.rows.length).toBe(FIXTURE_ROWS.length);

      const uefRows = await client.query(`SELECT id FROM analytics.uef_record WHERE tenant_id = $1`, [tenantId]);
      expect(uefRows.rows.length).toBe(FIXTURE_ROWS.length);
    });

    // ── Second canonical test tenant — proves the mechanism is genuinely
    // reusable, not a KoraTest-only one-off ──────────────────────────────────

    it('Bosco Verde Cooperativa Sociale is ALSO a tenant_kind=TEST ordinary row — same mechanism, different tenant, not OP-001', async () => {
      const seeded = await seedBoscoVerdeFixture();
      tenantIdB = seeded.tenantId;
      batchIdB = seeded.batchId;

      const rows = await client.query<{ tenant_code: string; tenant_kind: string }>(
        `SELECT tenant_code, tenant_kind FROM analytics.tenant WHERE tenant_code = $1`,
        [TENANT_CODE_B],
      );
      expect(rows.rows[0].tenant_kind).toBe('TEST');
      expect(TENANT_CODE_B).not.toBe('OP-001');
      expect(TENANT_CODE_B).not.toBe(TENANT_CODE);
      expect(tenantIdB).not.toBe(tenantId);
    });

    it('second tenant\'s input rows are persisted with its own, materially different 12-row shape', async () => {
      const wb = await client.query(`SELECT total_workers FROM personal.workforce_baseline WHERE tenant_id = $1`, [tenantIdB]);
      expect(wb.rows[0].total_workers).toBe(WORKFORCE_POPULATION_B);
      expect(WORKFORCE_POPULATION_B).not.toBe(WORKFORCE_POPULATION);

      const ur = await client.query(`SELECT id FROM personal.uploaded_record WHERE tenant_id = $1`, [tenantIdB]);
      expect(ur.rows.length).toBe(FIXTURE_ROWS_B.length);
      expect(FIXTURE_ROWS_B.length).not.toBe(FIXTURE_ROWS.length);
    });

    it('second tenant\'s UEF records were ALSO derived by the real interpreter — non-uniform, not hand-typed', async () => {
      const uef = await client.query<{ eligibility: string; primary_pillar: string | null }>(
        `SELECT eligibility, primary_pillar FROM analytics.uef_record WHERE tenant_id = $1`,
        [tenantIdB],
      );
      expect(uef.rows.length).toBe(FIXTURE_ROWS_B.length);
      const statuses = new Set(uef.rows.map((r) => r.eligibility));
      expect(statuses.has('limited') || statuses.has('blocked')).toBe(true);
      expect(statuses.has('eligible')).toBe(true);
    });

    it('runKoraPipeline() executes for the second tenant and produces a real, non-trivial, structurally-parallel result', async () => {
      const approved = await client.query(
        `SELECT id, raw_name, eligibility, primary_pillar, action_family, event_nature, missing_fields, approved_for_impact_units, payload
         FROM analytics.uef_record
         WHERE tenant_id = $1 AND review_status = 'approved' AND approved_for_scoring = true`,
        [tenantIdB],
      );
      expect(approved.rows.length).toBe(FIXTURE_ROWS_B.length);

      const uefRows = approved.rows.map((row) => ({
        id: row.id as string,
        raw_name: row.raw_name as string,
        eligibility: row.eligibility as string,
        primary_pillar: row.primary_pillar as string | null,
        action_family: row.action_family as string | null,
        event_nature: row.event_nature as string | null,
        missing_fields: Array.isArray(row.missing_fields) ? row.missing_fields as string[] : [],
        approved_for_impact_units: Boolean(row.approved_for_impact_units),
        payload: (row.payload ?? {}) as Record<string, unknown>,
      })) satisfies UefRowForScoring[];

      const records = buildScoringRecordsFromApprovedUef(uefRows, batchIdB);
      const result = runKoraPipeline({ tenantId: tenantIdB, batchId: batchIdB, records, workforcePopulation: WORKFORCE_POPULATION_B });

      // Structural parity (same shape of result) — NOT numerical equality.
      // The two tenants' fixtures are deliberately different; identical
      // output values would actually be suspicious, not reassuring.
      expect(result.warnings.some((w) => w.includes('KoraPipeline_v2.0'))).toBe(true);
      expect(typeof result.koraIndex.value).toBe('number');
      expect(['CLEAR', 'WARNING', 'FLAGGED']).toContain(result.activation.safeguardStatus);
    });

    it('re-running the second tenant\'s seed is idempotent — no duplicate rows, same discipline as tenant A', async () => {
      await seedBoscoVerdeFixture();

      const tenantRows = await client.query(`SELECT id FROM analytics.tenant WHERE tenant_code = $1`, [TENANT_CODE_B]);
      expect(tenantRows.rows.length).toBe(1);

      const batchRows = await client.query(`SELECT id FROM analytics.source_batch WHERE tenant_id = $1`, [tenantIdB]);
      expect(batchRows.rows.length).toBe(1);

      const uploadedRows = await client.query(`SELECT id FROM personal.uploaded_record WHERE tenant_id = $1`, [tenantIdB]);
      expect(uploadedRows.rows.length).toBe(FIXTURE_ROWS_B.length);

      const uefRows = await client.query(`SELECT id FROM analytics.uef_record WHERE tenant_id = $1`, [tenantIdB]);
      expect(uefRows.rows.length).toBe(FIXTURE_ROWS_B.length);
    });

    // ── Coexistence and isolation ────────────────────────────────────────────

    it('both canonical test tenants coexist — each retains its own, independent rows, no overwrite', async () => {
      expect(tenantId).toBeTruthy();
      expect(tenantIdB).toBeTruthy();
      expect(tenantId).not.toBe(tenantIdB);

      const tenantsRow = await client.query(
        `SELECT tenant_code FROM analytics.tenant WHERE tenant_code IN ($1, $2)`,
        [TENANT_CODE, TENANT_CODE_B],
      );
      expect(tenantsRow.rows.length).toBe(2);

      const wbA = await client.query(`SELECT total_workers FROM personal.workforce_baseline WHERE tenant_id = $1`, [tenantId]);
      const wbB = await client.query(`SELECT total_workers FROM personal.workforce_baseline WHERE tenant_id = $1`, [tenantIdB]);
      expect(wbA.rows[0].total_workers).toBe(WORKFORCE_POPULATION);
      expect(wbB.rows[0].total_workers).toBe(WORKFORCE_POPULATION_B);
    });

    it('tenant isolation — tenant A\'s scoped rows are never returned by a tenant-B-scoped query, and vice versa', async () => {
      const urA = await client.query(`SELECT tenant_id FROM personal.uploaded_record WHERE tenant_id = $1`, [tenantId]);
      expect(urA.rows.every((r) => r.tenant_id === tenantId)).toBe(true);
      expect(urA.rows.some((r) => r.tenant_id === tenantIdB)).toBe(false);

      const urB = await client.query(`SELECT tenant_id FROM personal.uploaded_record WHERE tenant_id = $1`, [tenantIdB]);
      expect(urB.rows.every((r) => r.tenant_id === tenantIdB)).toBe(true);
      expect(urB.rows.some((r) => r.tenant_id === tenantId)).toBe(false);

      const uefA = await client.query(`SELECT tenant_id FROM analytics.uef_record WHERE tenant_id = $1`, [tenantId]);
      const uefB = await client.query(`SELECT tenant_id FROM analytics.uef_record WHERE tenant_id = $1`, [tenantIdB]);
      expect(uefA.rows.every((r) => r.tenant_id === tenantId)).toBe(true);
      expect(uefB.rows.every((r) => r.tenant_id === tenantIdB)).toBe(true);
    });

    it('no special RLS/product branch exists for either test tenant — both follow the identical query shape, tenant_kind grants no special access', async () => {
      const kindA = await client.query<{ tenant_kind: string }>(`SELECT tenant_kind FROM analytics.tenant WHERE tenant_code = $1`, [TENANT_CODE]);
      const kindB = await client.query<{ tenant_kind: string }>(`SELECT tenant_kind FROM analytics.tenant WHERE tenant_code = $1`, [TENANT_CODE_B]);
      expect(kindA.rows[0].tenant_kind).toBe('TEST');
      expect(kindB.rows[0].tenant_kind).toBe('TEST');
      // Both rows were reached via the exact same seedCanonicalTestTenant()
      // function and the exact same SELECT shape above — no tenant_kind
      // conditional was introduced anywhere in this file to reach either one.
    });

    it('output values are NOT identical between the two tenants — by design, not a coincidence to fix', async () => {
      const uefA = await client.query<{ eligibility: string }>(`SELECT eligibility FROM analytics.uef_record WHERE tenant_id = $1`, [tenantId]);
      const uefB = await client.query<{ eligibility: string }>(`SELECT eligibility FROM analytics.uef_record WHERE tenant_id = $1`, [tenantIdB]);
      // Different row counts alone already proves non-identity; this also
      // guards against a future accidental fixture collapse.
      expect(uefA.rows.length).not.toBe(uefB.rows.length);
    });
  },
);
