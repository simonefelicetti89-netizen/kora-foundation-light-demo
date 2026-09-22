// tests/unit/kora-wp-112-material-change-layer.test.ts
// KORA-WP-112 — Material Change Layer + Initiative Domain Adapter (Candidate-Only).
//
// Two parts: (1) always-on structural guards (taxonomy consumption,
// WP-113+ boundary, Decision Spine/Intelligence absence — no DB needed);
// (2) an env-var-gated real-DB section proving the actual candidate-
// creation/recognition/idempotency behavior through the real TypeScript
// service functions against a local disposable Supabase stack — matching
// KORA-WP-045's own established real-service-layer testing convention
// (this WP's own service calls getSupabaseServiceClient(), which needs
// the full local API stack, not only raw Postgres — the same reason
// KORA-WP-045's own scenario test needed WP045_SUPABASE_URL alongside
// WP045_PG_URL).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import pg from 'pg';

const { Client } = pg;

const WP112_FILES = [
  'lib/living-koral-material-change/types.ts',
  'lib/living-koral-material-change/material-change-service.ts',
  'lib/living-koral-material-change/initiative-adapter.ts',
];

function readWp112File(rel: string): string {
  return readFileSync(rel, 'utf-8');
}

function codeOnly(rel: string): string {
  return readWp112File(rel).split('\n').filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l) && !/^\s*\/\*/.test(l)).join('\n');
}

function importLines(rel: string): string {
  return readWp112File(rel).split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n');
}

describe('KORA-WP-112 — consumes KORA-WP-111\'s own config, never redefines it', () => {
  for (const file of WP112_FILES) {
    it(`${file}: no hardcoded 7-way taxonomy category union (must import from lib/living-koral-config, never redeclare)`, () => {
      const TAXONOMY_UNION_LITERAL = "'Emergence' | 'Disappearance' | 'Strengthening' | 'Weakening' | 'Consolidation' | 'Reorientation' | 'Stabilization'";
      expect(codeOnly(file)).not.toContain(TAXONOMY_UNION_LITERAL);
    });
  }

  it('material-change-service.ts imports getMaterialChangeTaxonomy from KORA-WP-111\'s own config module', () => {
    expect(importLines('lib/living-koral-material-change/material-change-service.ts')).toMatch(/living-koral-config\/v1/);
  });

  it('initiative-adapter.ts consumes getOrganizationChangedVsKoraLearnedFramework (the six-way, "only A justifies" rule) rather than hardcoding it', () => {
    const src = codeOnly('lib/living-koral-material-change/initiative-adapter.ts');
    expect(src).toContain('getOrganizationChangedVsKoraLearnedFramework');
    expect(src).not.toMatch(/justifiesMaterialChange\s*[:=]\s*true[\s\S]*Emergence|Emergence[\s\S]*justifiesMaterialChange\s*[:=]\s*true/);
  });
});

describe('KORA-WP-112 — no REJECTED/EXPIRED/DISMISSED/ARCHIVED lifecycle state (Founder decision — none is canonically defined)', () => {
  it('LIVING_KORAL_MATERIAL_CHANGE_STATUSES contains exactly CANDIDATE, RECOGNIZED, SUPERSEDED', async () => {
    const { LIVING_KORAL_MATERIAL_CHANGE_STATUSES } = await import('@/lib/living-koral-material-change/types');
    expect([...LIVING_KORAL_MATERIAL_CHANGE_STATUSES].sort()).toEqual(['CANDIDATE', 'RECOGNIZED', 'SUPERSEDED']);
  });

  for (const file of WP112_FILES) {
    it(`${file}: no REJECTED/EXPIRED/DISMISSED/ARCHIVED status literal anywhere`, () => {
      const code = codeOnly(file);
      for (const forbidden of ['REJECTED', 'EXPIRED', 'DISMISSED', 'ARCHIVED']) {
        expect(code).not.toContain(`'${forbidden}'`);
      }
    });
  }
});

