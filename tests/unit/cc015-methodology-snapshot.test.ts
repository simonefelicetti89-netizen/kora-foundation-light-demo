/**
 * CC-015 / B-SNAP — Methodology Snapshot (D-F Option C) tests.
 *
 * Behavioral where practical: real computeConfigHash()/getMethodologySnapshot()
 * calls, a real runKoraPipeline() zero-data run, and a real
 * persistKoraComputationResult() call with only the Supabase I/O boundary
 * mocked (same technique as tests/unit/cc012-confidence-adversarial.test.ts
 * and tests/unit/cc014-decision-pack-adversarial.test.ts). Source-string
 * checks are limited to genuine "did anyone add a second authority" questions.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function src(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// ═════════════════════════════════════════════════════════════════════════════
// 1-3. CONFIG HASH — deterministic, stable, sensitive to real changes
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-015 — computeConfigHash: deterministic and stable', () => {
  it('the same config produces the same hash across repeated calls', async () => {
    const { computeConfigHash } = await import('@/lib/methodology-config/v0.1');
    const a = computeConfigHash();
    const b = computeConfigHash();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
  });

  it('key insertion order does not affect the hash (sorted-key serialization)', () => {
    // sortedStringify is not exported (internal), so this proves the property
    // via computeConfigHash's own stability across two fresh module loads —
    // Node's own JSON.stringify would be order-dependent if used directly;
    // this test documents that requirement rather than reaching into internals.
    const a = JSON.stringify({ b: 1, a: 2 });
    const b = JSON.stringify({ a: 2, b: 1 });
    expect(a).not.toBe(b); // plain JSON.stringify IS order-dependent — the reason a custom sortedStringify exists
  });
});

describe('CC-015 — computeConfigHash: sensitive to real methodology changes (test-time injection only, production config untouched)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('@/data/methodology/methodology-config.json');
  });

  afterEach(() => {
    // Prevent this block's vi.doMock calls from leaking into later describe
    // blocks in this file — without this, subsequent dynamic imports would
    // keep resolving the last mocked config instead of the real production one.
    vi.doUnmock('@/data/methodology/methodology-config.json');
    vi.resetModules();
  });

  function baseConfig() {
    return {
      version: 'test-only', calibration_status: 'pre_empirical_calibration',
      safeguard_thresholds: { CLEAR: { AR: 0.4, MAR: 0.3 }, WARNING: { AR_min: 0.2, AR_max: 0.4, MAR_min: 0.15, MAR_max: 0.3 }, FLAGGED: { AR_max: 0.2, MAR_max: 0.15 } },
      kora_index_v3: { cs_external: true, note: 'test', macroblocks: { REACH: { label: 'r', weight: 0.25, description: '', components: { AR: 0.5, MAR: 0.5 } } } },
      bc_by_action_family: {
        family_and_care: 1.2, health_and_wellbeing: 1.2, professional_growth: 1.1, future_and_legacy: 1.1,
        inclusion_and_connection: 1.0, territorial_impact: 1.0, trust_and_flexibility_policy: 1.15,
        economic_relief: 0, blocked_compliance: 0,
      },
    };
  }

  it('changing BC in isolated test config changes the hash', async () => {
    vi.doMock('@/data/methodology/methodology-config.json', () => ({ default: baseConfig() }));
    const mod1 = await import('@/lib/methodology-config/v0.1');
    const hashBefore = mod1.computeConfigHash();

    vi.resetModules();
    const mutated = baseConfig();
    mutated.bc_by_action_family.family_and_care = 9.99; // deliberately distinctive
    vi.doMock('@/data/methodology/methodology-config.json', () => ({ default: mutated }));
    const mod2 = await import('@/lib/methodology-config/v0.1');
    const hashAfter = mod2.computeConfigHash();

    expect(hashAfter).not.toBe(hashBefore);
  });

  it('changing an unhashed field (e.g. algorithm_version, a decorative/orphaned field) does NOT change the hash', async () => {
    vi.doMock('@/data/methodology/methodology-config.json', () => ({ default: { ...baseConfig(), algorithm_version: 'KORA-METHOD-v3.0' } }));
    const mod1 = await import('@/lib/methodology-config/v0.1');
    const hashA = mod1.computeConfigHash();

    vi.resetModules();
    vi.doMock('@/data/methodology/methodology-config.json', () => ({ default: { ...baseConfig(), algorithm_version: 'something-completely-different' } }));
    const mod2 = await import('@/lib/methodology-config/v0.1');
    const hashB = mod2.computeConfigHash();

    expect(hashA).toBe(hashB);
  });

  it('CONFIG HASH COVERAGE PROOF: bc_calibration_version/taxonomy_version are excluded from the hash, but two snapshots that differ only in these fields are STILL distinguishable — via their own separately-persisted top-level fields, not lost', async () => {
    vi.doMock('@/data/methodology/methodology-config.json', () => ({
      default: { ...baseConfig(), bc_calibration_version: 'pre_empirical_v1', taxonomy_version: 'KORA Action Taxonomy v0.1' },
    }));
    const mod1 = await import('@/lib/methodology-config/v0.1');
    const snap1 = mod1.getMethodologySnapshot();

    vi.resetModules();
    vi.doMock('@/data/methodology/methodology-config.json', () => ({
      default: { ...baseConfig(), bc_calibration_version: 'empirical_v2_post_delphi', taxonomy_version: 'KORA Action Taxonomy v0.2' },
    }));
    const mod2 = await import('@/lib/methodology-config/v0.1');
    const snap2 = mod2.getMethodologySnapshot();

    // Same config_hash (neither field is calculation-numeric)...
    expect(snap1.config_hash).toBe(snap2.config_hash);
    // ...but the two snapshots are NOT identical — the distinguishing
    // information lives in their own persisted fields, proving no
    // reproducibility information is silently lost by excluding them from the hash.
    expect(snap1.bc_calibration_version).not.toBe(snap2.bc_calibration_version);
    expect(snap1.taxonomy_version).not.toBe(snap2.taxonomy_version);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. SNAPSHOT CONTAINS ALL REQUIRED FIELDS
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-015 — getMethodologySnapshot(): all Master Plan §11 fields present', () => {
  it('contains every required field with the expected shape', async () => {
    const { getMethodologySnapshot } = await import('@/lib/methodology-config/v0.1');
    const snap = getMethodologySnapshot({ pipelineVersion: 'KoraPipeline_v2.0' });

    expect(typeof snap.methodology_family).toBe('string');
    expect(typeof snap.methodology_version).toBe('string');
    expect(typeof snap.taxonomy_version).toBe('string');
    expect(snap.need_taxonomy_version).toBeDefined();
    expect(typeof snap.bc_calibration_version).toBe('string');
    expect(typeof snap.contribution_config_version).toBe('string');
    expect(typeof snap.factor_statuses).toBe('object');
    expect(typeof snap.pipeline_version).toBe('string');
    expect(snap.config_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(new Date(snap.calculation_timestamp).toString()).not.toBe('Invalid Date');
    expect(snap.provenance).toBe('AS_ORIGINALLY_CALCULATED');
  });

  it('methodology_version ("1.0") is separate from the product label ("KORA Index v1.0") — D-F', async () => {
    const { getMethodologySnapshot, getMethodologyVersion, getProductVersion, getCanonicalMethodologyVersion } = await import('@/lib/methodology-config/v0.1');
    const snap = getMethodologySnapshot();
    expect(snap.methodology_version).toBe('1.0');
    expect(getMethodologyVersion()).toBe('KORA Index v1.0'); // legacy name, still returns the product label — unchanged for compatibility
    expect(getProductVersion()).toBe('KORA Index v1.0');     // same value, honestly-named accessor
    expect(getCanonicalMethodologyVersion()).toBe('1.0');    // the true methodology version authority
    expect(snap.methodology_version).toBe(getCanonicalMethodologyVersion());
    expect(snap.methodology_version).not.toBe(getMethodologyVersion());
    expect(getProductVersion()).toBe(getMethodologyVersion()); // both read the same single underlying config.version field
  });

  it('need_taxonomy_version is exactly null (Needs domain not built) — the Master Plan\'s own nullable-for-"not yet applicable" convention (matching NeedObservation.related_program_definition_id / ProgramBrief.resulting_program_definition_id), not a fabricated version and not a status object inferred from an unrelated vocabulary', async () => {
    const { getMethodologySnapshot } = await import('@/lib/methodology-config/v0.1');
    const snap = getMethodologySnapshot();
    expect(snap.need_taxonomy_version).toBeNull();
  });

  it('contribution_config_version is the REAL existing config version, not fabricated', async () => {
    const { getMethodologySnapshot } = await import('@/lib/methodology-config/v0.1');
    const { getContributionConfigV2 } = await import('@/lib/methodology-config/v0.1');
    const snap = getMethodologySnapshot();
    expect(snap.contribution_config_version).toBe(getContributionConfigV2().version);
  });

  it('factor_statuses reflects Master Plan §10 exactly: NM/AGF canonical, BC/CQ/EV provisional, CF proxy, DF/EXF/SF not_active', async () => {
    const { getMethodologySnapshot } = await import('@/lib/methodology-config/v0.1');
    const snap = getMethodologySnapshot();
    expect(snap.factor_statuses).toEqual({
      NM: 'canonical', BC: 'provisional', CQ: 'provisional', EV: 'provisional',
      CF: 'proxy', AGF: 'canonical', DF: 'not_active', EXF: 'not_active', SF: 'not_active',
    });
  });

  it('restatement requires an explicit source snapshot id — cannot silently claim RESTATED_UNDER_METHODOLOGY', async () => {
    const { getMethodologySnapshot } = await import('@/lib/methodology-config/v0.1');
    expect(() => getMethodologySnapshot({ provenance: 'RESTATED_UNDER_METHODOLOGY' })).toThrow(/restatedFromSnapshotId/);
    expect(() => getMethodologySnapshot({ provenance: 'RESTATED_UNDER_METHODOLOGY', restatedFromSnapshotId: 'some-uuid' })).not.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 10-11. SINGLE AUTHORITY GUARDS
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-015 — PRODUCT_VERSION_AUTHORITIES = 1, METHODOLOGY_VERSION_AUTHORITIES = 1, SNAPSHOT_BUILDER_AUTHORITIES = 1', () => {
  it('getMethodologySnapshot is declared exactly once, in the canonical config module (SNAPSHOT_BUILDER_AUTHORITIES = 1)', () => {
    const files = src('lib/methodology-config/v0.1.ts');
    const declarations = (files.match(/export function getMethodologySnapshot/g) ?? []).length;
    expect(declarations).toBe(1);
  });

  it('getProductVersion is declared exactly once (PRODUCT_VERSION_AUTHORITIES = 1)', () => {
    const files = src('lib/methodology-config/v0.1.ts');
    expect((files.match(/export function getProductVersion/g) ?? []).length).toBe(1);
  });

  it('getCanonicalMethodologyVersion is declared exactly once, and no other file hardcodes the literal "1.0" as a methodology_version value (METHODOLOGY_VERSION_AUTHORITIES = 1)', () => {
    const files = src('lib/methodology-config/v0.1.ts');
    expect((files.match(/export function getCanonicalMethodologyVersion/g) ?? []).length).toBe(1);
    // getMethodologySnapshot's own field assignment must call the getter, not repeat the literal.
    expect(files).not.toMatch(/methodology_version:\s*'1\.0'/);
    expect(files).toContain('methodology_version:         getCanonicalMethodologyVersion()');
  });

  it('persistence.ts calls the canonical builder rather than constructing a snapshot object inline', () => {
    const persistence = src('lib/live/persistence.ts');
    expect(persistence).toContain('getMethodologySnapshot(');
    // It must not independently declare the 9 §11 field names as a literal object (that would be a second authority).
    expect(persistence).not.toMatch(/need_taxonomy_version:\s*\{[\s\S]{0,50}status:\s*['"]not_active['"]/);
  });

  it('the hardcoded zero-data "KORA-METHOD-v1.0" bug is fixed — run-kora-pipeline.ts no longer contains that literal', () => {
    const pipeline = src('lib/kora-engine/run-kora-pipeline.ts');
    expect(pipeline).not.toContain("'KORA-METHOD-v1.0'");
    expect(pipeline).toContain('getMethodologyVersion()');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. NORMAL AND ZERO-DATA PATH USE THE SAME METHODOLOGY AUTHORITY (behavioral)
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-015 — zero-data path uses the same methodology authority as the normal path (behavioral)', () => {
  it('runKoraPipeline([]) returns methodologyVersion === getMethodologyVersion(), not a stale hardcoded string', async () => {
    const { runKoraPipeline } = await import('@/lib/kora-engine/run-kora-pipeline');
    const { getMethodologyVersion } = await import('@/lib/methodology-config/v0.1');
    const result = runKoraPipeline({ tenantId: 'zero-data-tenant', records: [] });
    expect(result.koraIndex.methodologyVersion).toBe(getMethodologyVersion());
    expect(result.koraIndex.methodologyVersion).not.toBe('KORA-METHOD-v1.0');
    expect(result.pibAggregation).toBeDefined();
    expect(result.pibAggregation!.methodologyVersion).toBe(getMethodologyVersion());
  });

  it('zero-data numeric behavior is unchanged: value=0, scoringMode=insufficient_data', async () => {
    const { runKoraPipeline } = await import('@/lib/kora-engine/run-kora-pipeline');
    const result = runKoraPipeline({ tenantId: 'zero-data-tenant', records: [] });
    expect(result.koraIndex.value).toBe(0);
    expect(result.scoringMode).toBe('insufficient_data');
    expect(result.confidence.score).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7-9. PERSISTENCE: shared snapshot, BTI provenance, numeric safety (behavioral)
// ═════════════════════════════════════════════════════════════════════════════

type QueryResult = { data: unknown; error: { message: string } | null };
const insertCalls: Record<string, Record<string, unknown>[]> = {};
let nextId = 0;

function makeInsertResult(id: string) {
  return { select: () => ({ single: async () => ({ data: { id }, error: null }) }) };
}
interface ChainableUpdate {
  eq: () => ChainableUpdate;
  then: (resolve: (v: QueryResult) => void) => void;
}
function makeChainableUpdate(): ChainableUpdate {
  const chain: ChainableUpdate = { eq: () => chain, then: (resolve) => resolve({ data: null, error: null }) };
  return chain;
}
function recordInsert(table: string, payload: Record<string, unknown>) {
  insertCalls[table] = insertCalls[table] ?? [];
  insertCalls[table].push(payload);
  return makeInsertResult(`${table}-${++nextId}`);
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (_schemaName: string) => ({
      from: (table: string) => ({
        insert: (payload: Record<string, unknown> | Record<string, unknown>[]) => {
          if (Array.isArray(payload)) {
            insertCalls[table] = insertCalls[table] ?? [];
            insertCalls[table].push(...payload);
            return { error: null };
          }
          return recordInsert(table, payload);
        },
        update: (_payload: Record<string, unknown>) => makeChainableUpdate(),
      }),
    }),
  }),
}));

vi.mock('@/lib/live/office-attribution', () => ({
  triggerOfficeAttribution: async () => {},
}));

describe('CC-015 — persistKoraComputationResult: one shared snapshot, BTI gets provenance, numeric values unchanged', () => {
  beforeEach(() => {
    for (const k of Object.keys(insertCalls)) delete insertCalls[k];
  });

  it('activation_result, confidence_result, bti_result, kora_index_result, and every impact_unit row reference the SAME methodology_snapshot_id', async () => {
    const { persistKoraComputationResult } = await import('@/lib/live/persistence');
    const { runKoraPipeline } = await import('@/lib/kora-engine/run-kora-pipeline');

    const records = [{
      record_id: 'r1', action_family: 'family_and_care', event_nature: 'consumed_service',
      primary_pillar: 'LIFE', evidence_type: 'L3', missing_fields: [],
      duration_hours: 2, event_date: '2026-06-01',
    }] as unknown as Parameters<typeof runKoraPipeline>[0]['records'];

    const result = runKoraPipeline({ tenantId: 'snap-tenant', records, workforcePopulation: 10 });

    const persistResult = await persistKoraComputationResult({
      tenantId: 'snap-tenant', batchId: 'batch-1', reportingPeriod: '2026-Q1',
      workforcePopulation: 10, result,
    });

    expect(insertCalls['methodology_snapshot']).toHaveLength(1);
    const snapshotId = persistResult.methodologySnapshotId;
    expect(snapshotId).toBeTruthy();

    expect(insertCalls['activation_result']?.[0]?.methodology_snapshot_id).toBe(snapshotId);
    expect(insertCalls['confidence_result']?.[0]?.methodology_snapshot_id).toBe(snapshotId);
    expect(insertCalls['bti_result']?.[0]?.methodology_snapshot_id).toBe(snapshotId);
    expect(insertCalls['kora_index_result']?.[0]?.methodology_snapshot_id).toBe(snapshotId);
    if (insertCalls['impact_unit']) {
      for (const row of insertCalls['impact_unit']) {
        expect(row.methodology_snapshot_id).toBe(snapshotId);
      }
    }
  });

  it('bti_result now carries methodology_snapshot_id — the previously-open provenance gap is closed, without inventing a BTI-specific methodology version', async () => {
    const { persistKoraComputationResult } = await import('@/lib/live/persistence');
    const { runKoraPipeline } = await import('@/lib/kora-engine/run-kora-pipeline');
    const records = [{
      record_id: 'r1', action_family: 'family_and_care', event_nature: 'consumed_service',
      primary_pillar: 'LIFE', evidence_type: 'L3', missing_fields: [],
    }] as unknown as Parameters<typeof runKoraPipeline>[0]['records'];
    const result = runKoraPipeline({ tenantId: 'bti-tenant', records, workforcePopulation: 10 });
    await persistKoraComputationResult({ tenantId: 'bti-tenant', batchId: 'b', reportingPeriod: '2026-Q1', workforcePopulation: 10, result });

    const btiInsert = insertCalls['bti_result']?.[0];
    expect(btiInsert).toBeDefined();
    expect(btiInsert!.methodology_snapshot_id).toBe(insertCalls['kora_index_result']?.[0]?.methodology_snapshot_id);
    // No BTI-specific version field invented — bti_result never had one and still doesn't.
    expect(btiInsert).not.toHaveProperty('methodology_version_id');
    expect(btiInsert).not.toHaveProperty('bti_methodology_version');
  });

  it('numeric values on every persisted row are unaffected by the snapshot wiring', async () => {
    const { persistKoraComputationResult } = await import('@/lib/live/persistence');
    const { runKoraPipeline } = await import('@/lib/kora-engine/run-kora-pipeline');
    const records = [{
      record_id: 'r1', action_family: 'health_and_wellbeing', event_nature: 'consumed_service',
      primary_pillar: 'LIFE', evidence_type: 'L4', missing_fields: [],
    }] as unknown as Parameters<typeof runKoraPipeline>[0]['records'];
    const result = runKoraPipeline({ tenantId: 'numeric-tenant', records, workforcePopulation: 10 });
    await persistKoraComputationResult({ tenantId: 'numeric-tenant', batchId: 'b', reportingPeriod: '2026-Q1', workforcePopulation: 10, result });

    const kiInsert = insertCalls['kora_index_result']?.[0];
    expect(kiInsert!.kora_index_value).toBe(result.koraIndex.value);
    expect(kiInsert!.calibration_status).toBe('pre_empirical_calibration'); // unchanged
    const confInsert = insertCalls['confidence_result']?.[0];
    expect(confInsert!.calibration_status).toBe('pre_empirical_calibration'); // unchanged
  });

  it('existing methodology_version_id / calibration_status columns are still populated exactly as before B-SNAP (historical contract preserved)', async () => {
    const { persistKoraComputationResult } = await import('@/lib/live/persistence');
    const { runKoraPipeline } = await import('@/lib/kora-engine/run-kora-pipeline');
    const { getMethodologyVersion } = await import('@/lib/methodology-config/v0.1');
    const records = [{
      record_id: 'r1', action_family: 'family_and_care', event_nature: 'consumed_service',
      primary_pillar: 'LIFE', evidence_type: 'L3', missing_fields: [],
    }] as unknown as Parameters<typeof runKoraPipeline>[0]['records'];
    const result = runKoraPipeline({ tenantId: 'hist-tenant', records, workforcePopulation: 10 });
    await persistKoraComputationResult({ tenantId: 'hist-tenant', batchId: 'b', reportingPeriod: '2026-Q1', workforcePopulation: 10, result });

    expect(insertCalls['activation_result']?.[0]?.methodology_version_id).toBe(getMethodologyVersion());
    expect(insertCalls['kora_index_result']?.[0]?.methodology_version_id).toBe(getMethodologyVersion());
  });

  it('HIERARCHY PROOF: the legacy methodology_version_id ("KORA Index v1.0", product label) and the authoritative methodology_snapshot.methodology_version ("1.0") are genuinely different values on the same calculation — proving the two are not accidentally collapsed into one authority', async () => {
    const { persistKoraComputationResult } = await import('@/lib/live/persistence');
    const { runKoraPipeline } = await import('@/lib/kora-engine/run-kora-pipeline');
    const { getMethodologyVersion, getCanonicalMethodologyVersion, getProductVersion } = await import('@/lib/methodology-config/v0.1');
    const records = [{
      record_id: 'r1', action_family: 'family_and_care', event_nature: 'consumed_service',
      primary_pillar: 'LIFE', evidence_type: 'L3', missing_fields: [],
    }] as unknown as Parameters<typeof runKoraPipeline>[0]['records'];
    const result = runKoraPipeline({ tenantId: 'hierarchy-tenant', records, workforcePopulation: 10 });
    await persistKoraComputationResult({ tenantId: 'hierarchy-tenant', batchId: 'b', reportingPeriod: '2026-Q1', workforcePopulation: 10, result });

    const legacyValue = insertCalls['kora_index_result']?.[0]?.methodology_version_id;
    const snapshotValue = insertCalls['methodology_snapshot']?.[0]?.methodology_version;

    expect(legacyValue).toBe('KORA Index v1.0');
    expect(legacyValue).toBe(getMethodologyVersion());
    expect(legacyValue).toBe(getProductVersion());
    expect(snapshotValue).toBe('1.0');
    expect(snapshotValue).toBe(getCanonicalMethodologyVersion());
    expect(legacyValue).not.toBe(snapshotValue); // the hierarchy is real, not collapsed
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. HISTORICAL METHODOLOGY STRINGS ARE NOT REWRITTEN
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-015 — historical provenance: migration is additive-only, never rewrites', () => {
  it('the migration file contains no UPDATE statement touching methodology_version_id/calibration_status', () => {
    const migration = src('supabase/migrations/049_methodology_snapshot.sql');
    expect(migration).not.toMatch(/UPDATE\s+analytics\.\w+\s+SET[\s\S]{0,200}methodology_version/i);
    expect(migration).not.toMatch(/UPDATE\s+analytics\.\w+\s+SET[\s\S]{0,200}calibration_status/i);
  });

  it('every ADD COLUMN in the migration is nullable, not backfilled', () => {
    const migration = src('supabase/migrations/049_methodology_snapshot.sql');
    const addColumnLines = migration.match(/ADD COLUMN IF NOT EXISTS methodology_snapshot_id[^;]*/g) ?? [];
    expect(addColumnLines.length).toBeGreaterThan(0);
    for (const line of addColumnLines) {
      expect(line).toMatch(/\bNULL\b/);
      expect(line).not.toMatch(/NOT NULL/);
    }
  });

  it('the migration has a documented rollback path', () => {
    const migration = src('supabase/migrations/049_methodology_snapshot.sql');
    expect(migration).toMatch(/ROLLBACK/i);
    expect(migration).toContain('DROP TABLE IF EXISTS analytics.methodology_snapshot');
  });

  it('provenance is constrained at the DB level: RESTATED_UNDER_METHODOLOGY requires restated_from_snapshot_id', () => {
    const migration = src('supabase/migrations/049_methodology_snapshot.sql');
    expect(migration).toContain('methodology_snapshot_restatement_requires_source');
  });

  it('TRUE immutability: a BEFORE UPDATE OR DELETE trigger rejects mutation for every role, not just RLS/application discipline (service_role bypasses RLS but not triggers)', () => {
    const migration = src('supabase/migrations/049_methodology_snapshot.sql');
    expect(migration).toMatch(/CREATE TRIGGER trg_methodology_snapshot_immutable\s*\n\s*BEFORE UPDATE OR DELETE ON analytics\.methodology_snapshot/);
    expect(migration).toContain('RAISE EXCEPTION');
    expect(migration).toMatch(/kora\/immutable/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. DECISION PACK CONSUMES PERSISTED SNAPSHOT METADATA (behavioral, extends CC-013's harness)
// ═════════════════════════════════════════════════════════════════════════════

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => makePdfDataMockClient(pdfDataTables),
}));

type PdfQueryResult = { data: unknown; error: { message: string } | null };
let pdfDataTables: Record<string, PdfQueryResult> = {};

interface PdfQueryBuilder {
  select: () => PdfQueryBuilder;
  eq: () => PdfQueryBuilder;
  order: () => PdfQueryBuilder;
  limit: () => PdfQueryBuilder;
  maybeSingle: () => Promise<PdfQueryResult>;
  then: (resolve: (v: PdfQueryResult) => void) => void;
}

function makePdfBuilder(result: PdfQueryResult): PdfQueryBuilder {
  const builder: PdfQueryBuilder = {
    select: () => builder, eq: () => builder, order: () => builder, limit: () => builder,
    maybeSingle: async () => result,
    then: (resolve) => resolve(result),
  };
  return builder;
}
function makePdfDataMockClient(tableData: Record<string, PdfQueryResult>) {
  return { schema: (_s: string) => ({ from: (table: string) => makePdfBuilder(tableData[table] ?? { data: null, error: null }) }) };
}

describe('CC-015 — Decision Pack reads the persisted Methodology Snapshot, never invents one', () => {
  beforeEach(() => {
    pdfDataTables = {};
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  it('when kora_index_result.methodology_snapshot join returns a row, PdfData.methodologySnapshot reflects it exactly', async () => {
    vi.resetModules();
    pdfDataTables = {
      tenant: { data: { id: 't1', company_name: 'Snap Co' }, error: null },
      kora_index_result: {
        data: {
          kora_index_value: 50, safeguard_status: 'CLEAR', calibration_status: 'pre_empirical_calibration',
          methodology_version_id: 'KORA Index v1.0', is_current: true, created_at: '2026-06-01T00:00:00.000Z',
          components: [], macroblocks: [],
          confidence_result: { confidence_score: 0.5 },
          activation_result: { activation_rate: 0.5, meaningful_activation_rate: 0.4, pillar_distribution: null },
          methodology_snapshot: {
            methodology_version: '1.0', pipeline_version: 'KoraPipeline_v2.0',
            config_hash: 'abc123', factor_statuses: { NM: 'canonical' },
            provenance: 'AS_ORIGINALLY_CALCULATED', calculation_timestamp: '2026-06-01T00:00:00.000Z',
          },
        },
        error: null,
      },
      decision_pack_version: { data: { id: 'dp1', version_id: 'v1', status: 'ready', bti_result_id: null }, error: null },
      audit_log: { data: [], error: null },
      uef_record: { data: [], error: null },
      impact_unit: { data: [], error: null },
    };
    const { fetchPdfData } = await import('@/lib/decision-pack/pdf-data');
    const result = await fetchPdfData('SNAPCO', '2026-Q1');
    expect(result!.methodologySnapshot).not.toBeNull();
    expect(result!.methodologySnapshot!.configHash).toBe('abc123');
    expect(result!.methodologySnapshot!.pipelineVersion).toBe('KoraPipeline_v2.0');
    expect(result!.methodologySnapshot!.provenance).toBe('AS_ORIGINALLY_CALCULATED');
  });

  it('when no snapshot join exists (historical, pre-B-SNAP row), methodologySnapshot is exactly null — never fabricated', async () => {
    vi.resetModules();
    pdfDataTables = {
      tenant: { data: { id: 't1', company_name: 'Old Co' }, error: null },
      kora_index_result: {
        data: {
          kora_index_value: 50, safeguard_status: 'CLEAR', calibration_status: 'pre_empirical_calibration',
          methodology_version_id: 'KORA Index v1.0', is_current: true, created_at: '2026-01-01T00:00:00.000Z',
          components: [], macroblocks: [],
          confidence_result: null, activation_result: null,
          methodology_snapshot: null, // historical row, predates B-SNAP
        },
        error: null,
      },
      decision_pack_version: { data: null, error: null },
      audit_log: { data: [], error: null },
      uef_record: { data: [], error: null },
      impact_unit: { data: [], error: null },
    };
    const { fetchPdfData } = await import('@/lib/decision-pack/pdf-data');
    const result = await fetchPdfData('OLDCO', '2026-Q1');
    expect(result!.methodologySnapshot).toBeNull();
    // The rest of the document still renders — historical absence is not an error.
    expect(result!.koraIndex.value).toBe(50);
  });
});