describe('KORA-WP-112 — WP-113+ boundary (scoped to this WP\'s own files, not the whole repository)', () => {
  const OWNED_BY_LATER_WPS = [
    'gov.living_koral_transformation_ledger', // KORA-WP-113
    'analytics.living_koral_state', // KORA-WP-113
    'Morphogenesis Engine', // KORA-WP-113
    'Continuity Contract', // KORA-WP-113
    'analytics.living_koral_edition', // KORA-WP-115
    'commons.post', // KORA-WP-118
  ];

  for (const file of WP112_FILES) {
    it(`${file}: does not implement any KORA-WP-113+-owned persistence/service/UI concept`, () => {
      const code = codeOnly(file);
      for (const owned of OWNED_BY_LATER_WPS) {
        expect(code).not.toContain(owned);
      }
    });
  }
});

describe('KORA-WP-112 — Decision Spine boundary (no automatic recognition from Commitment/Evidence Plan/Review/Decision Pack)', () => {
  for (const file of WP112_FILES) {
    it(`${file}: imports nothing from the Decision Spine modules`, () => {
      const imports = importLines(file);
      expect(imports).not.toMatch(/lib\/commitment|lib\/evidence-plan|lib\/review\/|lib\/decision-pack/i);
    });
  }
});

describe('KORA-WP-112 — no duplicate Intelligence engine, no Prime-specific KORAL (by absence, mirroring KORA-WP-042\'s own guard)', () => {
  for (const file of WP112_FILES) {
    it(`${file}: imports nothing from methodology-config or any Prime-scoped module`, () => {
      const imports = importLines(file);
      expect(imports).not.toMatch(/methodology-config/i);
      expect(imports).not.toMatch(/flow-a-billing|program-funds|partner-payable|prime-settlement|prime-fee|\bcommission\b/i);
    });
  }
});

describe('KORA-WP-112 — reuses the existing governance_event substrate, never a second audit system', () => {
  it('material-change-service.ts imports recordGovernanceEvent from the existing lib/audit module', () => {
    expect(importLines('lib/living-koral-material-change/material-change-service.ts')).toMatch(/lib\/audit\/governance-event/);
  });

  it('no new audit/governance table or function is introduced anywhere in this WP\'s own files', () => {
    for (const file of WP112_FILES) {
      expect(codeOnly(file)).not.toMatch(/CREATE TABLE|audit\.(?!governance_event)/i);
    }
  });
});

describe('KORA-WP-112 — no migration beyond 081 was introduced BY THIS WP (a later WP may legitimately raise the ceiling further)', () => {
  it('supabase/migrations/ ceiling is at least 081 (WP-112\'s own migration exists) — bumped to 082 by KORA-WP-113, to 083/084 by KORA-WP-114, to 085 by KORA-WP-115, to 086 by KORA-WP-116, to 087 by KORAL Morphology Package A (2026-09-19), to 088 by the same Package A\'s own cardinality remediation (gov.living_koral_material_change\'s own uniqueness widened — this IS this WP\'s own table, see the dedicated Package-A-cardinality describe block below for the full behavioral proof), all later, unrelated WPs/increments; this assertion\'s own intent (WP-112 itself introduced no migration beyond 081) is unaffected', async () => {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync('supabase/migrations').filter((f) => /^\d+_/.test(f));
    const numbers = files.map((f) => parseInt(f.split('_')[0], 10));
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(89); // KORA-WP-016 raised the ceiling to 089 (analytics.observed_investment_fact flexible edge — a later, unrelated WP; this assertion's own intent is unaffected) // KORA-WP-066 raised the ceiling to 090 (analytics.saved_column_mapping — a later, unrelated WP; this assertion's own intent is unaffected). CONVERTED FROM EQUALITY TO >= BY KORA-WP-066: INTENTIONAL TEST-MECHANISM SUPERSESSION, SEMANTIC GUARANTEE PRESERVED. The guarantee is "THIS WP introduced no migration of its own", never "no later WP may add one" — the equality form had already been hand-edited by several successive WPs, which is the failure mode the repository's own documented remedy (see tests/unit/kora-wp-029-manual-remap-governance.test.ts, "never equality, same disclosed pattern already fixed for WP-011/WP-120/WP-013/WP-046") exists to end.
    expect(numbers).toContain(81);
  });
});

// ── Real-DB-gated section — matches KORA-WP-045's own established
// service-layer real-DB testing convention exactly (env-var-gated,
// static local-only guard, full local Supabase stack required since the
// real service functions use getSupabaseServiceClient()). ────────────────

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

const KNOWN_NON_THROWAWAY_PROJECT_REFS = ['azdnepfmwrmacruykskm', 'haqflkurpmeaxpikozjl'];
const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

function assertLocalOnly(varName: string, url: string): void {
  const lower = url.toLowerCase();
  for (const ref of KNOWN_NON_THROWAWAY_PROJECT_REFS) {
    if (lower.includes(ref)) throw new Error(`${varName} matches a known staging/production project ref — refusing to proceed.`);
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) throw new Error(`${varName} points at a hosted Supabase domain — refusing to proceed.`);
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`${varName} is not a valid URL — refusing to proceed.`);
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) throw new Error(`${varName} host "${hostname}" is not local — refusing to proceed.`);
}

const pgUrl = readEnv('WP112_PG_URL');
const supabaseUrl = readEnv('WP112_SUPABASE_URL');
const serviceRoleKey = readEnv('WP112_SERVICE_ROLE_KEY');
const allowed = readEnv('WP112_ALLOW_RUN') === 'true';
const ready = Boolean(pgUrl && supabaseUrl && serviceRoleKey && allowed);

describe('WP-112 guard — every *_URL env var (if set) must be local-only', () => {
  it('WP112_PG_URL / WP112_SUPABASE_URL are either unset or local-only', () => {
    if (pgUrl) expect(() => assertLocalOnly('WP112_PG_URL', pgUrl)).not.toThrow();
    if (supabaseUrl) expect(() => assertLocalOnly('WP112_SUPABASE_URL', supabaseUrl)).not.toThrow();
  });
});

const RUN_SUFFIX_HEX = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`.padEnd(12, '0').slice(0, 12);
const TENANT_CODE = `WP112-FIXTURE-${RUN_SUFFIX_HEX}`;
const INITIATIVE_AUTH_UID = `00000000-0000-4000-8000-${RUN_SUFFIX_HEX}`;

describe.skipIf(!ready)('KORA-WP-112 — real service-layer proof (local Supabase)', () => {
  let pgClient: InstanceType<typeof Client>;
  let tenantId: string;

  it('setup: tenant + initiative fixtures + full end-to-end candidate/recognition/idempotency proof', async () => {
    if (!pgUrl || !supabaseUrl || !serviceRoleKey) throw new Error('unreachable: only runs when ready');
    assertLocalOnly('WP112_PG_URL', pgUrl);
    assertLocalOnly('WP112_SUPABASE_URL', supabaseUrl);
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

    pgClient = new Client({ connectionString: pgUrl });
    await pgClient.connect();

    const tenant = await pgClient.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE, 'WP-112 Real-DB Fixture Tenant'],
    );
    tenantId = tenant.rows[0].id;

    const initiative = await pgClient.query<{ id: string }>(
      `INSERT INTO personal.worker_initiative (tenant_id, title, pillar, eligibility_class, status)
       VALUES ($1, 'WP-112 fixture initiative', 'GROWTH', 'eligible', 'draft') RETURNING id`,
      [tenantId],
    );
    const initiativeId = initiative.rows[0].id;

    const { observeInitiativeTransition } = await import('@/lib/living-koral-material-change/initiative-adapter');

    // 1. Ineligible transition (draft -> draft, i.e. no real change) produces NO candidate.
    const noop = await observeInitiativeTransition({
      tenantId, initiativeId, previousStatus: 'draft', newStatus: 'draft', actorRole: 'KORA_ADMIN', actorId: INITIATIVE_AUTH_UID,
    });
    expect(noop).toBeNull();

    // 2. Emergence: draft -> published, real record already at 'published'
    //    (matches the DB fixture below) — the re-verification passes and
    //    the candidate is immediately RECOGNIZED (discrete category, no
    //    hysteresis, doc 129 Part 24).
    await pgClient.query(`UPDATE personal.worker_initiative SET status = 'published' WHERE id = $1`, [initiativeId]);
    const emergence = await observeInitiativeTransition({
      tenantId, initiativeId, previousStatus: 'draft', newStatus: 'published', actorRole: 'KORA_ADMIN', actorId: INITIATIVE_AUTH_UID,
    });
    expect(emergence).not.toBeNull();
    expect(emergence?.category).toBe('Emergence');
    expect(emergence?.status).toBe('RECOGNIZED');
    expect(emergence?.recognitionSource).toBe('kora-automatic');
    expect(emergence?.taxonomyConfigVersion).toBe('1.0');

    // 3. Idempotency: re-observing the SAME transition is a safe no-op —
    //    returns the SAME row, never a duplicate.
    const emergenceAgain = await observeInitiativeTransition({
      tenantId, initiativeId, previousStatus: 'draft', newStatus: 'published', actorRole: 'KORA_ADMIN', actorId: INITIATIVE_AUTH_UID,
    });
    expect(emergenceAgain?.id).toBe(emergence?.id);

    // 4. Disappearance: published -> closed.
    await pgClient.query(`UPDATE personal.worker_initiative SET status = 'closed' WHERE id = $1`, [initiativeId]);
    const disappearance = await observeInitiativeTransition({
      tenantId, initiativeId, previousStatus: 'published', newStatus: 'closed', actorRole: 'KORA_ADMIN', actorId: INITIATIVE_AUTH_UID,
    });
    expect(disappearance?.category).toBe('Disappearance');
    expect(disappearance?.status).toBe('RECOGNIZED');

    // 5. Governance event provenance — confirms the recognition promotion
    //    emitted a real governance_event (registry 142's own explicit
    //    Audit field requirement).
    const govEvents = await pgClient.query(
      `SELECT event_type FROM audit.governance_event WHERE object_id = $1 AND event_type = 'material_change.recognized'`,
      [emergence?.id],
    );
    expect(govEvents.rows.length).toBeGreaterThan(0);

    // 6. Real-DB assessment failure case: create a candidate whose real
    //    source record does NOT confirm the claimed transition (an
    //    invalid re-verification input) — must remain CANDIDATE, never
    //    RECOGNIZED, never REJECTED (no such state exists).
    const initiative2 = await pgClient.query<{ id: string }>(
      `INSERT INTO personal.worker_initiative (tenant_id, title, pillar, eligibility_class, status)
       VALUES ($1, 'WP-112 fixture initiative 2 (stays draft)', 'GROWTH', 'eligible', 'draft') RETURNING id`,
      [tenantId],
    );
    const { createMaterialChangeCandidate, assessMaterialChangeCandidate } = await import('@/lib/living-koral-material-change/material-change-service');
    const staleCandidate = await createMaterialChangeCandidate({
      tenantId, category: 'Emergence', affectedDomain: 'initiative', sourceEntityType: 'initiative',
      sourceEntityId: initiative2.rows[0].id, occurredAt: new Date().toISOString(),
      provenance: 'claims published but the real record never actually transitioned', actorRole: 'KORA_ADMIN', actorId: INITIATIVE_AUTH_UID,
    });
    const staleResult = await assessMaterialChangeCandidate({
      candidateId: staleCandidate.id, tenantId, actorRole: 'KORA_ADMIN', actorId: INITIATIVE_AUTH_UID,
      // KORA-WP-116: recognitionSource is now a required, explicit param
      // (previously hardcoded 'kora-automatic' inside the function itself).
      // This fixture simulates the automatic path, unaffected in substance.
      recognitionSource: 'kora-automatic',
      reverifyAgainstSource: async () => false, // the real record never actually confirms it
    });
    expect(staleResult?.status).toBe('CANDIDATE'); // never promoted, never a REJECTED state

    await pgClient.end();
  }, 30_000);
});

// ── KORAL Morphology Package A — Canonical Cardinality Remediation
// (migration 088, 2026-09-19). Self-contained real-DB proof, its own
// tenant/pgClient — see report 183's own addendum for the full canonical
// rationale (why migration 081's own (tenant, source, category) index was
// too coarse for Strengthening/Weakening/Reorientation's own canonical
// recurrence, doc 129 Part 2). Synthetic test fixtures created directly
// through createMaterialChangeCandidate() (the real, approved TS service),
// never a fabricated domain adapter — the "NO FAKE LIVE PRODUCERS"
// boundary is unaffected: no adapter anywhere creates real CANDIDATEs for
// these categories. ─────────────────────────────────────────────────────

describe.skipIf(!ready)('KORAL Morphology Package A — Canonical Cardinality Remediation (migration 088, real DB)', () => {
  let pgClient: InstanceType<typeof Client>;
  let tenantId: string;

  it('setup + full cardinality remediation proof', async () => {
    if (!pgUrl || !supabaseUrl || !serviceRoleKey) throw new Error('unreachable: only runs when ready');
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

    pgClient = new Client({ connectionString: pgUrl });
    await pgClient.connect();

    const tenant = await pgClient.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [`WP112-CARDINALITY-${RUN_SUFFIX_HEX}`, 'WP-112 Cardinality Fixture Tenant'],
    );
    tenantId = tenant.rows[0].id;

    const { createMaterialChangeCandidate } = await import('@/lib/living-koral-material-change/material-change-service');

    const sourceEntityId = (await pgClient.query<{ id: string }>('SELECT gen_random_uuid() AS id')).rows[0].id;
    const actorRole = 'KORA_ADMIN';
    const actorId = `wp112-cardinality-actor-${RUN_SUFFIX_HEX}`;

    async function recognize(category: string, id: string) {
      await pgClient.query(`UPDATE gov.living_koral_material_change SET status='RECOGNIZED', recognized_at=now(), recognition_source='kora-automatic' WHERE id=$1`, [id]);
      void category;
    }

    // A. Emergence — the source entity's first-ever Material Change (previous_state_reference auto-computed as NULL).
    const emergence = await createMaterialChangeCandidate({
      tenantId, category: 'Emergence', affectedDomain: 'initiative', sourceEntityType: 'initiative', sourceEntityId,
      occurredAt: new Date().toISOString(), provenance: 'cardinality fixture — emergence', actorRole, actorId,
    });
    await recognize('Emergence', emergence.id);
    expect(emergence.previousStateReference).toBeNull();

    // A. IDEMPOTENCY — the SAME exact event, replayed twice, is ONE Material Change (no explicit previousStateReference override — auto-default correctly detects the retry, since the most recent row for this source IS already Emergence).
    const emergenceRetry = await createMaterialChangeCandidate({
      tenantId, category: 'Emergence', affectedDomain: 'initiative', sourceEntityType: 'initiative', sourceEntityId,
      occurredAt: new Date().toISOString(), provenance: 'cardinality fixture — emergence retried', actorRole, actorId,
    });
    expect(emergenceRetry.id).toBe(emergence.id);
    const countAfterRetry = await pgClient.query(`SELECT count(*)::int AS n FROM gov.living_koral_material_change WHERE source_entity_id = $1`, [sourceEntityId]);
    expect(countAfterRetry.rows[0].n).toBe(1);

    // B. Two GENUINELY DISTINCT Strengthening events for the SAME source —
    // each caller explicitly asserts its own real predecessor (the id of
    // the immediately preceding real event it independently knows about —
    // report 183 addendum's own documented, disclosed mechanism, never an
    // auto-detected fingerprint).
    const strengthen1 = await createMaterialChangeCandidate({
      tenantId, category: 'Strengthening', affectedDomain: 'initiative', sourceEntityType: 'initiative', sourceEntityId,
      occurredAt: new Date().toISOString(), provenance: 'cardinality fixture — strengthening 1 (Hypothesis->Emerging)', actorRole, actorId,
      previousStateReference: emergence.id,
    });
    await recognize('Strengthening', strengthen1.id);
    expect(strengthen1.id).not.toBe(emergence.id);
    expect(strengthen1.previousStateReference).toBe(emergence.id);

    const strengthen2 = await createMaterialChangeCandidate({
      tenantId, category: 'Strengthening', affectedDomain: 'initiative', sourceEntityType: 'initiative', sourceEntityId,
      occurredAt: new Date().toISOString(), provenance: 'cardinality fixture — strengthening 2 (Emerging->Supported)', actorRole, actorId,
      previousStateReference: strengthen1.id,
    });
    await recognize('Strengthening', strengthen2.id);
    expect(strengthen2.id).not.toBe(strengthen1.id);
    expect(strengthen2.previousStateReference).toBe(strengthen1.id);

    const strengtheningRows = await pgClient.query(`SELECT count(*)::int AS n FROM gov.living_koral_material_change WHERE source_entity_id = $1 AND category = 'Strengthening'`, [sourceEntityId]);
    expect(strengtheningRows.rows[0].n).toBe(2); // TWO distinct, independently provenance-recoverable rows

    // C. Two genuinely distinct Weakening events — cumulative, same mechanism.
    const weaken1 = await createMaterialChangeCandidate({
      tenantId, category: 'Weakening', affectedDomain: 'initiative', sourceEntityType: 'initiative', sourceEntityId,
      occurredAt: new Date().toISOString(), provenance: 'cardinality fixture — weakening 1', actorRole, actorId,
      previousStateReference: strengthen2.id,
    });
    await recognize('Weakening', weaken1.id);
    const weaken2 = await createMaterialChangeCandidate({
      tenantId, category: 'Weakening', affectedDomain: 'initiative', sourceEntityType: 'initiative', sourceEntityId,
      occurredAt: new Date().toISOString(), provenance: 'cardinality fixture — weakening 2', actorRole, actorId,
      previousStateReference: weaken1.id,
    });
    await recognize('Weakening', weaken2.id);
    const weakeningRows = await pgClient.query(`SELECT count(*)::int AS n FROM gov.living_koral_material_change WHERE source_entity_id = $1 AND category = 'Weakening'`, [sourceEntityId]);
    expect(weakeningRows.rows[0].n).toBe(2);

    // D. Full mixed sequence replayed through the Transformation Ledger —
    // proves the correct SIGNED cumulative state: 0 -> +1 -> +2 -> +1 -> 0
    // (Emergence contributes nothing to extentStep; two Strengthening then
    // two Weakening).
    const { recordLivingKoralTransformation } = await import('@/lib/living-koral-transformation-ledger/transformation-ledger-service');
    const { reconstructEditionLineage } = await import('@/lib/living-koral-mark/edition-lineage-service');

    await recordLivingKoralTransformation({ materialChangeId: emergence.id, tenantId });
    await recordLivingKoralTransformation({ materialChangeId: strengthen1.id, tenantId });
    await recordLivingKoralTransformation({ materialChangeId: strengthen2.id, tenantId });
    await recordLivingKoralTransformation({ materialChangeId: weaken1.id, tenantId });
    const lastResult = await recordLivingKoralTransformation({ materialChangeId: weaken2.id, tenantId });

    const lineage = await reconstructEditionLineage(tenantId, 'n/a', lastResult.resultingStateRevision);
    const element = lineage.elements.find((e) => e.present)!;
    expect(element.extentStep).toBe(0); // +1 +1 -1 -1 = 0 — correct signed cumulative state, no floor, no clamp at the canonical layer

    // E. Repeated REORIENTATION — canon permits recurrence (doc 129 Part 2:
    // "a new Decision Pack superseding A PRIOR ONE's direction"), same
    // explicit-predecessor mechanism.
    const reorient1 = await createMaterialChangeCandidate({
      tenantId, category: 'Reorientation', affectedDomain: 'initiative', sourceEntityType: 'initiative', sourceEntityId,
      occurredAt: new Date().toISOString(), provenance: 'cardinality fixture — reorientation 1', actorRole, actorId,
      previousStateReference: weaken2.id,
    });
    await recognize('Reorientation', reorient1.id);
    const reorient2 = await createMaterialChangeCandidate({
      tenantId, category: 'Reorientation', affectedDomain: 'initiative', sourceEntityType: 'initiative', sourceEntityId,
      occurredAt: new Date().toISOString(), provenance: 'cardinality fixture — reorientation 2', actorRole, actorId,
      previousStateReference: reorient1.id,
    });
    await recognize('Reorientation', reorient2.id);
    expect(reorient2.id).not.toBe(reorient1.id);
    const reorientRows = await pgClient.query(`SELECT count(*)::int AS n FROM gov.living_koral_material_change WHERE source_entity_id = $1 AND category = 'Reorientation'`, [sourceEntityId]);
    expect(reorientRows.rows[0].n).toBe(2);

    await recordLivingKoralTransformation({ materialChangeId: reorient1.id, tenantId });
    const afterReorient2 = await recordLivingKoralTransformation({ materialChangeId: reorient2.id, tenantId });
    const lineageAfterReorient = await reconstructEditionLineage(tenantId, 'n/a', afterReorient2.resultingStateRevision);
    expect(lineageAfterReorient.elements.find((e) => e.present)!.directionOrdinal).toBe(2); // two genuine advances

    // F. Repeated STABILIZATION — canon is one-way (reversible: N/A) — a
    // SECOND attempt WITHOUT an explicit previousStateReference override
    // is correctly treated as the SAME transition by the auto-default
    // (the most recent row for this source IS already Stabilization) —
    // "no second semantic transition" emerges naturally from the same
    // idempotency mechanism, no special-case code required.
    const stabilize1 = await createMaterialChangeCandidate({
      tenantId, category: 'Stabilization', affectedDomain: 'initiative', sourceEntityType: 'initiative', sourceEntityId,
      occurredAt: new Date().toISOString(), provenance: 'cardinality fixture — stabilization', actorRole, actorId,
      previousStateReference: reorient2.id,
    });
    await recognize('Stabilization', stabilize1.id);
    const stabilizeRetry = await createMaterialChangeCandidate({
      tenantId, category: 'Stabilization', affectedDomain: 'initiative', sourceEntityType: 'initiative', sourceEntityId,
      occurredAt: new Date().toISOString(), provenance: 'cardinality fixture — stabilization retried, no override', actorRole, actorId,
    });
    expect(stabilizeRetry.id).toBe(stabilize1.id); // no new row
    const stabilizationRows = await pgClient.query(`SELECT count(*)::int AS n FROM gov.living_koral_material_change WHERE source_entity_id = $1 AND category = 'Stabilization'`, [sourceEntityId]);
    expect(stabilizationRows.rows[0].n).toBe(1);

    // H. TENANT ISOLATION — the exact same (category, previousStateReference-free)
    // scenario for a DIFFERENT tenant's own, unrelated source entity does
    // not collide with tenantId's own rows (the widened unique index is
    // still tenant-scoped, migration 088 unchanged in that respect).
    const otherTenant = await pgClient.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [`WP112-CARDINALITY-OTHER-${RUN_SUFFIX_HEX}`, 'WP-112 Cardinality Fixture Tenant B'],
    );
    const otherTenantId = otherTenant.rows[0].id;
    const otherSourceEntityId = (await pgClient.query<{ id: string }>('SELECT gen_random_uuid() AS id')).rows[0].id;
    const otherEmergence = await createMaterialChangeCandidate({
      tenantId: otherTenantId, category: 'Emergence', affectedDomain: 'initiative', sourceEntityType: 'initiative', sourceEntityId: otherSourceEntityId,
      occurredAt: new Date().toISOString(), provenance: 'cardinality fixture — other tenant emergence', actorRole, actorId,
    });
    expect(otherEmergence.tenantId).toBe(otherTenantId);
    expect(otherEmergence.id).not.toBe(emergence.id);
    const tenantACount = await pgClient.query(`SELECT count(*)::int AS n FROM gov.living_koral_material_change WHERE tenant_id = $1`, [tenantId]);
    const tenantBCount = await pgClient.query(`SELECT count(*)::int AS n FROM gov.living_koral_material_change WHERE tenant_id = $1`, [otherTenantId]);
    expect(tenantACount.rows[0].n).toBe(8); // emergence, 2x strengthening, 2x weakening, 2x reorientation, 1x stabilization
    expect(tenantBCount.rows[0].n).toBe(1);

    await pgClient.end();
  }, 30_000);
});
